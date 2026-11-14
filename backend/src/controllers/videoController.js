const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Batch = require('../models/batches');
const Course = require('../models/courses');
const {
    MAX_VIDEO_BYTES,
    VIDEO_EXTENSIONS,
    createUploadUrl: createR2UploadUrl,
    getReadUrls,
    getUploadedObjectInfo,
    deleteObject
} = require('../services/r2Storage');

const RESOURCE_CONFIG = {
    course: { model: Course, field: 'course_video_files' },
    batch: { model: Batch, field: 'batch_video_files' }
};

function getResourceConfig(type) {
    return RESOURCE_CONFIG[type];
}

function cleanVideoTitle(value) {
    return typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
        : '';
}

function validVideoKey(key, type, resourceId) {
    const prefix = `learning-videos/${type}/${resourceId}/`;
    const fileName = typeof key === 'string' && key.startsWith(prefix) ? key.slice(prefix.length) : '';
    return /^[a-f0-9-]{36}\.(?:mp4|webm|ogg|mov|m4v)$/.test(fileName);
}

function createUploadUrl(type) {
    return async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: `Invalid ${type} ID.` });
        }

        const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.toLowerCase() : '';
        const extension = VIDEO_EXTENSIONS[contentType];
        const size = Number(req.body?.size);
        const title = cleanVideoTitle(req.body?.title);
        if (!extension || !Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_BYTES || !title) {
            return res.status(400).json({
                error: 'Choose a named MP4, WebM, OGG, MOV, or M4V video file up to 1 GB.'
            });
        }

        try {
            const { model: Resource } = getResourceConfig(type);
            const resourceExists = await Resource.exists({ _id: req.params.id });
            if (!resourceExists) return res.status(404).json({ error: `${type} not found.` });

            const objectKey = `learning-videos/${type}/${req.params.id}/${randomUUID()}.${extension}`;
            const uploadUrl = await createR2UploadUrl(objectKey, contentType);
            return res.json({ objectKey, uploadUrl, title, contentType, size });
        } catch (error) {
            console.error(`Could not prepare ${type} video upload:`, error);
            return res.status(503).json({
                error: error.message || 'Could not prepare the video upload.'
            });
        }
    };
}

function saveUploadedVideo(type) {
    return async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: `Invalid ${type} ID.` });
        }

        const { model: Resource, field } = getResourceConfig(type);
        const objectKey = req.body?.objectKey;
        const title = cleanVideoTitle(req.body?.title);
        const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.toLowerCase() : '';
        const size = Number(req.body?.size);
        if (!validVideoKey(objectKey, type, req.params.id)
            || !title
            || !VIDEO_EXTENSIONS[contentType]
            || !Number.isSafeInteger(size)
            || size <= 0
            || size > MAX_VIDEO_BYTES) {
            return res.status(400).json({ error: 'Invalid video upload details.' });
        }

        try {
            const uploadedObject = await getUploadedObjectInfo(objectKey);
            if (uploadedObject.size !== size || uploadedObject.contentType !== contentType) {
                return res.status(400).json({ error: 'The uploaded file does not match its declared type or size.' });
            }

            const video = {
                title,
                objectKey,
                contentType,
                size: uploadedObject.size,
                uploadedAt: new Date()
            };
            const resource = await Resource.findOneAndUpdate(
                {
                    _id: req.params.id,
                    [field]: { $not: { $elemMatch: { objectKey } } }
                },
                { $push: { [field]: video } },
                { returnDocument: 'after', runValidators: true }
            );
            if (!resource) {
                return res.status(404).json({ error: `${type} not found, or this video was already added.` });
            }
            return res.status(201).json(resource[field][resource[field].length - 1]);
        } catch (error) {
            console.error(`Could not save uploaded ${type} video:`, error);
            return res.status(500).json({ error: error.message || `Could not save the ${type} video.` });
        }
    };
}

function removeUploadedVideo(type) {
    return async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.videoId)) {
            return res.status(400).json({ error: 'Invalid video ID.' });
        }

        const { model: Resource, field } = getResourceConfig(type);
        try {
            const resource = await Resource.findById(req.params.id).select(field);
            if (!resource) return res.status(404).json({ error: `${type} not found.` });

            const video = resource[field].id(req.params.videoId);
            if (!video) return res.status(404).json({ error: 'Video not found.' });

            await deleteObject(video.objectKey);
            resource[field].pull({ _id: req.params.videoId });
            await resource.save();
            return res.json({ message: 'Video removed.' });
        } catch (error) {
            console.error(`Could not remove uploaded ${type} video:`, error);
            return res.status(500).json({ error: error.message || 'Could not remove the video.' });
        }
    };
}

module.exports = {
    createUploadUrl,
    saveUploadedVideo,
    removeUploadedVideo
};
