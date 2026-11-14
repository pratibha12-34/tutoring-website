const mongoose = require('mongoose');

let connectionPromise;

function connectdb() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not configured.');
    }

    if (mongoose.connection.readyState === 1) {
        return Promise.resolve(mongoose);
    }

    if (!connectionPromise || mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        connectionPromise = mongoose.connect(mongoUri)
            .then(() => {
                console.log('MongoDB connected successfully');
                return mongoose;
            })
            .catch((error) => {
                connectionPromise = null;
                console.error('MongoDB connection failed:', error.name, error.code || '');
                throw error;
            });
    }

    return connectionPromise;
}

module.exports = connectdb;
