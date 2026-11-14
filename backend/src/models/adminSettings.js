const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    pinHash: {
        type: String,
        required: true,
        select: false
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminSettings', adminSettingsSchema, 'adminsettings');
