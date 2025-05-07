require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully connected to MongoDB!');
        process.exit(0);
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
}

testConnection(); 