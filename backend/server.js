const fs = require('node:fs');
const path = require('node:path');
const envFilePath = path.join(__dirname, '.env');

if (fs.existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
}
const port = Number(process.env.PORT) || 5000;
const app = require('./src/app');
const connectdb = require ('./src/config/db');

async function startServer() {
    try {
        await connectdb();
        app.listen(port, () => {
            console.log(`Server is running on ${port}`);
        });
    } catch {
        console.error('Backend did not start. Check the MongoDB connection string and Atlas network access settings.');
        process.exitCode = 1;
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;