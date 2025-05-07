const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    wallet: {
        BTC: {
            type: Number,
            default: 0,
            min: 0
        },
        ETH: {
            type: Number,
            default: 0,
            min: 0
        },
        SOL: {
            type: Number,
            default: 0,
            min: 0
        },
        USDT: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    stats: {
        totalBets: {
            type: Number,
            default: 0
        },
        totalWins: {
            type: Number,
            default: 0
        },
        totalLosses: {
            type: Number,
            default: 0
        },
        biggestWin: {
            type: Number,
            default: 0
        },
        biggestMultiplier: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
});

// Add middleware to ensure wallet amounts never go below 0
playerSchema.pre('save', function(next) {
    if (this.wallet.BTC < 0) this.wallet.BTC = 0;
    if (this.wallet.ETH < 0) this.wallet.ETH = 0;
    if (this.wallet.SOL < 0) this.wallet.SOL = 0;
    if (this.wallet.USDT < 0) this.wallet.USDT = 0;
    next();
});

module.exports = mongoose.model("Player", playerSchema);