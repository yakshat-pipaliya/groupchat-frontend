import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { loginWithFCM, updateFCMToken } from '../services/apiService';
import { getFCMToken } from '../services/fcmService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Update FCM token after login and periodically
  useEffect(() => {
    const updateToken = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          await updateFCMToken(fcmToken, token);
          console.log('FCM token updated successfully');
        }
      } catch (error) {
        console.error('Failed to update FCM token:', error);
      }
    };

    // Update FCM token on mount if user is logged in
    if (user) {
      updateToken();
    }

    // Set up periodic token refresh (every 24 hours)
    const interval = setInterval(() => {
      if (user) {
        updateToken();
      }
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get FCM token (can be null if Firebase fails)
      const fcmToken = await getFCMToken();
      
      // Always attempt login with or without FCM token
      // Pass null if fcmToken is falsy, backend will handle it
      const tokenToSend = fcmToken || null;
      const response = await loginWithFCM(email, password, tokenToSend);
      
      // Handle the response structure
      const { data } = response;
      if (data && data.user && data.token) {
        // Store auth data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        setUser(data.user);
        
        // Update FCM token immediately after login if we have one
        // This ensures token is saved even if initial login didn't have it
        if (fcmToken) {
          try {
            await updateFCMToken(fcmToken, data.token);
            console.log('FCM token updated successfully after login');
          } catch (fcmError) {
            console.error('Failed to update FCM token after login:', fcmError);
          }
        }
        
        // Show success message
        toast.success(`Welcome back, ${data.user.firstname || data.user.username}!`);
        
        return data;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setError(null);
    toast.info('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
