const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createBatch, getBatches, getBatchById, getBatchContent, updateBatch, deleteBatch} = require('../controllers/batchController');
const { createUploadUrl, saveUploadedVideo, removeUploadedVideo } = require('../controllers/videoController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('admin'), async (req,res) => {
    try{
        const batch = await createBatch(req.body);
        res.status(201).json(batch);
    }
    catch(err){
        res.status(400).json({error: 'Failed to create batch'});
    }
});

router.get('/', async(req,res) => {
    try{
        res.json( await getBatches());
    }
    catch(err){
        res.status(500).json({error: ' Could not load batches'});
    }
});

router.get('/:id/content', authenticate, getBatchContent);
router.post('/:id/videos/upload-url', authenticate, requireRole('admin'), createUploadUrl('batch'));
router.post('/:id/videos', authenticate, requireRole('admin'), saveUploadedVideo('batch'));
router.delete('/:id/videos/:videoId', authenticate, requireRole('admin'), removeUploadedVideo('batch'));

router.get('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID.' });
    }
    try {
        const batch = await getBatchById(req.params.id);
        if (!batch) return res.status(404).json({ error: 'Batch not found.' });
        return res.json(batch);
    } catch (err) {
        return res.status(500).json({ error: 'Could not load batch.' });
    }
});

router.put('/:id', authenticate, requireRole('admin'), async(req,res) => {
    try{
        const batch = await updateBatch(req.params.id, req.body);
        if(!batch){
            return res.status(404).json({error: 'Batch not found'});
        }
        res.json(batch);
    }
    catch(err){
        res.status(400).json({error: 'Could not update courses'});
    }
});

router.delete('/:id', authenticate, requireRole('admin'), async(req, res)=>{
    try{
        const batch = await deleteBatch(req.params.id, req.body);
        if(!batch){
            return res.status(404).json({error:'batch not found'});
        }
        res.json({message:'batch deleted'});
    }
    catch(err){
        console.error('Could not delete batch:', err);
        res.status(500).json({error: err.message || 'Could not delete batch.'});
    }
});

module.exports = router;