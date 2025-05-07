const mongoose = require("mongoose");

const BetSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  amountUSD: {
    type: Number,
    required: true,
  },
  amountCrypto: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ['BTC', 'ETH', 'SOL', 'USDT'],
    required: true
  },
  cashoutMultiplier: {
    type: Number,
    default: null
  },
  cashedOut: {
    type: Boolean,
    default: false,
  },
  payout: {
    type: Number,
    default: null
  }
});

const gameRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  crashMultiplier: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'crashed', 'completed'],
    default: 'active'
  },
  bets: [BetSchema],

  serverSeed: {
    type: String,
    required: true
  },
  hashedSeed: {
    type: String,
    required: true
  },
  totalBetsUSD: {
    type: Number,
    default: 0
  },
  totalPayoutUSD: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("GameRound", gameRoundSchema);
