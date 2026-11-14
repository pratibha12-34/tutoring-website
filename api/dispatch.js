const connectdb = require('../backend/src/config/db');
const app = require('../backend/src/app');

module.exports = async function handler(req, res) {
    const requestUrl = new URL(req.url, 'http://localhost');
    const apiPath = requestUrl.searchParams.get('__vercel_api_path');

    if (
        apiPath === null
        || apiPath.length > 2048
        || apiPath.startsWith('/')
        || apiPath.includes('\\')
        || (apiPath && apiPath.split('/').some((segment) => !segment || segment === '.' || segment === '..'))
    ) {
        return res.status(400).json({ error: 'Invalid API path.' });
    }

    requestUrl.searchParams.delete('__vercel_api_path');
    req.url = `/${apiPath}${requestUrl.search}`;

    try {
        await connectdb();
    } catch (error) {
        console.error('API request could not connect to MongoDB:', error.name);
        res.status(503).json({ error: 'The service is temporarily unavailable.' });
        return;
    }

    app(req, res);
};
