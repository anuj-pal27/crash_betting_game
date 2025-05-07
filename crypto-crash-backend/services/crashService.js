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

async function getNextRoundNumber() {
    try {
        const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });
        return lastRound ? lastRound.roundNumber + 1 : 1;
    } catch (error) {
        console.error('Error getting next round number:', error);
        throw error;
    }
}

async function startNewRound(io) {
    try {
        // Get the next round number
        const roundNumber = await getNextRoundNumber();
        
        // Check if a round with this number already exists
        const existingRound = await GameRound.findOne({ roundNumber });
        if (existingRound) {
            console.log(`Round ${roundNumber} already exists, getting next number`);
            return startNewRound(io); // Recursively try the next number
        }

        // Generate server seed and hash it
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const hashedSeed = crypto.createHash('sha256')
            .update(serverSeed)
            .digest('hex');
            
        const crashMultiplier = generateCrashPoint(serverSeed, roundNumber);

        currentRound = new GameRound({
            roundNumber,
            crashMultiplier,
            serverSeed,
            hashedSeed, // Add the hashed seed
            startTime: new Date(),
            status: 'active',
            bets: [],
            totalBetsUSD: 0,
            totalPayoutUSD: 0
        });

        await currentRound.save();

        // Notify all clients about new round
        io.emit('roundStart', {
            roundNumber,
            startTime: currentRound.startTime,
            hashedSeed // Include hashed seed in event for verification
        });

        console.log(`New round ${roundNumber} started with multiplier ${crashMultiplier}`);

        // Start multiplier updates
        let currentMultiplier = 1;
        const multiplierInterval = setInterval(() => {
            if (!currentRound || currentRound.status !== 'active') {
                clearInterval(multiplierInterval);
                return;
            }

            currentMultiplier += 0.01;
            io.emit('multiplierUpdate', { 
                multiplier: currentMultiplier,
                roundNumber 
            });

            if (currentMultiplier >= crashMultiplier) {
                clearInterval(multiplierInterval);
                currentRound.status = 'crashed';
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

    try {
        currentRound.endTime = new Date();
        currentRound.status = 'completed';
        await currentRound.save();

        io.emit('roundEnd', {
            roundNumber: currentRound.roundNumber,
            crashPoint: currentRound.crashMultiplier,
            serverSeed: currentRound.serverSeed, // Reveal server seed after round ends
            hashedSeed: currentRound.hashedSeed
        });

        currentRound = null;
    } catch (error) {
        console.error('Error ending round:', error);
        throw error;
    }
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