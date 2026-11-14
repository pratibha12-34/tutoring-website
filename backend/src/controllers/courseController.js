const Course = require('../models/courses');
const Enrollment = require('../models/enrollment');
const Note = require('../models/note');
const mongoose = require('mongoose');
const { hasApprovedEnrollment } = require('../utils/learningLinks');
const { getReadUrls, deleteObjects } = require('../services/r2Storage');

async function createCourse(data){

    return Course.create({
        course_id: data.course_id,
        course_img: data.course_img,
        course_name: data.course_name,
        course_class: data.course_class,
        course_subject: data.course_subject,
        course_fee: data.course_fee ?? 0,
        course_duration:data.course_duration,
        course_description: data.course_description,
        course_videos: Array.isArray(data.course_videos) ? data.course_videos : []
    });
}

async function getCourses(){
    return Course.find().select('-course_videos -course_video_files');
    
} 

async function getCourseById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findById(id).select('-course_videos -course_video_files').lean();
}

async function getCourseContent(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid course ID.' });
    }

    try {
        const course = await Course.findById(req.params.id).select('course_videos course_video_files').lean();
        if (!course) return res.status(404).json({ error: 'Course not found.' });

        if (req.auth.role === 'student' && !await hasApprovedEnrollment(req.auth.userId, 'course', course._id)) {
            return res.status(403).json({ error: 'Enroll in this course to access its videos.' });
        }
        return res.json({
            course_videos: course.course_videos || [],
            course_video_files: await getReadUrls(course.course_video_files || [])
        });
    } catch (error) {
        console.error('Could not load course videos:', error);
        return res.status(500).json({ error: error.message || 'Could not load course videos.' });
    }
}

async function updateCourse(id, data) {
    return Course.findByIdAndUpdate(
        id,
        {
            course_img: data.course_img,
            course_id: data.course_id,
            course_duration: data.course_duration,
            course_name: data.course_name,
            course_class: data.course_class,
            course_subject: data.course_subject,
            course_fee: data.course_fee ?? 0,
            course_description: data.course_description,
            course_videos: Array.isArray(data.course_videos) ? data.course_videos : []
        },
        { returnDocument: 'after', runValidators: true }
    );
}

async function deleteCourse(id){
    const course = await Course.findById(id).select('course_video_files');
    if (!course) return null;

    await deleteObjects((course.course_video_files || []).map((video) => video.objectKey));
    const courseNotes = await Note.find({ courseId: id }).select('attachmentFiles').lean();
    await deleteObjects(courseNotes.flatMap((note) => (note.attachmentFiles || []).map((file) => file.objectKey)));
    const deletedCourse = await Course.findByIdAndDelete(id);
    if (deletedCourse) {
        await Promise.all([
            Enrollment.deleteMany({ itemType: 'course', itemId: deletedCourse._id }),
            Note.deleteMany({ courseId: deletedCourse._id })
        ]);
    }
    return deletedCourse;
}



module.exports = { createCourse, getCourses, getCourseById, getCourseContent, updateCourse, deleteCourse};