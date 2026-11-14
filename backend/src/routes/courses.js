const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createCourse, getCourses, getCourseById, getCourseContent, updateCourse, deleteCourse} = require('../controllers/courseController');
const { createUploadUrl, saveUploadedVideo, removeUploadedVideo } = require('../controllers/videoController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('admin'), async(req, res)=>{
    try{
        const course = await createCourse(req.body);
        res.status(201).json(course);
    }
    catch(err){
        res.status(400).json({error: 'Failed to create course'});
    }
});

router.get('/',async(req, res)=>{
    try{
        res.json(await getCourses());
    }
    catch(err){
        res.status(500).json({error: 'Could not load courses'});
    }
});

router.get('/:id/content', authenticate, getCourseContent);
router.post('/:id/videos/upload-url', authenticate, requireRole('admin'), createUploadUrl('course'));
router.post('/:id/videos', authenticate, requireRole('admin'), saveUploadedVideo('course'));
router.delete('/:id/videos/:videoId', authenticate, requireRole('admin'), removeUploadedVideo('course'));

router.get('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid course ID.' });
    }
    try {
        const course = await getCourseById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found.' });
        return res.json(course);
    } catch (err) {
        return res.status(500).json({ error: 'Could not load course.' });
    }
});

router.put('/:id', authenticate, requireRole('admin'), async(req, res)=>{
    try{
        const course = await updateCourse(req.params.id, req.body);
        if(!course){
            return res.status (404).json({error: 'Course not found'});
        }
        res.json(course);
    }
    catch(err){
        res.status(400).json({error: 'Could not update course'});
    }
});

router.delete('/:id', authenticate, requireRole('admin'), async(req, res)=>{
    try{
        const course = await deleteCourse(req.params.id, req.body);
        if(!course){
            return res.status(404).json({error: 'Course not found'});
        }
        res.json(course);
    }
    catch(err){
        console.error('Could not delete course:', err);
        res.status(500).json({error: err.message || 'Could not delete course.'});
    }
});

module.exports = router; 