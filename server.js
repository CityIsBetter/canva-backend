const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const port = 3001;

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
const cors = require('cors');
app.use(cors({
  origin: ['https://your-frontend-domain.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['https://your-frontend-domain.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// Basic root route for Vercel deployment
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend server is running' });
});

// Canvas state management
const canvasState = {
  lines: [],
  lastUpdated: null,
};

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current canvas state to the user
  socket.emit('canvas-state', canvasState.lines);

  socket.on('drawing', (data) => {
    try {
      // Broadcast to all clients except sender
      socket.broadcast.emit('draw-data', data);
      // Update canvas state
      canvasState.lines.push(data);
      canvasState.lastUpdated = new Date();
    } catch (error) {
      console.error('Error processing drawing:', error);
    }
  });

  socket.on('clear-canvas', () => {
    try {
      canvasState.lines = [];
      canvasState.lastUpdated = new Date();
      io.emit('canvas-cleared');
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// For Vercel serverless functions
module.exports = server;

// Only listen if not in serverless environment
if (process.env.NODE_ENV !== 'vercel') {
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}