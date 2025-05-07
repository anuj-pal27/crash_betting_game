const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    playerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    amountUSD:{
        type: Number,
        required: true,
    },
    amountCrypto:{
        type: Number,
        required: true,
    },
    transactionType:{
        type: String,
        enum: ['bet', 'cashout'],
        required: true,
    },
    roundNumber:{
        type:Number,
    },
    multiplier:{
        type: Number,
    },
    createdAt:{
        type: Date,
        default: Date.now,
    },
    result:{
        type: String,
        enum: ['win', 'lose'],
    },
    gameRoundId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameRound',
    },
});

module.exports = mongoose.model('Transaction', transactionSchema);