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

const app = express();
app.use(cors());
app.use(express.json());
connectDB();

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