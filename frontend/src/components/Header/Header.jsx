import React from 'react';
import { Search, Plus, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const Header = ({ searchQuery, onSearchChange, loading, onCreateClick, onProfileClick }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="header">
      <div className="header-top">
        <div className="header-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>WhatsApp</span>
        </div>
        <div className="header-actions">
          <button className="header-btn new-chat-btn" onClick={onCreateClick} title="New Chat">
            <Plus size={20} />
          </button>
          <button className="header-btn" onClick={onProfileClick} title="Profile">
            <User size={20} />
          </button>
          <button className="header-btn logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search or start a new chat"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="header-search-input"
          disabled={loading}
        />
        {loading && <div className="search-loading">...</div>}
      </div>
    </div>
  );
};

export default Header;
