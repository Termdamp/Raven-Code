const jwt = require('jsonwebtoken');
const Room = require('../models/Room');

// We keep track of who is in which room
// Structure: { socketId: { userId, username, roomId } }
// This is in-memory — resets if server restarts, which is fine
const connectedUsers = {};

module.exports = (io) => {

  // SOCKET AUTH MIDDLEWARE 
  // This runs before ANY event is processed
  // If token is invalid, connection is rejected entirely
  // Same concept as authMiddleware.js but for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Client sends token like: io(url, { auth: { token } })
    // We'll set this up in Phase 4 (React frontend)

    if (!token) {
      return next(new Error('No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      // Now socket.userId is available in all event handlers below
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.userId}`);

    // JOIN ROOM 
    // Fired when user opens a room page
    // Does 3 things:
    // 1. Joins the Socket.io room (in-memory)
    // 2. Sends current room state to the joiner
    // 3. Tells everyone else someone joined
    socket.on('join-room', async ({ roomId, username }) => {
      try {
        // Join the Socket.io room
        socket.join(roomId);

        // Store this user's info for later (disconnect handling)
        connectedUsers[socket.id] = { userId: socket.userId, username, roomId };

        // Fetch current room state from DB
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Send current code + language ONLY to the person who just joined
        // Everyone else already has the latest state
        socket.emit('room-data', {
          code: room.code,
          language: room.language
        });

        // Get list of everyone currently in this socket room
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const members = socketsInRoom.map(s => ({
          socketId: s.id,
          userId: connectedUsers[s.id]?.userId,
          username: connectedUsers[s.id]?.username
        }));

        // Tell EVERYONE in the room (including joiner) the updated member list
        io.to(roomId).emit('members-update', { members });

        // Tell everyone EXCEPT the joiner that someone new arrived
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          username
        });

        console.log(`${username} joined room ${roomId}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // CODE CHANGE
    // Fired on every keystroke in the editor
    // Most frequent event — must be fast
    socket.on('code-change', ({ roomId, code }) => {
      // Broadcast to everyone EXCEPT the sender
      // Sender already has the updated code in their own editor
      socket.to(roomId).emit('code-update', { code });

      // ⚠️ Don't save to DB here on every keystroke
      // That would be hundreds of DB writes per minute
      // DB save is handled by a debounced separate event below
    });

    // SAVE CODE TO DB (debounced) 
    // Frontend sends this after 3 seconds of no typing
    // This keeps the DB in sync without hammering it
    socket.on('save-code', async ({ roomId, code }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId },
          { code, updatedAt: Date.now() }
        );
        // No need to broadcast — this is just a DB sync
      } catch (err) {
        console.error('Error saving code:', err.message);
      }
    });

    // LANGUAGE CHANGE
    // When someone changes the language dropdown
    socket.on('language-change', async ({ roomId, language }) => {
      try {
        // Update DB
        await Room.findOneAndUpdate({ roomId }, { language });

        // Broadcast to EVERYONE including sender
        // Everyone's editor needs to switch language for syntax highlighting
        io.to(roomId).emit('language-update', { language });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // CHAT MESSAGE 
    // When someone sends a message in the room chat
    socket.on('chat-message', ({ roomId, message }) => {
      const user = connectedUsers[socket.id];
      if (!user) return;

      // Broadcast to EVERYONE including sender
      // Sender also needs to see their own message appear in chat
      io.to(roomId).emit('new-message', {
        userId: socket.userId,
        username: user.username,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // CURSOR MOVE 
    // Optional but impressive — shows other users' cursor positions
    // Fired as user moves cursor in editor
    socket.on('cursor-move', ({ roomId, position }) => {
      const user = connectedUsers[socket.id];
      if (!user) return;

      // Send to everyone EXCEPT the mover
      socket.to(roomId).emit('cursor-update', {
        userId: socket.userId,
        username: user.username,
        position
        // position = { lineNumber, column } from Monaco editor
      });
    });

    // DISCONNECT
    // ⚠️ Use 'disconnecting' NOT 'disconnect'
    // 'disconnecting' fires BEFORE socket leaves rooms
    // 'disconnect' fires AFTER — socket.rooms is already empty
    // You need the room info to broadcast 'user-left'
    socket.on('disconnecting', async () => {
      const user = connectedUsers[socket.id];
      if (!user) return;

      const { username, roomId } = user;

      // Tell everyone in the room this user left
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        username
      });
      // Small delay to let the socket actually leave
      // Then update the member list for remaining users
      setTimeout(async () => {
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const members = socketsInRoom
          .filter(s => s.id !== socket.id)
          .map(s => ({
            socketId: s.id,
            userId: connectedUsers[s.id]?.userId,
            username: connectedUsers[s.id]?.username
          }));

        io.to(roomId).emit('members-update', { members });
      }, 100);

      // Clean up connectedUsers map
      delete connectedUsers[socket.id];

      console.log(`${username} left room ${roomId}`);
    });

  });
};