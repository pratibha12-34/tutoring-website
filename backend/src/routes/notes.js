const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { getNotes, getCourseNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');
const {
    createNoteAttachmentUploadUrl,
    saveNoteAttachment,
    deleteNoteAttachment
} = require('../controllers/noteAttachmentController');

const router = express.Router();

router.get('/course/:courseId', authenticate, getCourseNotes);
router.get('/', authenticate, getNotes);
router.post('/', authenticate, requireRole('admin'), createNote);
router.post('/:id/attachments/upload-url', authenticate, requireRole('admin'), createNoteAttachmentUploadUrl);
router.post('/:id/attachments', authenticate, requireRole('admin'), saveNoteAttachment);
router.delete('/:id/attachments/:attachmentId', authenticate, requireRole('admin'), deleteNoteAttachment);
router.put('/:id', authenticate, requireRole('admin'), updateNote);
router.delete('/:id', authenticate, requireRole('admin'), deleteNote);

module.exports = router;
