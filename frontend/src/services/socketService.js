// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.userId = null;
    this.userRole = null;
    this.listeners = {};
    this.connected = false;
  }

  connect(token, userId, userRole) {
    // 🔴 ЗАЩИТА: Не создаём новое соединение если уже подключены
    if (this.socket?.connected) {
      console.log('⚠️ Socket already connected, skipping');
      if (userId && this.userId !== userId) {
        this.userId = userId;
        this.userRole = userRole;
        this.socket.emit('authenticate', { userId, role: userRole });
      }
      return this.socket;
    }
    
    // Если есть старое соединение — отключаем
    if (this.socket) {
      console.log('🔌 Disconnecting old socket');
      this.socket.disconnect();
    }
    
    this.token = token;
    this.userId = userId;
    this.userRole = userRole;
    
    console.log('🔌 Connecting to socket with token:', token ? 'YES' : 'NO', 'role:', userRole);
    
    this.socket = io('http://localhost:5000', {
      auth: { 
        token,
        role: userRole
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connected = true;
      
      if (this.userId) {
        this.socket.emit('authenticate', { 
          userId: this.userId,
          role: this.userRole
        });
        console.log('🔑 Authenticated as:', this.userId, 'role:', this.userRole);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connected = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.connected = false;
    });

    return this.socket;
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn(`⚠️ Socket not initialized, can't listen to ${event}`);
      return () => {};
    }
    
    console.log(`👂 Listening to event: ${event}`);
    
    const handler = (data) => {
      console.log(`📥 Received event: ${event}`, data);
      callback(data);
    };
    
    this.socket.on(event, handler);
    
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push({ callback, handler });
    
    // Возвращаем функцию для отписки
    return () => this.off(event, callback);
  }

  off(event, callback) {
  if (!this.socket) return;
  
  if (callback && this.listeners[event]) {
    // Находим запись с этим колбэком
    const entry = this.listeners[event].find(e => e.callback === callback);
    if (entry) {
      this.socket.off(event, entry.handler);
      // Удаляем из списка
      this.listeners[event] = this.listeners[event].filter(e => e.callback !== callback);
      if (this.listeners[event].length === 0) {
        delete this.listeners[event];
      }
    }
  } else if (!callback) {
    // Если колбэк не указан — отписываемся от всех обработчиков события
    this.socket.off(event);
    delete this.listeners[event];
  }
}

  joinThread(threadId) {
    if (!this.socket?.connected) {
      console.log(`⏳ Socket not connected yet, waiting to join thread ${threadId}`);
      const onConnect = () => {
        console.log(`✅ Socket connected, now joining thread ${threadId}`);
        this.socket.emit('join-thread', { threadId });
        this.socket.off('connect', onConnect);
      };
      this.socket?.on('connect', onConnect);
      return;
    }
    
    this.socket.emit('join-thread', { threadId });
    console.log(`📡 Joined thread: ${threadId}`);
  }

  cleanup() {
    console.log('🧹 Cleaning up ALL socket listeners');
    if (this.socket) {
      Object.keys(this.listeners).forEach(event => {
        this.socket.off(event);
      });
      this.listeners = {};
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting socket completely');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners = {};
    }
  }

  getSocket() {
    return this.socket;
  }
  
  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;