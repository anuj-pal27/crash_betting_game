require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./db/config');
const cors = require('cors');
// server.js or main file
const crashService = require('./services/crashService');
crashService.startRoundInterval();
const gameRoutes = require('./routes/gameRoutes');
const walletRoutes = require('./routes/walletRoutes');
const gameController = require('./controllers/gameController');

const app = express();
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

app.use("/api/game",gameRoutes);
app.use("/api/wallet",walletRoutes);

app.get("/",(req,res)=>{
    res.send("Crypto Crash Game Backend is running");
})
connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}
);
