import React, { useState } from 'react';
import { Users, X, CheckCheck } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import './ChatList.css';

const ChatList = ({ onSelectChat, searchQuery }) => {
  const { chats, activeChat, getUser, formatTime, searchResults, loading } = useChat();
  const [showNoContacts, setShowNoContacts] = useState(true);
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}')?._id || null;
    } catch (error) {
      return null;
    }
  })();

  const getAvatarInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (chat) => {
    if (chat.type === 'group') return 'group';
    const participant = getUser(chat.participants[0]);
    if (!participant) return 'offline';
    return participant.status === 'online' ? 'online' : 'offline';
  };

  // Display search results when there's a search query, otherwise show all chats
  const displayChats = searchQuery.trim() ? [] : chats;
  
  // Transform search results to chat format for display
  const searchChats = [
    ...searchResults.users.map(user => ({
      id: user._id,
      type: 'private',
      name: user.username || user.firstname || user.email || 'Unknown User',
      participants: [user._id],
      avatar: null,
      lastMessage: null,
      unread: 0,
      online: false,
      isSearchResult: true,
      userData: user
    })),
    ...searchResults.groups.map(group => ({
      id: group._id,
      type: 'group',
      name: group.name,
      participants: [],
      avatar: null,
      lastMessage: null,
      unread: 0,
      memberCount: 0,
      isSearchResult: true,
      groupData: group
    }))
  ];

  const finalChats = searchQuery.trim() ? searchChats : displayChats;

  return (
    <div className="chat-list">
      {/* No Contacts Banner */}
      {showNoContacts && !searchQuery.trim() && (
        <div className="no-contacts-banner">
          <div className="no-contacts-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="no-contacts-content">
            <h3>No Contacts</h3>
            <p>You can import Contacts from Google <a href="#">Learn more</a></p>
          </div>
          <button 
            className="no-contacts-close"
            onClick={() => setShowNoContacts(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search/Header Area */}
      <div className="chat-list-search-area">
        {/* Search is now in Header component */}
      </div>
      
      {loading && searchQuery.trim() && (
        <div className="search-loading-indicator">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      )}
      
      <div className="chat-items">
        {finalChats.length === 0 && searchQuery.trim() && !loading ? (
          <div className="no-results">
            <p>No users or groups found for "{searchQuery}"</p>
          </div>
        ) : (
          finalChats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="chat-avatar-container">
              {chat.avatar ? (
                <img src={chat.avatar} alt={chat.name} className="chat-avatar" />
              ) : (
                <div className="chat-avatar-placeholder">
                  {getAvatarInitials(chat.name)}
                </div>
              )}
              <span className={`status-dot ${getStatusColor(chat)}`} />
            </div>

            <div className="chat-info">
              <div className="chat-row">
                <h3 className="chat-name">{chat.name}</h3>
                {chat.lastMessage && (
                  <span className="chat-time">{formatTime(chat.lastMessage.timestamp)}</span>
                )}
              </div>
              
              <div className="chat-row">
                <p className="chat-preview">
                  {chat.type === 'group' && chat.lastMessage && (
                    <span className="sender-name">
                      {getUser(chat.lastMessage.sender)?.name}: 
                    </span>
                  )}
                  {chat.lastMessage?.file && (
                    <span className="file-indicator">📎 File</span>
                  )}
                  {(chat.lastMessage?.sender === 'current' || chat.lastMessage?.sender === currentUserId) && chat.lastMessage?.isRead && (
                    <span className="read-status">
                      <CheckCheck size={14} />
                    </span>
                  )}
                  {chat.lastMessage?.text || 'No messages yet'}
                </p>
                
                {chat.unread > 0 && (
                  <span className="unread-badge">{chat.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
