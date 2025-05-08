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

        // Start the interval to end the round automatically after 10 seconds
        roundInterval = setTimeout(async () => {
            await endRound();
            await startNewRound();
        }, 10000); // 10 seconds
    return currentRound;
};

async function endRound()
 {
    if(!currentRound) return;
    currentRound.endTime = new Date();
    await currentRound.save();
    console.log("Ending round:", currentRound);
    currentRound = null;
};

// Function to start the round interval (every 10 seconds)
function startRoundInterval() {
    if (roundInterval) {
        clearInterval(roundInterval);
    }

    // Start new interval
    roundInterval = setInterval(async () => {
        console.log("Starting a new round...");
        await startNewRound();
    }, roundIntervalDuration);

    console.log("Round interval started, new round every 10 seconds.");
}

// Function to manually stop the round interval
function stopRoundInterval() {
    if (roundInterval) {
        clearInterval(roundInterval);
        roundInterval = null;
        console.log("Round interval stopped.");
    }
}

async function addPlayerBet(playerId, amountUSD, amountCrypto, currency) {
    try {
        currentRound = await getCurrentRound();
        console.log("Adding player bet to current round:", currentRound);

        // Check if round is active
        if (!currentRound || currentRound.status !== 'active') {
            throw new Error('No active round available for betting');
        }

        // Check if player already has a bet in this round
        const existingBet = currentRound.bets.find(
            bet => bet.playerId.toString() === playerId.toString()
        );

        if (existingBet) {
            return {
                success: false,
                error: 'Player already placed a bet in this round'
            };
        }

        // Add the new bet
        const newBet = {
            playerId,
            amountUSD,
            amountCrypto,
            currency,
            cashoutMultiplier: null,
            cashedOut: false,
            payout: null
        };

        currentRound.bets.push(newBet);
        currentRound.totalBetsUSD += amountUSD;
        await currentRound.save();

        return {
            success: true,
            round: currentRound,
            bet: newBet
        };
    } catch (error) {
        console.error('Error adding player bet:', error);
        throw error;
    }
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