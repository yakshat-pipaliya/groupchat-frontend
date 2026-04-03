import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ChatProvider } from './contexts/ChatContext';
import { MessageSquare } from 'lucide-react';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Profile from './pages/Profile/Profile';
import { ToastContainer, toast } from 'react-toastify';
import { CallProvider } from './contexts/CallContext';
import CallOverlay from './components/CallOverlay/CallOverlay';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { onMessageListener, setupMessageListener } from './services/fcmService';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('home');

  // Listen for foreground FCM messages
  useEffect(() => {
    if (!user) return;

    // Set up the message listener for foreground messages
    const unsubscribe = setupMessageListener((payload) => {
      console.log('[FCM] Message received in foreground:', payload);
      
      // Show notification manually when app is in foreground
      if (Notification.permission === 'granted') {
        const { title, body } = payload.notification || {};
        const data = payload.data || {};
        
        // Create unique tag to prevent duplicates
        const tag = `foreground-${data.senderId || Date.now()}`;
        
        // Check if we should show this notification (don't show for own messages)
        const currentUserId = user._id || user.id;
        if (data.senderId && data.senderId !== currentUserId) {
          new Notification(title || 'New Message', {
            body: body || 'You have a new message',
            icon: '/favicon.svg',
            tag: tag,
            requireInteraction: false,
            data: data
          });
        }
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

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
    switch (currentView) {
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
      <style>
        {`
          /* Always visible menu for sent messages (right side) */
          .message-actions-container {
            right: -8px;
            top: -8px;
            transform: none;
            opacity: 1 !important;
          }

          /* Always visible menu for received messages - INSIDE bubble top-right */
          .message-actions-container.received {
            right: 4px;
            left: auto;
            top: 4px;
            transform: none;
            opacity: 1 !important;
          }

          /* Ensure button is always visible */
          .message-actions-btn {
            opacity: 1 !important;
          }
        `}
      </style>
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
