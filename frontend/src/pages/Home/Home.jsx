import React from 'react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import ChatList from '../../components/ChatList/ChatList';
import ChatWindow from '../../components/ChatWindow/ChatWindow';
import CreateChat from '../../components/CreateChat/CreateChat';
import { useChat } from '../../contexts/ChatContext';
import './Home.css';

const Home = ({ searchQuery, onSearchChange, onProfileClick }) => {
  const { activeChat, setActiveChat, isCreateModalOpen, setIsCreateModalOpen } = useChat();

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };

  return (
    <div className="home">
      <Sidebar 
        onCreateClick={() => setIsCreateModalOpen(true)} 
        onProfileClick={onProfileClick} 
      />
      
      <div className="chat-layout">
        <div className="chat-sidebar">
          <Header searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <ChatList onSelectChat={handleSelectChat} searchQuery={searchQuery} />
        </div>
        
        <div className="chat-main">
          <ChatWindow />
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateChat onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

export default Home;
