import axios from 'axios';

// API service for authentication
const API_BASE_URL = 'http://192.168.1.47:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loginWithFCM = async (email, password, fcmToken) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
      fcmToken
    });

    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

export const registerWithFCM = async (userData, fcmToken) => {
  try {
    const response = await api.post('/auth/register', {
      ...userData,
      fcmToken
    });

    return response.data;
  } catch (error) {
    console.error('Registration API error:', error);
    throw error;
  }
};

export const updateFCMToken = async (userId, fcmToken, authToken) => {
  try {
    const response = await api.put(
      '/user/fcm-token',
      { fcmToken },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('FCM token update error:', error);
    throw error;
  }
};

export const getUserProfile = async (userId, authToken) => {
  try {
    const response = await api.get(
      `/user/profile/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
};
