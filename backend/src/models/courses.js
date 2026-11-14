const mongoose = require('mongoose');
const { isHttpUrl } = require('../utils/learningLinks');

const courseVideoFileSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 160 },
    objectKey: { type: String, required: true, trim: true },
    contentType: {
        type: String,
        required: true,
        enum: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v']
    },
    size: { type: Number, required: true, min: 1, max: 1024 * 1024 * 1024 },
    uploadedAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
    course_img: {type: String, required: true},
    course_id: {type: Number, required: true},
    course_duration: {type: String, required: true},
    course_name:{ type: String, required: true},
    course_class: { type: String, required: true, trim: true, maxlength: 80 },
    course_subject: { type: String, required: true, trim: true, maxlength: 100 },
    course_fee: { type: Number, min: 0, default: 0 },
    course_description: { type: String, required:true},
    course_videos: {
        type: [{ type: String, trim: true }],
        default: [],
        validate: {
            validator: (urls) => urls.every(isHttpUrl),
            message: 'Course video links must use http or https.'
        }
    },
    course_video_files: { type: [courseVideoFileSchema], default: [] }

    // course_description:{ type: String, required: true}
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;