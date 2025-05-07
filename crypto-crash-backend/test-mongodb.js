require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');
console.log('First 10 characters of URI:', process.env.MONGODB_URI?.substring(0, 10)); 