import React, { useState } from 'react';
import { X, Users, UserPlus, Search, Check } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import './CreateChat.css';

const CreateChat = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [chatType, setChatType] = useState('private');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { users, createChat, setActiveChat } = useChat();

  const filteredUsers = users.filter(
    u => u.id !== 'current' && 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserToggle = (userId) => {
    if (chatType === 'private') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreate = () => {
    if (selectedUsers.length === 0) return;
    
    const name = chatType === 'private' 
      ? users.find(u => u.id === selectedUsers[0])?.name 
      : groupName || 'New Group';
    
    const chatId = createChat(chatType, name, selectedUsers);
    setActiveChat({ id: chatId, type: chatType, name, participants: selectedUsers });
    onClose();
  };

  const canProceed = chatType === 'private' 
    ? selectedUsers.length === 1 
    : selectedUsers.length >= 2 && groupName.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-chat-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {step === 1 ? 'New Chat' : chatType === 'private' ? 'Select Contact' : 'Create Group'}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="chat-type-selection">
            <button 
              className={`type-card ${chatType === 'private' ? 'selected' : ''}`}
              onClick={() => setChatType('private')}
            >
              <div className="type-icon private">
                <UserPlus size={24} />
              </div>
              <span className="type-label">Private Chat</span>
              <span className="type-desc">One-on-one conversation</span>
              {chatType === 'private' && <Check className="check-icon" size={18} />}
            </button>

            <button 
              className={`type-card ${chatType === 'group' ? 'selected' : ''}`}
              onClick={() => setChatType('group')}
            >
              <div className="type-icon group">
                <Users size={24} />
              </div>
              <span className="type-label">Group Chat</span>
              <span className="type-desc">Chat with multiple people</span>
              {chatType === 'group' && <Check className="check-icon" size={18} />}
            </button>

            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        ) : (
          <div className="user-selection">
            {chatType === 'group' && (
              <div className="group-name-input">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="input"
                />
              </div>
            )}

            <div className="search-users">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="search-input"
              />
            </div>

            <div className="users-list">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`user-status ${user.status}`} />
                  </div>
                  
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-status-text">
                      {user.status === 'online' ? 'Online' : 
                       user.status === 'away' ? 'Away' : 'Offline'}
                    </span>
                  </div>

                  {selectedUsers.includes(user.id) && (
                    <div className="selection-indicator">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="selection-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreate}
                disabled={!canProceed}
              >
                Create {chatType === 'private' ? 'Chat' : 'Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateChat;
