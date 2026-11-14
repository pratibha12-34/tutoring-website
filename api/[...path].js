const connectdb = require('../backend/src/config/db');
const app = require('../backend/src/app');

module.exports = async function handler(req, res) {
    try {
        await connectdb();
    } catch (error) {
        console.error('API request could not connect to MongoDB:', error.name);
        res.status(503).json({ error: 'The service is temporarily unavailable.' });
        return;
    }

    app(req, res);
};
