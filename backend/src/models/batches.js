const mongoose = require('mongoose');
const { isHttpUrl } = require('../utils/learningLinks');

const batchVideoFileSchema = new mongoose.Schema({
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

const batchSchema = new mongoose.Schema({
    batch_img : {type:String, required:true},
    batch_id : {type:Number, required:true},
    batch_name : {type:String, required:true},
    batch_duration : {type:String, required:true},
    batch_language : {type:String, required:true},
    batch_teacher : {type:String, required:true},
    batch_fee: { type: Number, min: 0, default: 0 },
    batch_videos: {
        type: [{ type: String, trim: true }],
        default: [],
        validate: {
            validator: (urls) => urls.every(isHttpUrl),
            message: 'Batch video links must use http or https.'
        }
    },
    batch_live_class_url: {
        type: String,
        trim: true,
        default: '',
        validate: {
            validator: (url) => !url || isHttpUrl(url),
            message: 'The live class link must use http or https.'
        }
    },
    batch_video_files: { type: [batchVideoFileSchema], default: [] }
});

const Batch = mongoose.model ('Batch', batchSchema);

module.exports = Batch;