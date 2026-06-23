const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', (payload) => {
    socket.to(payload.roomId).emit('offer', { sdp: payload.sdp });
  });

  socket.on('answer', (payload) => {
    socket.to(payload.roomId).emit('answer', { sdp: payload.sdp });
  });

  socket.on('candidate', (payload) => {
    socket.to(payload.roomId).emit('candidate', { candidate: payload.candidate });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[Signaling Server Active] running on http://localhost:${PORT}`);
});
