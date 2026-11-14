const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Note = require('../models/note');
const {
    MAX_NOTE_ATTACHMENT_BYTES,
    NOTE_ATTACHMENT_TYPES
} = require('../utils/noteAttachments');
const {
    createUploadUrl,
    getUploadedObjectInfo,
    deleteObject
} = require('../services/r2Storage');

function cleanAttachmentTitle(value) {
    return typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
        : '';
}

function isValidAttachmentKey(key, noteId) {
    const prefix = `learning-notes/${noteId}/`;
    const fileName = typeof key === 'string' && key.startsWith(prefix) ? key.slice(prefix.length) : '';
    const extensions = Object.values(NOTE_ATTACHMENT_TYPES).join('|');
    return new RegExp(`^[a-f0-9-]{36}\\.(?:${extensions})$`).test(fileName);
}

async function createNoteAttachmentUploadUrl(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid note ID.' });
    }

    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.toLowerCase() : '';
    const extension = NOTE_ATTACHMENT_TYPES[contentType];
    const size = Number(req.body?.size);
    const title = cleanAttachmentTitle(req.body?.title);
    if (!extension || !Number.isSafeInteger(size) || size <= 0 || size > MAX_NOTE_ATTACHMENT_BYTES || !title) {
        return res.status(400).json({
            error: 'Choose a supported notes file up to 50 MB (PDF, Office, OpenDocument, text, CSV, or image).'
        });
    }

    try {
        if (!(await Note.exists({ _id: req.params.id }))) {
            return res.status(404).json({ error: 'Study note not found.' });
        }

        const objectKey = `learning-notes/${req.params.id}/${randomUUID()}.${extension}`;
        const uploadUrl = await createUploadUrl(objectKey, contentType);
        return res.json({ objectKey, uploadUrl, title, contentType, size });
    } catch (error) {
        console.error('Could not prepare study note attachment upload:', error);
        return res.status(503).json({ error: error.message || 'Could not prepare the attachment upload.' });
    }
}

async function saveNoteAttachment(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid note ID.' });
    }

    const objectKey = req.body?.objectKey;
    const title = cleanAttachmentTitle(req.body?.title);
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.toLowerCase() : '';
    const size = Number(req.body?.size);
    if (!isValidAttachmentKey(objectKey, req.params.id)
        || !title
        || !NOTE_ATTACHMENT_TYPES[contentType]
        || !Number.isSafeInteger(size)
        || size <= 0
        || size > MAX_NOTE_ATTACHMENT_BYTES) {
        return res.status(400).json({ error: 'Invalid note attachment details.' });
    }

    try {
        const uploadedObject = await getUploadedObjectInfo(objectKey);
        if (uploadedObject.size !== size || uploadedObject.contentType !== contentType) {
            await deleteObject(objectKey);
            return res.status(400).json({ error: 'The uploaded file does not match its declared type or size.' });
        }

        const attachment = {
            title,
            objectKey,
            contentType,
            size: uploadedObject.size,
            uploadedAt: new Date()
        };
        const note = await Note.findOneAndUpdate(
            {
                _id: req.params.id,
                attachmentFiles: { $not: { $elemMatch: { objectKey } } }
            },
            { $push: { attachmentFiles: attachment } },
            { returnDocument: 'after', runValidators: true }
        );
        if (!note) {
            const existingNote = await Note.findOne({
                _id: req.params.id,
                'attachmentFiles.objectKey': objectKey
            }).select('attachmentFiles');
            if (existingNote) {
                return res.json(existingNote.attachmentFiles.find((file) => file.objectKey === objectKey));
            }
            return res.status(404).json({ error: 'Study note not found.' });
        }
        return res.status(201).json(note.attachmentFiles[note.attachmentFiles.length - 1]);
    } catch (error) {
        console.error('Could not save study note attachment:', error);
        return res.status(500).json({ error: error.message || 'Could not save the note attachment.' });
    }
}

async function deleteNoteAttachment(req, res) {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.attachmentId)) {
        return res.status(400).json({ error: 'Invalid note attachment ID.' });
    }

    try {
        const note = await Note.findById(req.params.id).select('attachmentFiles');
        if (!note) return res.status(404).json({ error: 'Study note not found.' });

        const attachment = note.attachmentFiles.id(req.params.attachmentId);
        if (!attachment) return res.status(404).json({ error: 'Note attachment not found.' });

        await deleteObject(attachment.objectKey);
        note.attachmentFiles.pull({ _id: req.params.attachmentId });
        await note.save();
        return res.json({ message: 'Note attachment removed.' });
    } catch (error) {
        console.error('Could not delete study note attachment:', error);
        return res.status(500).json({ error: error.message || 'Could not delete the note attachment.' });
    }
}

module.exports = {
    createNoteAttachmentUploadUrl,
    saveNoteAttachment,
    deleteNoteAttachment
};
