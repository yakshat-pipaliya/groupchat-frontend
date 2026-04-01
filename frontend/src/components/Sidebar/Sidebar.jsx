import React, { useState, useEffect } from 'react';
import { MessageSquare, Settings, Bell, LogOut, Menu, X } from 'lucide-react';
import { logoutUser } from '../../services/apiService';
import './Sidebar.css';

const Sidebar = ({ onCreateClick, onProfileClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await logoutUser(authToken);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (e) => {
    if (isMobile) {
      closeMobileMenu();
    }
  };

  return (
    <>
      {isMobile && (
        <button 
          className="mobile-menu-toggle" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}
      
      {isMobile && (
        <div 
          className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={closeMobileMenu}
        />
      )}
      
      <div className={`sidebar ${isMobile && isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <span className="logo-text">ChatApp</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onCreateClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </button>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active" onClick={handleNavClick}>
            <MessageSquare size={20} />
            <span>Messages</span>
          </a>
          <a href="#" className="nav-item" onClick={handleNavClick}>
            <Bell size={20} />
            <span>Notifications</span>
            <span className="nav-badge">3</span>
          </a>
          <a href="#" className="nav-item" onClick={handleNavClick}>
            <Settings size={20} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile" onClick={() => { onProfileClick(); closeMobileMenu(); }}>
            <div className="user-avatar">
              <div className="avatar-text">You</div>
              <span className="online-badge" />
            </div>
            <div className="user-info">
              <span className="user-name">You</span>
              <span className="user-status">Online</span>
            </div>
          </div>
          <button className="btn-icon logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
