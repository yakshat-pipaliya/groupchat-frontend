import React, { useEffect, useRef } from 'react';
import { Users, Phone, Video, MoreVertical, Info } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import Message from '../Message/Message.jsx';
import MessageInput from '../MessageInput/MessageInput.jsx';
import './ChatWindow.css';

const ChatWindow = () => {
  const { activeChat, getChatMessages, getUser, markAsRead, deleteMessage } = useChat();
  const messagesEndRef = useRef(null);
  const messages = activeChat ? getChatMessages(activeChat.id) : [];

  useEffect(() => {
    if (activeChat) {
      markAsRead(activeChat.id);
    }
  }, [activeChat, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAvatarInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOnlineStatus = () => {
    if (activeChat.type === 'group') return `${activeChat.memberCount} members`;
    const user = getUser(activeChat.participants[0]);
    return user?.status === 'online' ? 'Online' : 'Offline';
  };

  const handleDeleteMessage = (messageId, deleteForAll = false) => {
    deleteMessage(activeChat.id, messageId, deleteForAll);
  };

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h3>Select a chat to start messaging</h3>
          <p>Choose from your existing conversations or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} />
            ) : (
              <div className="avatar-placeholder">
                {getAvatarInitials(activeChat.name)}
              </div>
            )}
            {activeChat.type === 'private' && (
              <span className={`header-status-dot ${getUser(activeChat.participants[0])?.status}`} />
            )}
          </div>
          
          <div className="chat-header-details">
            <h3 className="chat-title">{activeChat.name}</h3>
            <span className="chat-status">{getOnlineStatus()}</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button className="btn-icon">
            <Phone size={20} />
          </button>
          <button className="btn-icon">
            <Video size={20} />
          </button>
          <button className="btn-icon">
            <Info size={20} />
          </button>
          <button className="btn-icon">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                isCurrentUser={message.sender === 'current'}
                onDelete={handleDeleteMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput chatId={activeChat.id} />
    </div>
  );
};

export default ChatWindow;
