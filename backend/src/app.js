const express = require('express');
const cors = require('cors');

const coursesRouter = require('./routes/courses');
const batchesRouter = require('./routes/batches');
const userRouter = require('./routes/user');
const registerRouter = require('./routes/register');
const notesRouter = require('./routes/notes');
const enquiriesRouter = require('./routes/enquiries');
const enrollmentsRouter = require('./routes/enrollments');
const teachersRouter = require('./routes/teachers');
const attendanceRouter = require('./routes/attendance');
const studentsRouter = require('./routes/students');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    if (req.url === '/api' || req.url.startsWith('/api/')) {
        req.url = req.url.slice(4) || '/';
    }
    next();
});

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

app.get('/', (req, res) => {
    res.send('This is the backend API.');
});

module.exports = app;