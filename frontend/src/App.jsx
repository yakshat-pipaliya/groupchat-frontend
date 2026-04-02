import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ChatProvider } from './contexts/ChatContext';
import { MessageSquare } from 'lucide-react';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Profile from './pages/Profile/Profile';
import { ToastContainer } from 'react-toastify';
import { CallProvider } from './contexts/CallContext';
import CallOverlay from './components/CallOverlay/CallOverlay';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin';
    const isAdminPage = window.location.pathname.endsWith('/admin.html');

    if (isAdmin && !isAdminPage) {
      window.location.replace('/admin.html');
    }
  }, [user]);

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
        <div className="loading-orb loading-orb-one"></div>
        <div className="loading-orb loading-orb-two"></div>
        <div className="loading-panel">
          <div className="loading-brand">
            <div className="loading-brand-icon">
              <MessageSquare size={26} />
            </div>
            <div>
              <h1>ChatApp</h1>
              <p>Preparing your conversations</p>
            </div>
          </div>
          <div className="loading-spinner-shell">
            <div className="loading-spinner-ring"></div>
            <div className="loading-spinner-core"></div>
          </div>
          <div className="loading-progress">
            <span></span>
          </div>
          <div className="loading-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === 'admin') {
    return null;
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
      <CallProvider>
        <SocketProvider>
          <ChatProvider>
            <AppContent />
            <CallOverlay />
          </ChatProvider>
        </SocketProvider>
      </CallProvider>
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
