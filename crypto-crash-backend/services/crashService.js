const GameRound = require('../models/GameRound');
const Player = require('../models/Player');
const generateCrashPoint = require('../utils/fairCrash');
const crypto = require('crypto');
const mongoose = require('mongoose');

let currentRound = null;
const roundIntervalDuration = 10000; // 10 seconds (set this to your preferred round duration)
let roundInterval = null;


async function getCurrentRound() {
    if (currentRound) return currentRound;

    // Fetch the latest round from the database
    const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });

    if (lastRound && !lastRound.endTime) {
        currentRound = lastRound; // Set it as the active round
        console.log("Fetched active round from database:", currentRound);
        return currentRound;
    }

    // If no active round, create a new one
    await startNewRound();
    return currentRound;
}

async function startNewRound(roundNumber = null) {
    try {
        if (!mongoose.connection.readyState === 1) {
            console.error('MongoDB is not connected. Cannot start new round.');
            return null;
        }

        if (!roundNumber) {
            const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });
            roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;
        }
        const crashMultiplier = generateCrashPoint();

        currentRound = new GameRound({
            roundNumber,
            crashMultiplier: crashMultiplier,
            serverSeed: crypto.randomBytes(32).toString('hex'),
            startTime: new Date(), // Add start time for tracking
            bets: [],
        })
        console.log("currentRound",currentRound);
        await currentRound.save();
        // Clear any existing interval
        if (roundInterval) clearInterval(roundInterval);

        // Start the interval to end the round automatically after 10 seconds
        roundInterval = setTimeout(async () => {
            await endRound();
            await startNewRound();
        }, 10000); // 10 seconds

        console.log(`New round created: ${currentRound.roundNumber} at ${new Date().toLocaleTimeString()}`);
        console.log(`Active connections: ${global.activeConnections}`);

        return currentRound;
    } catch (error) {
        console.error('Error in startNewRound:', error);
        return null;
    }
}

async function endRound()
 {
    if(!currentRound) return;
    currentRound.endTime = new Date();
    await currentRound.save();
    console.log("Ending round:", currentRound);
    console.log(`Round ended: ${currentRound.roundNumber} at ${new Date().toLocaleTimeString()}`);
    currentRound = null;
};

// Function to start the round interval (every 10 seconds)
function startRoundInterval() {
    if (roundInterval) {
        clearInterval(roundInterval);
    }

    // Start first round immediately
    startNewRound().then((round) => {
        if (round) {
            console.log("Initial round started");
        } else {
            console.log("Failed to start initial round - check database connection");
        }
    }).catch(err => {
        console.error("Error starting initial round:", err);
    });

    // Start new interval
    roundInterval = setInterval(async () => {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.error('MongoDB is not connected. Stopping round interval.');
                stopRoundInterval();
                return;
            }
            
            console.log("Starting a new round...");
            await endRound();
            await startNewRound();
        } catch (err) {
            console.error("Error in round interval:", err);
            stopRoundInterval();
        }
    }, roundIntervalDuration);

    console.log("Round interval started, new round every 10 seconds.");
}

// Function to manually stop the round interval
async function stopRoundInterval() {
    if (roundInterval) {
        clearInterval(roundInterval);
        roundInterval = null;
        // End the current round when stopping
        await endRound();
        console.log("Round interval stopped and current round ended.");
    }
}

async function addPlayerBet (playerId, amountUSD, amountCrypto, currency){
    currentRound = await getCurrentRound(); // Ensure currentRound is always active
    console.log("Adding player bet to current round:", currentRound);
    const existing = currentRound.bets.find(bet => bet.playerId.toString() === playerId.toString());
    if(existing) throw new Error('Player already placed a bet in this round');

    currentRound.bets.push({
        playerId,
        amountUSD,
        amountCrypto,
        cashoutMultiplier:null,
        currency,
    });
    await currentRound.save();
    return currentRound;
}

async function cashOutPlayer(playerId, cashoutMultiplier) {
    currentRound = await getCurrentRound(); // Ensure currentRound is always active
    if (!currentRound) return { success: false, error: "No active round found" };
    
    const playerBet = currentRound.bets.find(bet => bet.playerId.toString() === playerId.toString());
    console.log("playerBet-->", playerBet);
    
    if (!playerBet) return { success: false, error: "Player has not placed a bet" };

    if (playerBet.cashedOut) {
        return { success: false, error: "Player already cashed out for this bet." };
    }
    
    console.log("cashoutMultiplier-->", cashoutMultiplier);
    if (cashoutMultiplier > currentRound.crashMultiplier) {
        return { success: false, error: "Cashout multiplier exceeds crash multiplier." };
    }
    
    // Set cashout details
    playerBet.cashoutMultiplier = cashoutMultiplier;
    playerBet.cashedOut = true;

    // Save the current round with updated bet
    await currentRound.save();

    const earnedCrypto = playerBet.amountCrypto * cashoutMultiplier;
    console.log("earnedCrypto", earnedCrypto);

    return {
        success: true,
        bet: playerBet,
        earnedCrypto: earnedCrypto,
        currency: playerBet.currency,
    };
}



// Exporting all functions properly
module.exports = {
    getCurrentRound,
    startNewRound,
    addPlayerBet,
    cashOutPlayer,
    endRound,
    startRoundInterval,
    stopRoundInterval,
};