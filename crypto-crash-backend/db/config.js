const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
        return true;
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        if (err.message.includes('bad auth')) {
            console.log('Please check your MongoDB username and password in the connection string');
        }
        return false;
    }
}

// Export the function directly
module.exports = connectDB;

