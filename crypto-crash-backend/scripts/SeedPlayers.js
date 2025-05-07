const mongoose = require('mongoose');
const Player = require('../models/Player');
const connectDB = require('../db/config');
require('dotenv').config();

const seedPlayers = async () => {
    try {
        await connectDB();
        
        // Clear existing players first
        await Player.deleteMany({});
        console.log('Cleared existing players');

        const players = [
            {
                name: 'alice',
                wallet: {
                    BTC: 1.0,    // 1 Bitcoin
                    ETH: 10.0,   // 10 Ethereum
                    SOL: 100.0,  // 100 Solana
                    USDT: 10000  // 10,000 USDT
                },
                stats: {
                    totalBets: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    biggestWin: 0,
                    biggestMultiplier: 0
                }
            },
            {
                name: 'bob',
                wallet: {
                    BTC: 2.0,
                    ETH: 20.0,
                    SOL: 200.0,
                    USDT: 20000
                },
                stats: {
                    totalBets: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    biggestWin: 0,
                    biggestMultiplier: 0
                }
            },
            {
                name: 'charlie',
                wallet: {
                    BTC: 3.0,
                    ETH: 30.0,
                    SOL: 300.0,
                    USDT: 30000
                },
                stats: {
                    totalBets: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    biggestWin: 0,
                    biggestMultiplier: 0
                }
            }
        ];

        const result = await Player.insertMany(players);
        console.log('Players seeded successfully:', result.length, 'players added');
        console.log('Player IDs for reference:');
        result.forEach(player => {
            console.log(`${player.name}: ${player._id}`);
        });

    } catch (err) {
        console.error('Error seeding players:', err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the seed function
seedPlayers();