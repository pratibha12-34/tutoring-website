const TeacherAttendance = require('../models/teacherAttendance');

async function getMyAttendance(req, res) {
    try {
        return res.json(await TeacherAttendance.find({ teacherId: req.auth.userId }).sort({ date: -1 }).lean());
    } catch (error) {
        console.error('Could not load teacher attendance:', error);
        return res.status(500).json({ error: 'Could not load your attendance history.' });
    }
}

async function markAttendance(req, res) {
    const date = typeof req.body?.date === 'string' ? req.body.date : '';
    const rawStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    const status = ['p', 'present'].includes(rawStatus) ? 'present'
        : ['a', 'absent'].includes(rawStatus) ? 'absent' : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !status) {
        return res.status(400).json({ error: 'Enter today’s date and Present (P) or Absent (A).' });
    }
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) {
        return res.status(400).json({ error: 'Enter a valid attendance date.' });
    }
    try {
        const attendance = await TeacherAttendance.findOneAndUpdate(
            { teacherId: req.auth.userId, date },
            { $set: { status } },
            { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        return res.json({ message: `Attendance marked ${status}.`, attendance });
    } catch (error) {
        console.error('Could not record teacher attendance:', error);
        return res.status(500).json({ error: 'Could not record attendance. Please try again.' });
    }
}

module.exports = { getMyAttendance, markAttendance };
