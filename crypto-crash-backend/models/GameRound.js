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
  cashoutMultiplier: {
    type: Number,
  },
  currency: {
    type: String,
  },
  cashedOut: {
    type: Boolean,
    default: false,
  },
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
  bets: [BetSchema],

  serverSeed: {
    type: String,
  },
  hashedSeed: {
    type: String,
  },
});

module.exports = mongoose.model("GameRound", gameRoundSchema);
