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
    currency: {
        type: String,
        enum: ['BTC', 'ETH', 'SOL', 'USDT'],
        required: true
    },
    transactionType:{
        type: String,
        enum: ['bet', 'cashout'],
        required: true,
    },
    roundNumber:{
        type:Number,
        required: true
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
        enum: ['win', 'lose', null],
        default: null
    },
    gameRoundId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameRound',
        required: true
    },
});

module.exports = mongoose.model('Transaction', transactionSchema);