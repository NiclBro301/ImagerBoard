// backend/src/socket.js
const socketIO = require('socket.io');

let io = null;
const onlineUsers = new Map();

const initSocket = (server) => {
  if (io) return io;
  
  io = socketIO(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('authenticate', (userData) => {
      if (userData?.userId) {
        onlineUsers.set(userData.userId, socket.id);
        console.log(`✅ Authenticated: ${userData.userId}`, userData.role ? `(role: ${userData.role})` : '');
        
        // 🔴 ЛИЧНАЯ КОМНАТА ПОЛЬЗОВАТЕЛЯ ДЛЯ УВЕДОМЛЕНИЙ
        socket.join(`user:${userData.userId}`);
        console.log(`👤 ${userData.userId} joined room user:${userData.userId}`);
        
        // 🔴 Админы/модераторы также в общей комнате
        if (userData.role === 'admin' || userData.role === 'moderator') {
          socket.join('admins');
          console.log(`👮 ${userData.userId} joined 'admins' room`);
        }
      }
    });

    socket.on('join-thread', ({ threadId }) => {
      socket.join(`thread:${threadId}`);
      console.log(`📡 Joined thread: ${threadId}`);
    });

    socket.on('disconnect', () => {
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(userId);
          console.log(`❌ Disconnected user: ${userId}`);
          break;
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn('⚠️ Socket.io not initialized!');
    return null;
  }
  return io;
};

module.exports = { initSocket, getIO, onlineUsers };