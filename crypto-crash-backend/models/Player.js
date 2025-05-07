const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    wallet:{
        usd: {
            type: Number,
            default: 0,
        },
        crypto: {
            type: Number,
            default: 0,
        },
    },
    createdAt:{
        type: Date,
        default: Date.now,
    }
}
);

module.exports = mongoose.model("Player", playerSchema);