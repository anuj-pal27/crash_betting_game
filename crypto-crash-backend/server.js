require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./db/config');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const crashService = require('./services/crashService');
const gameRoutes = require('./routes/gameRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
const server = http.createServer(app); // Create an HTTP server from the app
const io = socketIo(server, { cors: { origin: '*' } }); // Initialize WebSocket (Socket.io)

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB()
    .then(() => {
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB connected successfully');
        } else {
            console.error('Failed to connect to MongoDB');
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const PORT = process.env.PORT || 5000;

// Set up game and wallet routes
app.use("/api/game", gameRoutes);
app.use("/api/wallet", walletRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Crypto Crash Game Backend is running");
});

let activeConnections = 0;

// WebSocket handling for real-time updates
io.on('connection', (socket) => {
  console.log('A user connected');
  activeConnections++;
  
  // Only start round interval if database is connected
  if (mongoose.connection.readyState === 1) {
    if (activeConnections === 1) {
      crashService.startRoundInterval();
    }
  } else {
    console.error('Cannot start rounds - database not connected');
  }

  // Notify clients about round start
  socket.emit('roundStart', { message: 'New round started!' });

  // Listen for player cashout requests
  socket.on('cashOutRequest', (data) => {
    console.log(`Player requested cashout: ${data}`);
    // You can call your cashout function here and send updates to the player
    io.emit('cashOutUpdate', { playerId: data.playerId, cryptoPayout: data.cryptoPayout });
  });

  // Listen for disconnect event
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    activeConnections--;
    
    // Stop the round interval if no users are connected
    if (activeConnections === 0) {
      crashService.stopRoundInterval();
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
