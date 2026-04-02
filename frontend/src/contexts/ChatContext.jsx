import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getChatMembers, searchUsers } from '../services/apiService';
import { formatTime } from '../data/mockData';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChat, setActiveChatState] = useState(() => {
    // Don't restore active chat from localStorage on mount to prevent auto-opening chat panel
    return null;
  });
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState({ users: [], groups: [] });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    setActiveChatState(null);
    localStorage.removeItem('activeChat');
    setMessages({});
    setSearchResults({ users: [], groups: [] });

    if (!user || !authToken) {
      setChats([]);
      setUsers([]);
    }
  }, [user, authToken]);
  const chatsRef = useRef([]);
  const messagesRef = useRef({});
  const lastReadEmitRef = useRef({});
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}')?._id || null;
    } catch (error) {
      return null;
    }
  })();

  // Socket hooks
  const {
    isConnected,
    getMessages,
    getGroupMessages,
    sendMessage: sendSocketMessage,
    sendGroupMessage,
    onAllMessages,
    onMessageSent,
    onReceiveMessage,
    onGroupMessages,
    onNewGroupMessage,
    joinChat,
    leaveChat,
    leaveGroup,
    joinPrivateChat,
    onJoinedChat,
    onJoinedGroup,
    onGroupUserJoined,
    deleteForMe,
    deleteForEveryone,
    deleteGroupForMe,
    deleteGroupForEveryone,
    onMessageDeletedForMe,
    onMessageDeletedForEveryone,
    onGroupMessageDeletedForMe,
    onGroupMessageDeletedForEveryone,
    onMessagesRead,
    onMarkedAsRead,
    markMessageAsRead: socketMarkAsRead,
    markGroupMessagesAsRead,
    onGroupMessagesRead,
  } = useSocket();

  // Wrapper to set active chat with localStorage persistence
  const setActiveChat = useCallback((chat) => {
    if (chat) {
      setChats(prevChats => {
        const existingChat = prevChats.find(existing => existing.id === chat.id);
        if (existingChat) {
          return prevChats;
        }

        const normalizedChat = {
          id: chat.id,
          type: chat.type,
          name: chat.name,
          participants: chat.participants || [],
          avatar: chat.avatar || chat.userData?.profileImage || null,
          lastMessage: chat.lastMessage || null,
          unread: chat.unread || 0,
          memberCount: chat.memberCount,
          online: chat.online
        };

        return [normalizedChat, ...prevChats];
      });

      if (chat.type === 'private') {
        const sourceUser = chat.userData || {
          _id: chat.participants?.[0],
          username: chat.name,
          profileImage: chat.avatar,
          isOnline: chat.online
        };

        if (sourceUser?._id) {
          setUsers(prevUsers => {
            const exists = prevUsers.some(existingUser => existingUser.id === sourceUser._id);
            if (exists) {
              return prevUsers;
            }

            return [
              {
                id: sourceUser._id,
                name: sourceUser.username || sourceUser.firstname || sourceUser.email || chat.name,
                avatar: sourceUser.profileImage || chat.avatar || null,
                status: sourceUser.isOnline ? 'online' : 'offline',
                lastSeen: null,
                email: sourceUser.email,
                firstname: sourceUser.firstname,
                lastname: sourceUser.lastname
              },
              ...prevUsers
            ];
          });
        }
      }
    }

    setActiveChatState(chat);
    if (chat) {
      localStorage.setItem('activeChat', JSON.stringify(chat));
    } else {
      localStorage.removeItem('activeChat');
    }
  }, []);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setActiveChatState(prevActiveChat => {
      if (!prevActiveChat) return prevActiveChat;

      const latestChat = chats.find(chat => chat.id === prevActiveChat.id);
      return latestChat || prevActiveChat;
    });
  }, [chats]);

  const updateChatLastMessage = useCallback((chatId, updater) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId || !chat.lastMessage) {
        return chat;
      }

      return {
        ...chat,
        lastMessage: updater(chat.lastMessage)
      };
    }));
  }, []);

  const getReadEventOtherUserId = useCallback((payload) => {
    if (!payload) return null;

    return (
      payload.otherUserId ||
      payload.userId ||
      payload.senderId ||
      payload.receiverId ||
      payload.data?.otherUserId ||
      payload.data?.userId ||
      payload.data?.senderId ||
      payload.data?.receiverId ||
      null
    );
  }, []);

  const markOutgoingMessagesAsRead = useCallback((otherUserId, activeChatId = null) => {
    if (!otherUserId) return;

    setMessages(prev => {
      const possibleKeys = Array.from(new Set([
        otherUserId,
        activeChatId,
      ].filter(Boolean)));

      let hasChanges = false;
      const nextState = { ...prev };

      possibleKeys.forEach((key) => {
        if (!prev[key]) return;

        nextState[key] = prev[key].map(msg => {
          const isCurrentUsersMessage =
            msg.sender === 'current' || msg.sender === 'currentUser' || msg.sender === currentUserId;

          if (isCurrentUsersMessage && !msg.isRead) {
            hasChanges = true;
            return { ...msg, isRead: true };
          }

          return msg;
        });
      });

      return hasChanges ? nextState : prev;
    });

    updateChatLastMessage(otherUserId, (lastMessage) => {
      const isCurrentUsersMessage =
        lastMessage.sender === 'current' ||
        lastMessage.sender === 'currentUser' ||
        lastMessage.sender === currentUserId;

      return isCurrentUsersMessage
        ? { ...lastMessage, isRead: true }
        : lastMessage;
    });
  }, [currentUserId, updateChatLastMessage]);

  const getMessageTypeFromFile = useCallback((file) => {
    if (!file?.type) return 'file';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  }, []);

  const getMessageTypeFromUrl = useCallback((url) => {
    if (!url) return 'text';

    const normalizedUrl = url.split('?')[0].toLowerCase();

    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedUrl)) return 'image';
    if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(normalizedUrl)) return 'video';
    if (/\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(normalizedUrl)) return 'audio';
    return 'file';
  }, []);

  // Transform API message to local format
  const transformSocketMessage = useCallback((msg) => {
    const messageType = msg.imageUrl ? getMessageTypeFromUrl(msg.imageUrl) : 'text';
    const senderId = msg.senderId?._id || msg.senderId;
    
    // Ensure imageUrl has proper protocol
    let fullImageUrl = msg.imageUrl || null;
    if (fullImageUrl && !fullImageUrl.startsWith('http')) {
      fullImageUrl = `http://${fullImageUrl}`;
    }
    
    return {
      id: msg._id || `${senderId || 'system'}-${msg.timestamp || msg.createdAt || Date.now()}-${msg.message || msg.imageUrl || 'message'}`,
      text: msg.message || '',
      timestamp: msg.timestamp || msg.createdAt,
      sender: senderId,
      senderData: typeof msg.senderId === 'object' ? msg.senderId : { _id: senderId },
      type: messageType,
      isRead: msg.isRead || false,
      imageUrl: fullImageUrl,
      file: fullImageUrl ? {
        name: fullImageUrl.split('/').pop() || 'attachment',
        type: messageType,
        url: fullImageUrl
      } : null,
    };
  }, [getMessageTypeFromUrl]);

  // Transform API data to chat format
  const transformChatData = useCallback((apiData) => {
    const transformedChats = [];
    
    // Transform one-to-one chats
    if (apiData.oneToOneChats) {
      apiData.oneToOneChats.forEach(user => {
        transformedChats.push({
          id: user._id,
          type: 'private',
          name: user.username || user.firstname || user.email,
          participants: [user._id],
          avatar: user.profileImage,
          lastMessage: null,
          unread: 0,
          online: user.isOnline
        });
      });
    }
    
    // Transform group chats
    if (apiData.groups) {
      apiData.groups.forEach(group => {
        const memberCount = Number.isFinite(group.totalMember)
          ? group.totalMember
          : group.members?.length || 0;

        transformedChats.push({
          id: group._id,
          type: 'group',
          name: group.name,
          participants: group.members?.map(m => m._id) || [],
          avatar: null,
          lastMessage: null,
          unread: 0,
          memberCount,
          createdBy: group.createdBy
        });
      });
    }
    
    return transformedChats;
  }, []);

  // Transform users data
  const transformUsersData = useCallback((apiData) => {
    const transformedUsers = [];
    
    // Add one-to-one chat users
    if (apiData.oneToOneChats) {
      apiData.oneToOneChats.forEach(user => {
        transformedUsers.push({
          id: user._id,
          name: user.username || user.firstname || user.email,
          avatar: user.profileImage,
          status: user.isOnline ? 'online' : 'offline',
          lastSeen: null,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname
        });
      });
    }
    
    // Add group members
    if (apiData.groups) {
      apiData.groups.forEach(group => {
        group.members.forEach(member => {
          if (!transformedUsers.find(u => u.id === member._id)) {
            transformedUsers.push({
              id: member._id,
              name: member.username || member.firstname || member.email,
              avatar: member.profileImage,
              status: member.isOnline ? 'online' : 'offline',
              lastSeen: null,
              email: member.email,
              firstname: member.firstname,
              lastname: member.lastname
            });
          }
        });
      });
    }
    
    return transformedUsers;
  }, []);

  // Load chat members on mount
  useEffect(() => {
    const loadChatMembers = async () => {
      if (!authToken || !user) return;
      
      try {
        setLoading(true);
        const response = await getChatMembers(authToken);
        
        if (response.statusCode === 200 && response.data) {
          const transformedChats = transformChatData(response.data);
          const transformedUsers = transformUsersData(response.data);
          
          setChats(transformedChats);
          setUsers(transformedUsers);
          setActiveChatState(prevActiveChat => {
            if (!prevActiveChat) return prevActiveChat;

            const refreshedActiveChat = transformedChats.find(chat => chat.id === prevActiveChat.id);
            return refreshedActiveChat || prevActiveChat;
          });
        }
      } catch (error) {
        console.error('Failed to load chat members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatMembers();
  }, [authToken, user, transformChatData, transformUsersData]);

  // Listen for joined_chat event (room confirmation from backend)
  useEffect(() => {
    console.log('Setting up joined_chat listener, isConnected:', isConnected);
    
    const handleJoinedChat = (data) => {
      console.log('Received joined_chat event:', data);
      
      // After joining room, fetch messages using the roomId
      if (data.roomId && data.otherUserId) {
        console.log('Joined room, now fetching messages for:', data.otherUserId);
        getMessages(data.otherUserId);
      }
    };

    onJoinedChat(handleJoinedChat);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onJoinedChat, getMessages]);

  // Listen for all_messages event (message history response)
  useEffect(() => {
    console.log('Setting up all_messages listener, isConnected:', isConnected);
    
    const handleAllMessages = (data) => {
      console.log('Received all_messages event:', data);

      if (!data?.otherUserId || !Array.isArray(data.messages)) return;

      const transformedMessages = data.messages.map(transformSocketMessage);

      setMessages(prev => {
        const existingMessages = prev[data.otherUserId] || [];
        const pendingMessages = existingMessages.filter(message =>
          message.pending &&
          !transformedMessages.some(serverMessage =>
            serverMessage.text === message.text &&
            !!serverMessage.imageUrl === !!message.imageUrl
          )
        );

        return {
          ...prev,
          [data.otherUserId]: [...transformedMessages, ...pendingMessages]
        };
      });
    };

    onAllMessages(handleAllMessages);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onAllMessages, transformSocketMessage]);

  useEffect(() => {
    if (!isConnected) return;

    const handleJoinedGroup = (data) => {
      console.log('Received joined_group event:', data);
      if (data?.groupId) {
        getGroupMessages(data.groupId);
      }
    };

    onJoinedGroup(handleJoinedGroup);

    return () => {};
  }, [isConnected, onJoinedGroup, getGroupMessages]);

  // Listen for message_sent confirmation (update temp message)
  useEffect(() => {
    if (!isConnected) return;

    const handleMessageSent = (data) => {
      console.log('Message sent confirmation:', data);
      
      const receiverId = data.receiverId;
      
      // Find and update the pending message
      setMessages(prev => {
        const chatMessages = prev[receiverId] || [];
        const updatedMessages = chatMessages.map(msg => {
          if (msg.pending && msg.text === data.message) {
            return {
              ...msg,
              id: data._id || data.messageId || msg.id,
              pending: false,
              timestamp: data.timestamp || msg.timestamp,
              isRead: msg.isRead || data.isRead || false
            };
          }
          return msg;
        });
        
        return {
          ...prev,
          [receiverId]: updatedMessages
        };
      });
    };

    onMessageSent(handleMessageSent);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onMessageSent]);

  // Listen for receive_message (incoming messages from other users)
  useEffect(() => {
    if (!isConnected) return;

    const handleReceiveMessage = (data) => {
      console.log('Received incoming message:', data);
      
      const senderId = data.senderId;
      
      // Ensure imageUrl has proper protocol
      let fullImageUrl = data.imageUrl || null;
      if (fullImageUrl && !fullImageUrl.startsWith('http')) {
        fullImageUrl = `http://${fullImageUrl}`;
      }
      
      const messageType = fullImageUrl ? getMessageTypeFromUrl(fullImageUrl) : 'text';
      
      const newMessage = {
        id: `msg-${Date.now()}`,
        text: data.message,
        timestamp: data.timestamp,
        sender: senderId,
        senderData: { _id: senderId, email: '', username: '' },
        type: messageType,
        isRead: data.isRead || false,
        imageUrl: fullImageUrl,
        file: fullImageUrl ? {
          name: fullImageUrl.split('/').pop() || 'attachment',
          type: messageType,
          url: fullImageUrl
        } : null,
      };
      
      // Add message to chat
      setMessages(prev => {
        const existingMessages = prev[senderId] || [];
        
        // Avoid duplicates
        if (existingMessages.find(m => m.timestamp === data.timestamp && m.text === data.message)) {
          return prev;
        }
        
        return {
          ...prev,
          [senderId]: [...existingMessages, newMessage]
        };
      });

      // Update last message in chat list
      setChats(prev => prev.map(chat => {
        if (chat.id === senderId) {
          return {
            ...chat,
            lastMessage: {
              text: data.message,
              timestamp: data.timestamp || new Date().toISOString(),
              sender: senderId,
              isRead: false,
              file: !!data.imageUrl
            },
            unread: activeChat?.id === senderId ? 0 : (chat.unread || 0) + 1
          };
        }
        return chat;
      }));

      if (activeChat?.type === 'private' && activeChat.id === senderId) {
        markAsRead(activeChat.id);
      }
    };

    onReceiveMessage(handleReceiveMessage);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onReceiveMessage, activeChat]);

  // Listen for group_messages event (group chat history)
  useEffect(() => {
    if (!isConnected) return;

    const handleGroupMessages = (data) => {
      console.log('Received group all_messages:', data);

      if (!data?.groupId || !Array.isArray(data.messages)) return;

      const transformedMessages = data.messages.map(transformSocketMessage);

      setMessages(prev => {
        const existingMessages = prev[data.groupId] || [];
        const pendingMessages = existingMessages.filter(message =>
          message.pending &&
          !transformedMessages.some(serverMessage =>
            serverMessage.text === message.text &&
            !!serverMessage.imageUrl === !!message.imageUrl
          )
        );

        return {
          ...prev,
          [data.groupId]: [...transformedMessages, ...pendingMessages]
        };
      });
    };

    onGroupMessages(handleGroupMessages);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onGroupMessages, transformSocketMessage]);

  // Listen for new_group_message event (real-time group messages)
  useEffect(() => {
    if (!isConnected) return;

    const handleNewGroupMessage = (data) => {
      console.log('Received receive_group_message:', data);

      const message = transformSocketMessage(data);
      const groupId = data.groupId;
      const isCurrentUsersMessage =
        (data.senderId?._id || data.senderId) === currentUserId;
      
      setMessages(prev => {
        const existingMessages = prev[groupId] || [];

        if (existingMessages.find(m => m.id === message.id)) {
          return prev;
        }

        const pendingIndex = existingMessages.findIndex(m =>
          m.pending &&
          m.sender === 'current' &&
          m.text === message.text &&
          (!!m.imageUrl === !!message.imageUrl)
        );

        if (pendingIndex >= 0) {
          const updatedMessages = [...existingMessages];
          updatedMessages[pendingIndex] = {
            ...message,
            pending: false
          };

          return {
            ...prev,
            [groupId]: updatedMessages
          };
        }

        return {
          ...prev,
          [groupId]: [...existingMessages, message]
        };
      });

      // Update last message in chat list
      setChats(prev => prev.map(chat => {
        if (chat.id === groupId) {
          return {
            ...chat,
            lastMessage: {
              text: data.message,
              timestamp: data.timestamp || new Date().toISOString(),
              sender: data.senderId?._id || data.senderId,
              file: false
            },
            unread: activeChat?.id === groupId || isCurrentUsersMessage
              ? 0
              : (chat.unread || 0) + 1
          };
        }
        return chat;
      }));

      if (activeChat?.type === 'group' && activeChat.id === groupId && !isCurrentUsersMessage) {
        markAsRead(groupId);
      }

      if (!data?._id && activeChat?.type === 'group' && activeChat.id === groupId) {
        getGroupMessages(groupId);
      }
    };

    onNewGroupMessage(handleNewGroupMessage);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onNewGroupMessage, transformSocketMessage, activeChat, currentUserId, getGroupMessages]);

  useEffect(() => {
    if (!isConnected) return;

    const handleGroupUserJoined = (data) => {
      console.log('Group user joined:', data);

      if (!data?.groupId) return;

      const joinedUserId =
        data.userId ||
        data.joinedUserId ||
        data.memberId ||
        data.user?._id ||
        data.member?._id ||
        null;

      const explicitMemberCount = Number.isFinite(data.totalMember)
        ? data.totalMember
        : Number.isFinite(data.memberCount)
          ? data.memberCount
          : null;

      const explicitParticipants = Array.isArray(data.members)
        ? data.members.map(member => member._id || member).filter(Boolean)
        : null;

      setChats(prev => prev.map(chat => {
        if (chat.id !== data.groupId || chat.type !== 'group') {
          return chat;
        }

        const currentParticipants = Array.isArray(chat.participants) ? chat.participants : [];
        const hasJoinedUser = joinedUserId ? currentParticipants.includes(joinedUserId) : false;

        const participants = explicitParticipants
          ? explicitParticipants
          : joinedUserId && joinedUserId !== currentUserId && !hasJoinedUser
            ? [...currentParticipants, joinedUserId]
            : currentParticipants;

        const memberCount = explicitMemberCount ??
          (explicitParticipants
            ? explicitParticipants.length
            : joinedUserId && joinedUserId !== currentUserId && !hasJoinedUser
              ? Math.max(chat.memberCount || 0, participants.length)
              : chat.memberCount);

        return {
          ...chat,
          participants,
          memberCount
        };
      }));

      if (activeChat?.type === 'group' && activeChat.id === data.groupId) {
        getGroupMessages(data.groupId);
      }
    };

    onGroupUserJoined(handleGroupUserJoined);

    return () => {};
  }, [isConnected, onGroupUserJoined, activeChat, getGroupMessages, currentUserId]);

  useEffect(() => {
    if (!isConnected) return;

    const handleGroupMessagesRead = (data) => {
      console.log('Group messages read event:', data);
    };

    onGroupMessagesRead(handleGroupMessagesRead);

    return () => {};
  }, [isConnected, onGroupMessagesRead]);

  // Listen for message_deleted_for_me event
  useEffect(() => {
    if (!isConnected) return;

    const handleMessageDeletedForMe = (data) => {
      console.log('Message deleted for me:', data);
      
      const { messageId, otherUserId } = data;
      
      // Remove message from the chat
      setMessages(prev => ({
        ...prev,
        [otherUserId]: prev[otherUserId]?.filter(m => m.id !== messageId && m._id !== messageId) || []
      }));
    };

    onMessageDeletedForMe(handleMessageDeletedForMe);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onMessageDeletedForMe]);

  useEffect(() => {
    if (!isConnected) return;

    const handleGroupMessageDeletedForMe = (data) => {
      console.log('Group message deleted for me:', data);

      const { messageId, groupId } = data || {};
      if (!messageId || !groupId) return;

      setMessages(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(
          m => m.id !== messageId && m._id !== messageId
        )
      }));
    };

    onGroupMessageDeletedForMe(handleGroupMessageDeletedForMe);

    return () => {};
  }, [isConnected, onGroupMessageDeletedForMe]);

  // Listen for message_deleted_for_everyone event
  useEffect(() => {
    if (!isConnected) return;

    const handleMessageDeletedForEveryone = (data) => {
      console.log('Message deleted for everyone:', data);
      
      const { messageId, otherUserId } = data;
      
      // Remove message from all chats (both sender and receiver sides)
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        // Try to remove from all possible chat keys
        Object.keys(updatedMessages).forEach(chatId => {
          updatedMessages[chatId] = updatedMessages[chatId]?.filter(
            m => m.id !== messageId && m._id !== messageId
          ) || [];
        });
        
        return updatedMessages;
      });
    };

    onMessageDeletedForEveryone(handleMessageDeletedForEveryone);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onMessageDeletedForEveryone]);

  useEffect(() => {
    if (!isConnected) return;

    const handleGroupMessageDeletedForEveryone = (data) => {
      console.log('Group message deleted for everyone:', data);

      const { messageId, groupId } = data || {};
      if (!messageId || !groupId) return;

      setMessages(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(
          m => m.id !== messageId && m._id !== messageId
        )
      }));
    };

    onGroupMessageDeletedForEveryone(handleGroupMessageDeletedForEveryone);

    return () => {};
  }, [isConnected, onGroupMessageDeletedForEveryone]);

  // Listen for marked_as_read event (when receiver reads our messages)
  useEffect(() => {
    if (!isConnected) return;

    const handleMarkedAsRead = (data) => {
      console.log('Messages marked as read by other user:', data);

      const otherUserId =
        getReadEventOtherUserId(data) ||
        (activeChat?.type === 'private' ? activeChat.participants?.[0] || activeChat.id : null);

      if (!otherUserId) return;

      markOutgoingMessagesAsRead(otherUserId, activeChat?.id);
    };

    onMarkedAsRead(handleMarkedAsRead);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onMarkedAsRead, getReadEventOtherUserId, activeChat, markOutgoingMessagesAsRead]);

  // Listen for messages_read event (receiver-side confirmation)
  useEffect(() => {
    if (!isConnected) return;

    const handleMessagesRead = (data) => {
      console.log('Messages read event:', data);

      const otherUserId =
        getReadEventOtherUserId(data) ||
        (activeChat?.type === 'private' ? activeChat.participants?.[0] || activeChat.id : null);

      if (!otherUserId) return;

      markOutgoingMessagesAsRead(otherUserId, activeChat?.id);
    };

    onMessagesRead(handleMessagesRead);

    return () => {
      // Cleanup handled by socket service
    };
  }, [isConnected, onMessagesRead, getReadEventOtherUserId, activeChat, markOutgoingMessagesAsRead]);

  // Fetch messages when active chat changes
  useEffect(() => {
    console.log('ACTIVE CHAT EFFECT TRIGGERED:', { isConnected, activeChat: activeChat?.id, type: activeChat?.type });
    
    if (!isConnected) {
      console.log('SKIPPING: Socket not connected');
      return;
    }
    if (!activeChat) {
      console.log('SKIPPING: No active chat selected');
      return;
    }

    console.log('ACTIVE CHAT SELECTED:', activeChat.id, 'Type:', activeChat.type);

    let otherUserId = null;

    // For private chats: join then immediately fetch messages
    if (activeChat.type === 'private') {
      otherUserId = activeChat.participants[0];
      console.log('CALLING joinPrivateChat and getMessages for:', otherUserId);
      joinPrivateChat(otherUserId);
      getMessages(otherUserId);
    } else if (activeChat.type === 'group') {
      console.log('CALLING join_group and get_messages for group:', activeChat.id);
      joinChat(activeChat.id, activeChat.type);
      getGroupMessages(activeChat.id);
    }

    if (activeChat.type === 'private' && otherUserId) {
      markAsRead(activeChat.id);
    } else if (activeChat.type === 'group') {
      markAsRead(activeChat.id);
    } else {
      setChats(prev => prev.map(chat =>
        chat.id === activeChat.id ? { ...chat, unread: 0 } : chat
      ));
    }

    return () => {
      console.log('LEAVING CHAT:', activeChat.id);
      if (activeChat.type === 'group') {
        leaveGroup(activeChat.id);
      } else {
        leaveChat(activeChat.id);
      }
    };
  }, [activeChat, isConnected, joinPrivateChat, joinChat, leaveChat, leaveGroup, getMessages, getGroupMessages]);

  // Search users and groups
  const searchUsersAndGroups = useCallback(async (query) => {
    if (!authToken || !query.trim()) {
      setSearchResults({ users: [], groups: [] });
      return;
    }

    try {
      setLoading(true);
      const response = await searchUsers(query, authToken);
      
      if (response.statusCode === 200 && response.data) {
        setSearchResults({
          users: response.data.users || [],
          groups: response.data.groups || []
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ users: [], groups: [] });
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const getUser = useCallback((userId) => {
    return users.find(u => u.id === userId);
  }, [users]);

  const getChatMessages = useCallback((chatId) => {
    // For private chats, messages are stored by otherUserId (participant ID)
    // Check both chatId and participant ID as key
    const chat = chats.find(c => c.id === chatId);
    if (chat?.type === 'private' && chat.participants?.[0]) {
      return messages[chat.participants[0]] || messages[chatId] || [];
    }
    return messages[chatId] || [];
  }, [messages, chats]);

  const sendMessage = useCallback(async (chatId, text, file = null) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    let imageUrl = '';
    
    // If file is image, upload it first
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('https://gh802w59-3000.inc1.devtunnels.ms/chatmedia/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });

        console.log('File upload response:', response);
        
        const result = await response.json();
        if (result.statusCode === 200 && result.data?.imageUrl) {
          imageUrl = result.data.imageUrl;
          console.log('File uploaded successfully:', imageUrl);
        }
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }

    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    
    // Ensure imageUrl has proper protocol
    let fullImageUrl = imageUrl;
    if (fullImageUrl && !fullImageUrl.startsWith('http')) {
      fullImageUrl = `http://${fullImageUrl}`;
    }
    
    const tempMessage = {
      id: tempId,
      text: text,
      timestamp: new Date().toISOString(),
      sender: 'current',
      type: file ? getMessageTypeFromFile(file) : 'text',
      file: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        url: fullImageUrl || URL.createObjectURL(file)
      } : null,
      imageUrl: fullImageUrl || null,
      pending: true,
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    // Send via socket using new production-ready method
    if (chat.type === 'private') {
      const receiverId = chat.participants[0];
      sendSocketMessage(receiverId, text, imageUrl);
    } else if (chat.type === 'group') {
      sendGroupMessage(chatId, text, imageUrl);
    }

    // Update last message in chat list
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          lastMessage: {
            text: file ? `Sent ${file.name}` : text,
            timestamp: new Date().toISOString(),
            sender: 'current',
            isRead: false,
            file: !!file
          }
        };
      }
      return c;
    }));
  }, [authToken, chats, getMessageTypeFromFile, sendGroupMessage, sendSocketMessage]);

  const markAsRead = useCallback((chatId) => {
    const chat = chatsRef.current.find(c => c.id === chatId);
    if (!chat) return;

    const otherUserId = chat.type === 'private' ? chat.participants[0] : chatId;
    const now = Date.now();
    const lastEmitAt = lastReadEmitRef.current[otherUserId] || 0;
    const chatMessages = messagesRef.current[otherUserId] || messagesRef.current[chatId] || [];
    const hasUnreadIncomingMessages = chatMessages.some(msg => {
      const isReceivedMessage =
        msg.sender !== 'current' && msg.sender !== 'currentUser' && msg.sender !== currentUserId;

      return isReceivedMessage && !msg.isRead;
    });

    if (chat.type === 'private' && (hasUnreadIncomingMessages || now - lastEmitAt > 1500)) {
      lastReadEmitRef.current[otherUserId] = now;
      socketMarkAsRead(otherUserId);
    } else if (chat.type === 'group' && (hasUnreadIncomingMessages || now - lastEmitAt > 1500)) {
      lastReadEmitRef.current[otherUserId] = now;
      markGroupMessagesAsRead(chatId);
    }

    setChats(prev => prev.map(chatItem => {
      if (chatItem.id !== chatId || chatItem.unread === 0) {
        return chatItem;
      }

      return { ...chatItem, unread: 0 };
    }));

    setMessages(prev => {
      const targetKey = prev[otherUserId] ? otherUserId : chatId;
      const existingMessages = prev[targetKey] || [];
      let hasLocalChanges = false;

      const updatedMessages = existingMessages.map(msg => {
        const isReceivedMessage =
          msg.sender !== 'current' && msg.sender !== 'currentUser' && msg.sender !== currentUserId;

        if (isReceivedMessage && !msg.isRead) {
          hasLocalChanges = true;
          return { ...msg, isRead: true };
        }

        return msg;
      });

      if (!hasLocalChanges) {
        return prev;
      }

      return {
        ...prev,
        [targetKey]: updatedMessages
      };
    });
  }, [socketMarkAsRead, markGroupMessagesAsRead, currentUserId]);

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
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (chat.type === 'group') {
      if (deleteForAll) {
        deleteGroupForEveryone(chatId, messageId);
      } else {
        deleteGroupForMe(chatId, messageId);
      }
    } else {
      const otherUserId = chat.participants[0];

      if (deleteForAll) {
        deleteForEveryone(otherUserId, messageId);
      } else {
        deleteForMe(otherUserId, messageId);
      }
    }

    // Optimistically remove from UI
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => m.id !== messageId && m._id !== messageId)
    }));
  }, [chats, deleteForMe, deleteForEveryone, deleteGroupForMe, deleteGroupForEveryone]);

  const value = {
    chats,
    messages,
    activeChat,
    users,
    searchResults,
    loading,
    isCreateModalOpen,
    isConnected,
    setActiveChat,
    setIsCreateModalOpen,
    getUser,
    getChatMessages,
    sendMessage,
    markAsRead,
    createChat,
    deleteMessage,
    formatTime,
    searchUsersAndGroups,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
