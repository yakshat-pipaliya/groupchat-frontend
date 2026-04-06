import { io } from 'socket.io-client';

const PRIVATE_SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://43.205.140.113:3000/one-one-chat';
const GROUP_SOCKET_URL =
  import.meta.env.VITE_GROUP_SOCKET_URL || 'http://43.205.140.113:3000/groupchat';

class SocketService {
  constructor() {
    this.privateSocket = null;
    this.groupSocket = null;
    this.privateListeners = new Map();
    this.groupListeners = new Map();
    this.privateEmitWrapped = false;
    this.groupEmitWrapped = false;
  }

  createSocket(url, token) {
    return io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }

  connect(token) {
    if (!this.privateSocket) {
      this.privateSocket = this.createSocket(PRIVATE_SOCKET_URL, token);
      this.setupBaseListeners('private');
    }

    if (!this.groupSocket) {
      this.groupSocket = this.createSocket(GROUP_SOCKET_URL, token);
      this.setupBaseListeners('group');
    }

    return {
      privateSocket: this.privateSocket,
      groupSocket: this.groupSocket,
    };
  }

  disconnect() {
    this.teardownSocket('private');
    this.teardownSocket('group');
  }

  teardownSocket(socketType) {
    const socket = this.getSocket(socketType);
    const listeners = this.getListenersMap(socketType);

    if (!socket) return;

    listeners.forEach((callback, event) => {
      socket.off(event, callback);
    });

    socket.disconnect();

    if (socketType === 'private') {
      this.privateSocket = null;
      this.privateEmitWrapped = false;
    } else {
      this.groupSocket = null;
      this.groupEmitWrapped = false;
    }
  }

  getSocket(socketType = 'private') {
    return socketType === 'group' ? this.groupSocket : this.privateSocket;
  }

  getListenersMap(socketType = 'private') {
    return socketType === 'group' ? this.groupListeners : this.privateListeners;
  }

  setupBaseListeners(socketType) {
    const socket = this.getSocket(socketType);
    const listeners = this.getListenersMap(socketType);
    if (!socket) return;

    socket.on('connect', () => {
      console.log(`${socketType} socket connected:`, socket.id);

      listeners.forEach((callback, event) => {
        socket.off(event, callback);
        socket.on(event, callback);
        console.log(`Re-registered ${socketType} listener for:`, event);
      });
    });

    socket.io.on('reconnect', (attempt) => {
      console.log(`${socketType} socket reconnected after`, attempt, 'attempts');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`${socketType} socket reconnection attempt:`, attempt);
    });

    socket.io.on('reconnect_error', (error) => {
      console.error(`${socketType} socket reconnection error:`, error);
    });

    socket.io.on('reconnect_failed', () => {
      console.error(`${socketType} socket reconnection failed after all attempts`);
    });

    socket.onAny((eventName, ...args) => {
      console.log(`Received ${socketType} event from server:`, eventName, args);
    });

    const emitWrappedFlag = socketType === 'group' ? 'groupEmitWrapped' : 'privateEmitWrapped';
    if (!this[emitWrappedFlag]) {
      const originalEmit = socket.emit.bind(socket);
      socket.emit = (event, ...args) => {
        console.log(`Emitting to ${socketType} server:`, event, args);
        return originalEmit(event, ...args);
      };
      this[emitWrappedFlag] = true;
    }

    socket.on('disconnect', (reason) => {
      console.log(`${socketType} socket disconnected:`, reason);
    });

    socket.on('connect_error', (error) => {
      console.error(`${socketType} socket connection error:`, error.message);
    });

