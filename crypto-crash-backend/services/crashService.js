const GameRound = require('../models/GameRound');
const Player = require('../models/Player');
const crypto = require('crypto');
const mongoose = require('mongoose');

let currentRound = null;
const roundIntervalDuration = 10000; // 10 seconds (set this to your preferred round duration)
let roundInterval = null;

// Add timeout handling for round operations
const ROUND_TIMEOUT = 10000; // 10 seconds

function generateCrashPoint(seed, roundNumber) {
    const hash = crypto.createHash('sha256')
        .update(`${seed}-${roundNumber}`)
        .digest('hex');
    
    // Convert first 4 bytes of hash to a number between 1 and max multiplier
    const MAX_MULTIPLIER = 100; // Maximum 100x multiplier
    const number = parseInt(hash.slice(0, 8), 16);
    const crashPoint = (number % (MAX_MULTIPLIER * 100)) / 100 + 1;
    
    return Number(crashPoint.toFixed(2));
}

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

async function startNewRound(io) {
    try {
        const roundNumber = currentRound ? currentRound.roundNumber + 1 : 1;
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const crashMultiplier = generateCrashPoint(serverSeed, roundNumber);

        currentRound = new GameRound({
            roundNumber,
            crashMultiplier,
            serverSeed,
            startTime: new Date(),
            bets: []
        });

        await currentRound.save();

        // Notify all clients about new round
        io.emit('roundStart', {
            roundNumber,
            startTime: currentRound.startTime
        });

        // Start multiplier updates
        let currentMultiplier = 1;
        const multiplierInterval = setInterval(() => {
            currentMultiplier += 0.01;
            io.emit('multiplierUpdate', { multiplier: currentMultiplier });

            if (currentMultiplier >= crashMultiplier) {
                clearInterval(multiplierInterval);
                endRound(io);
            }
        }, 100);

        return currentRound;
    } catch (error) {
        console.error('Error starting new round:', error);
        throw error;
    }
}

async function endRound(io) {
    if (!currentRound) return;

    currentRound.endTime = new Date();
    await currentRound.save();

    io.emit('roundEnd', {
        roundNumber: currentRound.roundNumber,
        crashPoint: currentRound.crashMultiplier
    });

    currentRound = null;
}

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
    try {
        currentRound = await getCurrentRound();
        if (!currentRound) {
            return { success: false, error: "No active round found" };
        }
        
        const playerBet = currentRound.bets.find(bet => 
            bet.playerId.toString() === playerId.toString()
        );
        
        if (!playerBet) {
            return { success: false, error: "Player has not placed a bet" };
        }

        if (playerBet.cashedOut) {
            return { success: false, error: "Player already cashed out for this bet" };
        }
        
        // Add validation for cashout multiplier
        if (cashoutMultiplier <= 1) {
            return { success: false, error: "Invalid cashout multiplier" };
        }
        
        if (cashoutMultiplier > currentRound.crashMultiplier) {
            return { success: false, error: "Cashout multiplier exceeds crash multiplier" };
        }
        
        playerBet.cashoutMultiplier = cashoutMultiplier;
        playerBet.cashedOut = true;
        await currentRound.save();

        const earnedCrypto = playerBet.amountCrypto * cashoutMultiplier;

        return {
            success: true,
            bet: playerBet,
            earnedCrypto,
            currency: playerBet.currency,
        };
    } catch (error) {
        console.error('Error in cashOutPlayer:', error);
        return { success: false, error: "Internal server error" };
    }
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