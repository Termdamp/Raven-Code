require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');         // ← new
const { Server } = require('socket.io'); // ← new
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler'); // ← new

const app = express();
const server = http.createServer(app); // ← wrap express in http server

// ⚠️ Socket.io attaches to 'server', not 'app'
// If you attach to 'app' directly, WebSocket upgrades won't work
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, 'null', null],
    // 'null' as string AND null value covers local HTML files
    // When you open a file directly in browser, origin is 'null'
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [process.env.CLIENT_URL, 'null', null],
  credentials: true
}));
app.use(express.json()); // parse JSON request bodies

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));       // ← new
app.use('/api/sessions', require('./routes/sessions')); // ← new
app.use('/api/execute', require('./routes/execute'));   // ← new

// Health check — useful to test if server is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Generic error handler — catches anything you didn't handle above
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong', error: err.message });
});
// Mount socket handler
socketHandler(io);
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});