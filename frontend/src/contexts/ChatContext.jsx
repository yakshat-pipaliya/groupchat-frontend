import React, { createContext, useContext, useState, useCallback } from 'react';
import { mockChats, mockMessages, mockUsers, currentUser, formatTime } from '../data/mockData';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState(mockChats);
  const [messages, setMessages] = useState(mockMessages);
  const [activeChat, setActiveChat] = useState(null);
  const [users] = useState([...mockUsers, currentUser]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getUser = useCallback((userId) => {
    return users.find(u => u.id === userId) || currentUser;
  }, [users]);

  const getChatMessages = useCallback((chatId) => {
    return messages[chatId] || [];
  }, [messages]);

  const sendMessage = useCallback((chatId, text, file = null) => {
    const newMessage = {
      id: `m${Date.now()}`,
      text: text,
      timestamp: new Date().toISOString(),
      sender: 'current',
      type: file ? 'file' : 'text',
      file: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      } : null
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage]
    }));

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          lastMessage: {
            text: file ? `Sent ${file.name}` : text,
            timestamp: new Date().toISOString(),
            sender: 'current',
            file: !!file
          }
        };
      }
      return chat;
    }));
  }, []);

  const markAsRead = useCallback((chatId) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unread: 0 } : chat
    ));
  }, []);

  const createChat = useCallback((type, name, participantIds, avatar = '') => {
    const newChat = {
      id: `c${Date.now()}`,
      type,
      name,
      participants: participantIds,
      avatar,
      lastMessage: null,
      unread: 0,
      memberCount: type === 'group' ? participantIds.length + 1 : undefined,
      online: type === 'private' ? getUser(participantIds[0])?.status === 'online' : undefined
    };

    setChats(prev => [newChat, ...prev]);
    setMessages(prev => ({ ...prev, [newChat.id]: [] }));
    return newChat.id;
  }, [getUser]);

  const deleteMessage = useCallback((chatId, messageId, deleteForAll = false) => {
    if (deleteForAll) {
      // In a real app, this would make an API call to delete for all participants
      // For now, we'll just remove it from current user's view
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].filter(m => m.id !== messageId)
      }));
    } else {
      // Delete only for current user
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].filter(m => m.id !== messageId)
      }));
    }
  }, []);

  const value = {
    chats,
    messages,
    activeChat,
    users,
    currentUser,
    isCreateModalOpen,
    setActiveChat,
    setIsCreateModalOpen,
    getUser,
    getChatMessages,
    sendMessage,
    markAsRead,
    createChat,
    deleteMessage,
    formatTime
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
