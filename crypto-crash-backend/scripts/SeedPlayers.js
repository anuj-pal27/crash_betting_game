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
                    crypto: 0.005,
                    usd: 30
                }
            },
            {
                name: 'bob',
                wallet: {
                    crypto: 0.01,
                    usd: 500
                }
            },
            {
                name: 'charlie',
                wallet: {
                    crypto: 0.02,
                    usd: 1000
                }
            },
            {
                name: 'dave',
                wallet: {
                    crypto: 0.03,
                    usd: 1500
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
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedPlayers();