const mongoose = require('mongoose');

function connectdb() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not configured.');
    }

    return mongoose.connect(mongoUri)
        .then(() => {
            console.log('MongoDB connected successfully');
        })
        .catch((error) => {
            console.error('MongoDB connection failed:', error.name, error.code || '');
            throw error;
        });
}

module.exports = connectdb;
