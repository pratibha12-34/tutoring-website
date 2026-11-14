const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ['candidate', 'admin'],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const enquirySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 80
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        index: true
    },
    topic: {
        type: String,
        enum: ['courses', 'batches', 'account', 'other'],
        required: true
    },
    accessTokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false
    },
    accessTokenEncrypted: {
        type: String,
        required: true,
        select: false
    },
    accessEmailSentAt: {
        type: Date,
        default: null
    },
    messages: {
        type: [messageSchema],
        validate: {
            validator: (messages) => messages.length > 0,
            message: 'An enquiry must include its initial message.'
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
