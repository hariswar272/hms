const { Server } = require('socket.io');

let io;
const connectedUsers = new Map(); // userId -> socketId mapping

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join hostel room (for broadcast to all hostel members)
    socket.on('join_hostel', (hostelId) => {
      socket.join(`hostel_${hostelId}`);
      console.log(`Socket ${socket.id} joined hostel_${hostelId}`);
    });

    // Join user-specific room (for targeted notifications)
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`Socket ${socket.id} joined user_${userId}`);
    });

    // Join admin room
    socket.on('join_admin', (adminId) => {
      socket.join(`admin_${adminId}`);
      connectedUsers.set(`admin_${adminId}`, socket.id);
      console.log(`Socket ${socket.id} joined admin_${adminId}`);
    });

    // Join super admin room
    socket.on('join_super_admin', () => {
      socket.join('super_admin');
      console.log(`Socket ${socket.id} joined super_admin`);
    });

    // Handle online status
    socket.on('user_online', (data) => {
      if (data.hostelId) {
        socket.to(`hostel_${data.hostelId}`).emit('user_status', {
          userId: data.userId,
          status: 'online',
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean up connected users
      for (const [key, value] of connectedUsers.entries()) {
        if (value === socket.id) {
          connectedUsers.delete(key);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper to emit to a specific hostel's admin
const emitToHostelAdmin = (adminId, event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to(`admin_${adminId}`).emit(event, data);
  } catch (e) { /* socket not initialized */ }
};

// Helper to emit to a specific user
const emitToUser = (userId, event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to(`user_${userId}`).emit(event, data);
  } catch (e) { /* socket not initialized */ }
};

// Helper to emit to all members of a hostel
const emitToHostel = (hostelId, event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to(`hostel_${hostelId}`).emit(event, data);
  } catch (e) { /* socket not initialized */ }
};

// Helper to emit to super admin
const emitToSuperAdmin = (event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to('super_admin').emit(event, data);
  } catch (e) { /* socket not initialized */ }
};

module.exports = {
  initSocket,
  getIO,
  emitToHostelAdmin,
  emitToUser,
  emitToHostel,
  emitToSuperAdmin,
};
