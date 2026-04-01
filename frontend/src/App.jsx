import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Profile from './pages/Profile/Profile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('home');

  // Initialize current view from URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/profile') {
      setCurrentView('profile');
    } else {
      setCurrentView('home');
    }
  }, []);

  // Update URL when view changes
  const updateView = (view) => {
    setCurrentView(view);
    if (view === 'profile') {
      window.history.pushState({}, '', '/profile');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/profile') {
        setCurrentView('profile');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Simple routing for authenticated users
  const renderView = () => {
    switch(currentView) {
      case 'profile':
        return <Profile onBackToHome={() => updateView('home')} />;
      default:
        return <Home onProfileClick={() => updateView('profile')} />;
    }
  };

  return (
    <div>
      {renderView()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </AuthProvider>
  );
}

export default App;
