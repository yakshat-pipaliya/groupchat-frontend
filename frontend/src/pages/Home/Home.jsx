import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import ChatList from '../../components/ChatList/ChatList';
import ChatWindow from '../../components/ChatWindow/ChatWindow';
import CreateChat from '../../components/CreateChat/CreateChat';
import { useChat } from '../../contexts/ChatContext';
import './Home.css';

const Home = ({ onProfileClick }) => {
  const { activeChat, setActiveChat, isCreateModalOpen, setIsCreateModalOpen, searchUsersAndGroups, loading } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Debounced search function
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsersAndGroups(searchQuery);
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, searchUsersAndGroups]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };

  const handleBackToChatList = () => {
    setActiveChat(null);
  };

  return (
    <div className="home">
      {/* Main Chat Area */}
      <div className={`chat-container ${activeChat ? 'show-chat-window' : ''}`}>
        {/* Chat List - Left Panel */}
        <div className="chat-list-panel">
          <Header 
            searchQuery={searchQuery} 
            onSearchChange={handleSearchChange} 
            loading={loading}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onProfileClick={onProfileClick}
          />
          <ChatList onSelectChat={handleSelectChat} searchQuery={searchQuery} />
        </div>
        
        {/* Chat Window - Right Panel */}
        <div className="chat-window-panel">
          <ChatWindow onBackToChatList={handleBackToChatList} />
        </div>
      </div>

      {/* Create Chat Modal */}
      {isCreateModalOpen && (
        <CreateChat onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

export default Home;
