const Batch = require('../models/batches');
const Enrollment = require('../models/enrollment');
const mongoose = require('mongoose');
const { hasApprovedEnrollment } = require('../utils/learningLinks');
const { getReadUrls, deleteObjects } = require('../services/r2Storage');

async function createBatch(data){
    return Batch.create({
        batch_img: data.batch_img,
        batch_name:data.batch_name,
        batch_id:data.batch_id,
        batch_duration:data.batch_duration,
        batch_language:data.batch_language,
        batch_teacher: data.batch_teacher,
        batch_fee: data.batch_fee ?? 0,
        batch_videos: Array.isArray(data.batch_videos) ? data.batch_videos : [],
        batch_live_class_url: data.batch_live_class_url || ''
    });


}

async function getBatches(){
    return Batch.find().select('-batch_videos -batch_live_class_url -batch_video_files');

}

async function getBatchById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Batch.findById(id).select('-batch_videos -batch_live_class_url -batch_video_files').lean();
}

async function getBatchContent(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID.' });
    }

    try {
        const batch = await Batch.findById(req.params.id).select('batch_videos batch_live_class_url batch_video_files').lean();
        if (!batch) return res.status(404).json({ error: 'Batch not found.' });

        if (req.auth.role === 'student' && !await hasApprovedEnrollment(req.auth.userId, 'batch', batch._id)) {
            return res.status(403).json({ error: 'Enroll in this batch to access its videos and live class.' });
        }
        return res.json({
            batch_videos: batch.batch_videos || [],
            batch_video_files: await getReadUrls(batch.batch_video_files || []),
            batch_live_class_url: batch.batch_live_class_url || ''
        });
    } catch (error) {
        console.error('Could not load batch content:', error);
        return res.status(500).json({ error: error.message || 'Could not load batch content.' });
    }
}

async function updateBatch(id,data){
    return Batch.findByIdAndUpdate(
        id,
        {
             batch_img: data.batch_img,
            batch_name:data.batch_name,
            batch_id:data.batch_id,
            batch_duration:data.batch_duration,
            batch_language:data.batch_language,
            batch_teacher: data.batch_teacher,
            batch_fee: data.batch_fee ?? 0,
            batch_videos: Array.isArray(data.batch_videos) ? data.batch_videos : [],
            batch_live_class_url: data.batch_live_class_url || ''
        },
        { returnDocument: 'after', runValidators: true }
    );

}

async function deleteBatch(id){
    const batch = await Batch.findById(id).select('batch_video_files');
    if (!batch) return null;

    await deleteObjects((batch.batch_video_files || []).map((video) => video.objectKey));
    const deletedBatch = await Batch.findByIdAndDelete(id);
    if (deletedBatch) {
        await Enrollment.deleteMany({ itemType: 'batch', itemId: deletedBatch._id });
    }
    return deletedBatch;
}

module.exports = { createBatch, getBatches, getBatchById, getBatchContent, updateBatch, deleteBatch};