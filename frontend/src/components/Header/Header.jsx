import React, { useState } from 'react';
import { Search } from 'lucide-react';
import './Header.css';

const Header = ({ searchQuery, onSearchChange }) => {
  return (
    <div className="header">
      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="header-search-input"
        />
      </div>
    </div>
  );
};

export default Header;
