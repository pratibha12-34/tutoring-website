const mongoose = require('mongoose');
const Enrollment = require('../models/enrollment');
const Note = require('../models/note');
const Course = require('../models/courses');
const CoursePayment = require('../models/coursePayment');
const { getDownloadUrls, deleteObjects } = require('../services/r2Storage');
const { hasApprovedEnrollment } = require('../utils/learningLinks');

async function addAttachmentUrls(notes) {
    return Promise.all(notes.map(async (note) => ({
        ...note,
        attachmentFiles: await getDownloadUrls(note.attachmentFiles || [])
    })));
}

function readNoteInput(body) {
    const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';
    const chapter = typeof body?.chapter === 'string' ? body.chapter.trim() : '';
    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    const keyPoint = typeof body?.keyPoint === 'string' ? body.keyPoint.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const attachmentUrl = typeof body?.attachmentUrl === 'string' ? body.attachmentUrl.trim() : '';

    if (!mongoose.isValidObjectId(courseId)) return { error: 'Select a valid course for this note.' };
    if (!chapter || chapter.length > 120) return { error: 'Chapter title is required and must be 120 characters or fewer.' };
    if (!summary || summary.length > 2000) return { error: 'Summary is required and must be 2,000 characters or fewer.' };
    if (!keyPoint || keyPoint.length > 500) return { error: 'Key point is required and must be 500 characters or fewer.' };
    if (content.length > 12000) return { error: 'Note details must be 12,000 characters or fewer.' };
    if (attachmentUrl && !/^https?:\/\//i.test(attachmentUrl)) return { error: 'Attachment link must start with http:// or https://.' };
    return { value: { courseId, chapter, summary, keyPoint, content, attachmentUrl } };
}

async function getNotes(req, res) {
    try {
        let query = {};
        if (req.auth.role === 'student') {
            const enrollments = await Enrollment.find({ studentId: req.auth.userId, itemType: 'course' })
                .select('itemId coursePaymentId')
                .lean();
            const paymentIds = enrollments.map((entry) => entry.coursePaymentId).filter(Boolean);
            const verifiedPayments = await CoursePayment.find({ _id: { $in: paymentIds }, status: 'verified' }).select('_id').lean();
            const verifiedPaymentIds = new Set(verifiedPayments.map((payment) => payment._id.toString()));
            const accessibleCourseIds = enrollments
                .filter((entry) => !entry.coursePaymentId || verifiedPaymentIds.has(entry.coursePaymentId.toString()))
                .map((entry) => entry.itemId);
            query = { courseId: { $in: accessibleCourseIds } };
        }
        const notes = await Note.find(query).populate('courseId', 'course_name course_id').sort({ createdAt: -1 }).lean();
        return res.json(await addAttachmentUrls(notes));
    } catch (error) {
        console.error('Could not load study notes:', error);
        return res.status(500).json({ error: 'Could not load study notes.' });
    }
}

async function getCourseNotes(req, res) {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ error: 'Invalid course ID.' });

    try {
        const courseExists = await Course.exists({ _id: courseId });
        if (!courseExists) return res.status(404).json({ error: 'Course not found.' });

        if (req.auth.role === 'student' && !await hasApprovedEnrollment(req.auth.userId, 'course', courseId)) {
            return res.status(403).json({ error: 'Enroll in this course to access its notes.' });
        }

        const notes = await Note.find({ courseId })
            .populate('courseId', 'course_name course_id')
            .sort({ createdAt: -1 })
            .lean();
        return res.json(await addAttachmentUrls(notes));
    } catch (error) {
        console.error('Could not load course study notes:', error);
        return res.status(500).json({ error: 'Could not load this course’s study notes.' });
    }
}

async function createNote(req, res) {
    const validation = readNoteInput(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    try {
        if (!(await Course.exists({ _id: validation.value.courseId }))) {
            return res.status(404).json({ error: 'The selected course was not found.' });
        }
        const note = await Note.create(validation.value);
        return res.status(201).json(await note.populate('courseId', 'course_name course_id'));
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ error: 'Check the note details and try again.' });
        console.error('Could not create study note:', error);
        return res.status(500).json({ error: 'Could not create the study note.' });
    }
}

async function updateNote(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid note ID.' });
    const validation = readNoteInput(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    try {
        if (!(await Course.exists({ _id: validation.value.courseId }))) {
            return res.status(404).json({ error: 'The selected course was not found.' });
        }
        const note = await Note.findByIdAndUpdate(req.params.id, validation.value, { returnDocument: 'after', runValidators: true })
            .populate('courseId', 'course_name course_id');
        if (!note) return res.status(404).json({ error: 'Study note not found.' });
        return res.json(note);
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ error: 'Check the note details and try again.' });
        console.error('Could not update study note:', error);
        return res.status(500).json({ error: 'Could not update the study note.' });
    }
}

async function deleteNote(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid note ID.' });
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Study note not found.' });
        await deleteObjects((note.attachmentFiles || []).map((file) => file.objectKey));
        await Note.findByIdAndDelete(req.params.id);
        return res.json({ message: 'Study note deleted.' });
    } catch (error) {
        console.error('Could not delete study note:', error);
        return res.status(500).json({ error: 'Could not delete the study note.' });
    }
}

module.exports = { getNotes, getCourseNotes, createNote, updateNote, deleteNote };
