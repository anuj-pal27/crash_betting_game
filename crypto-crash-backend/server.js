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
const gameController = require('./controllers/gameController');

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
let currentRound = null;
let roundInterval = null;
const ROUND_DURATION = 10000; // 10 seconds

// WebSocket handling for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');
  activeConnections++;
  
  // Only start round interval if database is connected
  if (mongoose.connection.readyState === 1) {
    if (activeConnections === 1) {
      crashService.startRoundInterval();
    }
  } else {
    console.error('Cannot start rounds - database not connected');
  }

  // Send current game state
  if (currentRound) {
    socket.emit('gameState', {
      roundNumber: currentRound.roundNumber,
      startTime: currentRound.startTime,
      currentMultiplier: getCurrentMultiplier()
    });
  }

  socket.on('placeBet', async (data) => {
    try {
      const { playerId, usdAmount, currency } = data;
      const result = await gameController.placeBet({
        params: { playerId },
        body: { usdAmount, currency }
      });
      
      io.emit('newBet', {
        playerId,
        usdAmount,
        currency,
        roundNumber: currentRound.roundNumber
      });
      
      socket.emit('betResult', result);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('cashOut', async (data) => {
    try {
      const { playerId, multiplier } = data;
      const result = await gameController.cashOut({
        params: { playerId },
        body: { cashoutMultiplier: multiplier }
      });
      
      io.emit('playerCashout', {
        playerId,
        multiplier,
        payout: result.transaction.amountUSD
      });
      
      socket.emit('cashoutResult', result);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Listen for disconnect event
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    activeConnections--;
    
    // Stop the round interval if no users are connected
    if (activeConnections === 0) {
      crashService.stopRoundInterval();
    }
  });
});

// Start the game loop
function startGameLoop() {
  if (roundInterval) {
    clearInterval(roundInterval);
  }
  
  roundInterval = setInterval(async () => {
    await crashService.startNewRound(io);
  }, ROUND_DURATION);
}

startGameLoop();

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
