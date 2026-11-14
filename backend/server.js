const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const cors = require('cors');
const app = express();
const envFilePath = path.join(__dirname, '.env');

if (fs.existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
}
const port = Number(process.env.PORT) || 5000;

const coursesRouter = require('./src/routes/courses');
const batchesRouter = require('./src/routes/batches');
const userRouter = require('./src/routes/user');
const registerRouter = require('./src/routes/register');
const notesRouter = require('./src/routes/notes');
const enquiriesRouter = require('./src/routes/enquiries');
const enrollmentsRouter = require('./src/routes/enrollments');
const teachersRouter = require('./src/routes/teachers');
const attendanceRouter = require('./src/routes/attendance');
const studentsRouter = require('./src/routes/students');
const connectdb = require ('./src/config/db');

app.use(cors());
app.use(express.json());

app.use('/allcourses', coursesRouter);
app.use('/allbatches', batchesRouter);
app.use('/login', userRouter);
app.use('/register', registerRouter);
app.use('/notes', notesRouter);
app.use('/enquiries', enquiriesRouter);
app.use('/enrollments', enrollmentsRouter);
app.use('/teachers', teachersRouter);
app.use('/attendance', attendanceRouter);
app.use('/students', studentsRouter);

app.get('/',(req, res) => {
    res.send("THis is a First page of backend");
});

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

startServer();