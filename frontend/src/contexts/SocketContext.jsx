import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState({ private: null, group: null });
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !user) {
      socketService.disconnect();
      setIsConnected(false);
      setSocketId({ private: null, group: null });
      setOnlineUsers(new Set());
      return;
    }

    const { privateSocket, groupSocket } = socketService.connect(token);

    const syncConnectionState = () => {
      setIsConnected(
        socketService.isConnected('private') || socketService.isConnected('group')
      );
      setSocketId({
        private: socketService.getSocketId('private'),
        group: socketService.getSocketId('group'),
      });
    };

    privateSocket?.on('connect', syncConnectionState);
    privateSocket?.on('disconnect', syncConnectionState);
    groupSocket?.on('connect', syncConnectionState);
    groupSocket?.on('disconnect', syncConnectionState);

    syncConnectionState();

    return () => {
      privateSocket?.off('connect', syncConnectionState);
      privateSocket?.off('disconnect', syncConnectionState);
      groupSocket?.off('connect', syncConnectionState);
      groupSocket?.off('disconnect', syncConnectionState);
      socketService.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!isConnected) return;

    const handleUserOnline = (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);

    return () => {
      socketService.removeListener('user_online', 'private');
      socketService.removeListener('user_offline', 'private');
    };
  }, [isConnected]);

  const joinChat = useCallback((chatId, chatType = 'private') => {
    if (!isConnected) return;

    if (chatType === 'group') {
      socketService.joinGroup(chatId);
      return;
    }

    socketService.joinPrivateChat(chatId);
  }, [isConnected]);

  const leaveChat = useCallback((chatId) => {
    if (!isConnected) return;
    socketService.leaveChat(chatId);
  }, [isConnected]);

  const leaveGroup = useCallback((groupId) => {
    if (!isConnected) return;
    socketService.leaveGroup(groupId);
  }, [isConnected]);

  const getMessages = useCallback((otherUserId) => {
    if (!isConnected) return;
    socketService.getMessages(otherUserId);
  }, [isConnected]);

  const getGroupMessages = useCallback((groupId) => {
    if (!isConnected) return;
    socketService.getGroupMessages(groupId);
  }, [isConnected]);

  const sendMessage = useCallback((receiverId, message, imageUrl = '') => {
    if (!isConnected) return false;
    return socketService.sendMessage(receiverId, message, imageUrl);
  }, [isConnected]);

  const sendMessageToUser = useCallback((receiverId, message) => {
    if (!isConnected) return false;
    return socketService.sendMessage(receiverId, message, '');
  }, [isConnected]);

  const sendGroupMessage = useCallback((groupId, message, imageUrl = '') => {
    if (!isConnected) return false;
    return socketService.sendGroupMessage(groupId, message, imageUrl);
  }, [isConnected]);

  const markMessageAsRead = useCallback((otherUserId) => {
    if (!isConnected) return;
    socketService.markAsRead(otherUserId);
  }, [isConnected]);

  const markGroupMessagesAsRead = useCallback((groupId) => {
    if (!isConnected) return;
    socketService.markGroupAsRead(groupId);
  }, [isConnected]);

  const emitTyping = useCallback((chatId, isTyping) => {
    if (!isConnected) return;
    socketService.emitTyping?.(chatId, isTyping);
  }, [isConnected]);

  const joinPrivateChat = useCallback((otherUserId) => {
    if (!isConnected) return;
    socketService.joinPrivateChat(otherUserId);
  }, [isConnected]);

  const onJoinedChat = useCallback((callback) => {
    socketService.onJoinedChat(callback);
  }, []);

  const onAllMessages = useCallback((callback) => {
    socketService.onPrivateMessages(callback);
  }, []);

  const onNewMessage = useCallback((callback) => {
    socketService.onReceiveMessage(callback);
  }, []);

  const onMessageSent = useCallback((callback) => {
    socketService.onMessageSent(callback);
  }, []);

  const onReceiveMessage = useCallback((callback) => {
    socketService.onReceiveMessage(callback);
  }, []);

  const onGroupMessages = useCallback((callback) => {
    socketService.onGroupMessages(callback);
  }, []);

  const onNewGroupMessage = useCallback((callback) => {
    socketService.onReceiveGroupMessage(callback);
  }, []);

  const onJoinedGroup = useCallback((callback) => {
    socketService.onJoinedGroup(callback);
  }, []);

  const onGroupUserJoined = useCallback((callback) => {
    socketService.onGroupUserJoined(callback);
  }, []);

  const onGroupMessagesRead = useCallback((callback) => {
    socketService.onGroupMessagesRead(callback);
  }, []);

  const onTyping = useCallback(() => {}, []);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const deleteForMe = useCallback((otherUserId, messageId) => {
    if (!isConnected) return;
    socketService.deleteForMe(otherUserId, messageId);
  }, [isConnected]);

  const deleteForEveryone = useCallback((receiverId, messageId) => {
    if (!isConnected) return;
    socketService.deleteForEveryone(receiverId, messageId);
  }, [isConnected]);

  const deleteGroupForMe = useCallback((groupId, messageId) => {
    if (!isConnected) return;
    socketService.deleteGroupForMe(groupId, messageId);
  }, [isConnected]);

  const deleteGroupForEveryone = useCallback((groupId, messageId) => {
    if (!isConnected) return;
    socketService.deleteGroupForEveryone(groupId, messageId);
  }, [isConnected]);

  const onMessageDeletedForMe = useCallback((callback) => {
    socketService.onMessageDeletedForMe(callback);
  }, []);

  const onMessageDeletedForEveryone = useCallback((callback) => {
    socketService.onMessageDeletedForEveryone(callback);
  }, []);

  const onGroupMessageDeletedForMe = useCallback((callback) => {
    socketService.onGroupMessageDeletedForMe(callback);
  }, []);

  const onGroupMessageDeletedForEveryone = useCallback((callback) => {
    socketService.onGroupMessageDeletedForEveryone(callback);
  }, []);

  const onMessagesRead = useCallback((callback) => {
    socketService.onMessagesRead(callback);
  }, []);

  const onMarkedAsRead = useCallback((callback) => {
    socketService.onMarkedAsRead(callback);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setSocketId({ private: null, group: null });
    setOnlineUsers(new Set());
  }, []);

  const value = {
    isConnected,
    socketId,
    onlineUsers,
    typingUsers,
    joinChat,
    leaveChat,
    leaveGroup,
    joinPrivateChat,
    getMessages,
    getGroupMessages,
    sendMessage,
    sendMessageToUser,
    sendGroupMessage,
    markMessageAsRead,
    markGroupMessagesAsRead,
    emitTyping,
    deleteForMe,
    deleteForEveryone,
    deleteGroupForMe,
    deleteGroupForEveryone,
    onJoinedChat,
    onAllMessages,
    onNewMessage,
    onMessageSent,
    onReceiveMessage,
    onGroupMessages,
    onNewGroupMessage,
    onJoinedGroup,
    onGroupUserJoined,
    onGroupMessagesRead,
    onTyping,
    onMessageDeletedForMe,
    onMessageDeletedForEveryone,
    onGroupMessageDeletedForMe,
    onGroupMessageDeletedForEveryone,
    onMessagesRead,
    onMarkedAsRead,
    isUserOnline,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
