const mongoose = require('mongoose');
const { MAX_NOTE_ATTACHMENT_BYTES, NOTE_ATTACHMENT_TYPES } = require('../utils/noteAttachments');

const noteAttachmentSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 160 },
    objectKey: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, enum: Object.keys(NOTE_ATTACHMENT_TYPES) },
    size: { type: Number, required: true, min: 1, max: MAX_NOTE_ATTACHMENT_BYTES },
    uploadedAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    chapter: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    summary: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    keyPoint: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    content: {
        type: String,
        trim: true,
        maxlength: 12000,
        default: ''
    },
    attachmentUrl: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    attachmentFiles: { type: [noteAttachmentSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
