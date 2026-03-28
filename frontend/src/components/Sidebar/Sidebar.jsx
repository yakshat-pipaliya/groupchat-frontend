import React from 'react';
import { MessageSquare, Settings, Bell, LogOut } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ onCreateClick, onProfileClick }) => {
  return (
    <div className="sidebar">
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
        <a href="#" className="nav-item active">
          <MessageSquare size={20} />
          <span>Messages</span>
        </a>
        <a href="#" className="nav-item">
          <Bell size={20} />
          <span>Notifications</span>
          <span className="nav-badge">3</span>
        </a>
        <a href="#" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile" onClick={onProfileClick}>
          <div className="user-avatar">
            <div className="avatar-text">You</div>
            <span className="online-badge" />
          </div>
          <div className="user-info">
            <span className="user-name">You</span>
            <span className="user-status">Online</span>
          </div>
        </div>
        <button className="btn-icon logout-btn">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
