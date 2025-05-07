const mongoose = require('mongoose');
require('dotenv').config();
const Player = require("./models/Player")
const GameRound = require('./models/GameRound');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('Error connecting to MongoDB:', err));

async function populateSampleData() {
  try {
    // Clear existing data
    await Player.deleteMany();
    await GameRound.deleteMany();

    // Create sample players
    const players = await Player.insertMany([
      { name: 'Player1', wallet: { usd: 500, crypto: 0.05 } },
      { name: 'Player2', wallet: { usd: 300, crypto: 0.03 } },
      { name: 'Player3', wallet: { usd: 700, crypto: 0.07 } },
      { name: 'Player4', wallet: { usd: 1000, crypto: 0.1 } },
      { name: 'Player5', wallet: { usd: 200, crypto: 0.02 } }
    ]);

    // Create sample game rounds
    await GameRound.insertMany([
      { roundNumber: 1, crashMultiplier: 1.5, bets: [], startTime: new Date(), endTime: new Date() },
      { roundNumber: 2, crashMultiplier: 2.0, bets: [], startTime: new Date(), endTime: new Date() },
      { roundNumber: 3, crashMultiplier: 1.8, bets: [], startTime: new Date(), endTime: new Date() }
    ]);

    console.log('Sample data populated successfully.');
    process.exit();

  } catch (err) {
    console.error('Error populating sample data:', err);
    process.exit(1);
  }
}

populateSampleData();