    socket.on('error', (error) => {
      console.error(`${socketType} socket error:`, error);
    });
  }

  registerListener(event, callback, socketType = 'private') {
    const listeners = this.getListenersMap(socketType);
    const socket = this.getSocket(socketType);
    const existingCallback = listeners.get(event);

    if (socket && existingCallback) {
      socket.off(event, existingCallback);
    }

    listeners.set(event, callback);

    if (socket) {
      socket.on(event, callback);
    }
  }

  removeListener(event, socketType = 'private') {
    const listeners = this.getListenersMap(socketType);
    const socket = this.getSocket(socketType);
    if (!socket) return;

    const callback = listeners.get(event);
    if (callback) {
      socket.off(event, callback);
      listeners.delete(event);
    }
  }

  isConnected(socketType = 'private') {
    return this.getSocket(socketType)?.connected || false;
  }

  getSocketId(socketType = 'private') {
    return this.getSocket(socketType)?.id || null;
  }

  joinChat(otherUserId) {
    if (!this.privateSocket?.connected) return;
    this.privateSocket.emit('join_chat', { otherUserId });
  }

  leaveChat(chatId) {
    if (!this.privateSocket?.connected) return;
    this.privateSocket.emit('leave_chat', { chatId });
  }

  joinPrivateChat(otherUserId) {
    if (!this.privateSocket?.connected) {
      console.warn('Private socket not connected, cannot join chat');
      return;
    }
    this.privateSocket.emit('join_chat', { otherUserId });
  }

  getMessages(otherUserId) {
    if (!this.privateSocket?.connected) {
      console.warn('Private socket not connected, cannot get messages');
      return;
    }
    this.privateSocket.emit('get_messages', { otherUserId });
  }

  sendMessage(receiverId, message, imageUrl = '') {
    if (!this.privateSocket?.connected) {
      console.warn('Private socket not connected, cannot send message');
      return false;
    }

    this.privateSocket.emit('send_message', {
      receiverId,
      message,
      imageUrl,
    });

    return true;
  }

  markAsRead(otherUserId) {
    if (!this.privateSocket?.connected) return;
    this.privateSocket.emit('mark_as_read', {
      otherUserId,
      data: { otherUserId },
    });
  }

  deleteForMe(otherUserId, messageId) {
    if (!this.privateSocket?.connected) return;
    this.privateSocket.emit('delete_for_me', { otherUserId, messageId });
  }

  deleteForEveryone(receiverId, messageId) {
    if (!this.privateSocket?.connected) return;
    this.privateSocket.emit('delete_for_everyone', { receiverId, messageId });
  }

  deleteGroupForMe(groupId, messageId) {
    if (!this.groupSocket?.connected) return;
    this.groupSocket.emit('delete_for_me', {
      groupId,
      messageId,
      data: { groupId, messageId },
    });
  }

  deleteGroupForEveryone(groupId, messageId) {
    if (!this.groupSocket?.connected) return;
    this.groupSocket.emit('delete_for_everyone', {
      groupId,
      messageId,
      data: { groupId, messageId },
    });
  }

  joinGroup(groupId) {
    if (!this.groupSocket?.connected) {
      console.warn('Group socket not connected, cannot join group');
      return;
    }

    this.groupSocket.emit('join_group', {
      groupId,
      data: { groupId },
    });
  }

  leaveGroup(groupId) {
    if (!this.groupSocket?.connected) return;
    this.groupSocket.emit('leave_chat', { groupId, data: { groupId } });
  }

  getGroupMessages(groupId) {
    if (!this.groupSocket?.connected) {
      console.warn('Group socket not connected, cannot get group messages');
      return;
    }

    this.groupSocket.emit('get_messages', {
      groupId,
      data: { groupId },
    });
  }

  sendGroupMessage(groupId, message = '', imageUrl = '') {
    if (!this.groupSocket?.connected) {
      console.warn('Group socket not connected, cannot send group message');
      return false;
    }

    this.groupSocket.emit('send_group_message', {
      groupId,
      message,
      imageUrl,
      data: { groupId, message, imageUrl },
    });

    return true;
  }

  markGroupAsRead(groupId) {
    if (!this.groupSocket?.connected) return;

    this.groupSocket.emit('mark_as_read', {
      groupId,
      data: { groupId },
    });
  }

  onJoinedChat(callback) {
    this.registerListener('joined_chat', callback, 'private');
  }

  onPrivateMessages(callback) {
    this.registerListener('all_messages', callback, 'private');
  }

  onMessageSent(callback) {
    this.registerListener('message_sent', callback, 'private');
  }

  onReceiveMessage(callback) {
    this.registerListener('receive_message', callback, 'private');
  }

  onUserOnline(callback) {
    this.registerListener('user_online', callback, 'private');
  }

  onUserOffline(callback) {
    this.registerListener('user_offline', callback, 'private');
  }

  onOnlineUsersList(callback) {
    this.registerListener('online_users_list', callback, 'private');
  }

  onMessagesRead(callback) {
    this.registerListener('messages_read', callback, 'private');
  }

  onMarkedAsRead(callback) {
    this.registerListener('marked_as_read', callback, 'private');
  }

  onMessageDeletedForMe(callback) {
    this.registerListener('message_deleted_for_me', callback, 'private');
  }

  onMessageDeletedForEveryone(callback) {
    this.registerListener('message_deleted_for_everyone', callback, 'private');
  }

  onGroupMessageDeletedForMe(callback) {
    this.registerListener('message_deleted_for_me', callback, 'group');
  }

  onGroupMessageDeletedForEveryone(callback) {
    this.registerListener('message_deleted_for_everyone', callback, 'group');
  }

  onJoinedGroup(callback) {
    this.registerListener('joined_group', callback, 'group');
  }

  onGroupMessages(callback) {
    this.registerListener('all_messages', callback, 'group');
  }

  onReceiveGroupMessage(callback) {
    this.registerListener('receive_group_message', callback, 'group');
  }

  onGroupUserJoined(callback) {
    this.registerListener('user_joined', callback, 'group');
  }

  onGroupMessagesRead(callback) {
    this.registerListener('messages_read', callback, 'group');
  }
}

export const socketService = new SocketService();
export default socketService;
