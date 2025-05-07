const mongoose = require('mongoose');
const Player = require('../models/Player');
require('dotenv').config();

const seed = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crypto-crash',)
        await Player.deleteMany({});
        const players = [
            {name: 'alice', wallet:{crypto:0.005,usd:300}},
            {name: 'bob', wallet:{crypto:0.01,usd:500}},
            {name: 'charlie', wallet:{crypto:0.02,usd:1000}},
            {name: 'dave', wallet:{crypto:0.03,usd:1500}},
        ];
        await Player.insertMany(players);
        console.log('Players seeded successfully');
        process.exit();
    }catch(err){
        console.error('Error seeding players:', err);
        process.exit(1);
    }
}

seed();