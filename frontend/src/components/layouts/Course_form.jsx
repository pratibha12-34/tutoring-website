import { AddCircle, Edit, Delete, AutoStories } from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../auth-context.js';
import { apiRequest } from '../api.js';
import { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES, uploadVideoFile } from '../fileUploads.js';
import Seo from '../Seo.jsx';
import './CatalogCards.css';
import './Courses.css';

const Course_form = () =>{
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const EMPTY_COURSE = {
        course_id:'',
        course_name:'',
        course_class:'',
        course_subject:'',
        course_fee:'0',
        course_duration:'',
        course_img:'',
        course_description:'',
        course_videos: []
    };
    const [f_data, setf_data] = useState({ ...EMPTY_COURSE });
    const [uploadedVideoFiles, setUploadedVideoFiles] = useState([]);
    const [selectedVideoFiles, setSelectedVideoFiles] = useState([]);
    const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
    const [videoUploadStatus, setVideoUploadStatus] = useState('');
    const [showform, setshowform] = useState(user?.role === 'admin' && searchParams.get('action') === 'add');
    const [editingid, seteditingid] = useState(null);
    const [error, setError] = useState('');
    const [courses, setcourses] = useState([]);
    const [search, setSearch] = useState('');
    const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
    const [pendingCourseIds, setPendingCourseIds] = useState([]);
    const [notice, setNotice] = useState('');
    const [upi, setUpi] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [paymentUtr, setPaymentUtr] = useState('');
    const [paymentQr, setPaymentQr] = useState(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const paymentIntent = selectedCourse && upi?.enabled
        ? `upi://pay?${new URLSearchParams({
            pa: upi.vpa,
            pn: upi.merchantName,
            am: Number(selectedCourse.course_fee).toFixed(2),
            cu: 'INR',
            tn: `Course ${selectedCourse.course_id}`
        }).toString()}`
        : '';
    const visibleCourses = courses.filter((course) =>
        course.course_name?.toLowerCase().includes(search.trim().toLowerCase())
    );
    
    
    useEffect(() => {
        apiRequest('/allcourses')
            .then(setcourses)
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        if (user?.role !== 'student') return;
        apiRequest('/enrollments/mine')
            .then((result) => {
                setEnrolledCourseIds(result.courses.map((course) => course._id));
                setPendingCourseIds(result.pendingCourses.map((payment) => String(payment.itemId)));
            })
            .catch((err) => setError(err.message));
    }, [user]);

    useEffect(() => {
        if (user?.role !== 'student') return;
        apiRequest('/students/fees/mine')
            .then((result) => setUpi(result.upi))
            .catch((err) => setError(err.message));
    }, [user]);

    useEffect(() => {
        let isMounted = true;
        if (!paymentIntent) {
            return () => {
                isMounted = false;
            };
        }
        QRCode.toDataURL(paymentIntent, { width: 220, margin: 2 })
            .then((image) => {
                if (isMounted) setPaymentQr({ intent: paymentIntent, image });
            })
            .catch((qrError) => {
                if (isMounted) setError(qrError.message || 'Could not create the course payment QR code.');
            });
        return () => {
            isMounted = false;
        };
    }, [paymentIntent]);

    async function refreshEnrollments() {
        const result = await apiRequest('/enrollments/mine');
        setEnrolledCourseIds(result.courses.map((course) => course._id));
        setPendingCourseIds(result.pendingCourses.map((payment) => String(payment.courseId)));
    }


    function handleAddClick(){
        setf_data({ ...EMPTY_COURSE });
        setUploadedVideoFiles([]);
        setSelectedVideoFiles([]);
        seteditingid(null);
        setError('');
        setshowform(true);
    }

    async function handleEditClick(item) {
        setError('');
        try {
            const content = await apiRequest(`/allcourses/${item._id}/content`);
            setUploadedVideoFiles(content.course_video_files || []);
            setSelectedVideoFiles([]);
            setf_data({
                course_img: item.course_img,
                course_id: item.course_id,
                course_duration: item.course_duration,
                course_name: item.course_name,
                course_class: item.course_class || '',
                course_subject: item.course_subject || '',
                course_fee: item.course_fee ?? 0,
                course_description: item.course_description,
                course_videos: content.course_videos || []
            });
            seteditingid(item._id);
            setshowform(true);
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleSubmit (event){
        event.preventDefault();
        setError('');
        setIsSubmittingCourse(true);
        try{
            const courseData = {
                ...f_data,
                course_videos: f_data.course_videos.map((url) => url.trim()).filter(Boolean)
            };
            let courseId = editingid;
            if (courseId) {
                await apiRequest(`/allcourses/${courseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(courseData)
                });
            } else {
                const createdCourse = await apiRequest('/allcourses', {
                    method: 'POST',
                    body: JSON.stringify(courseData)
                });
                courseId = createdCourse._id;
                seteditingid(courseId);
            }

            for (let index = 0; index < selectedVideoFiles.length; index += 1) {
                const file = selectedVideoFiles[index];
                setVideoUploadStatus(`Uploading video ${index + 1} of ${selectedVideoFiles.length}…`);
                const uploadedVideo = await uploadVideoFile('course', courseId, file);
                setUploadedVideoFiles((current) => [...current, uploadedVideo]);
                setSelectedVideoFiles((current) => current.filter((selectedFile) => selectedFile !== file));
            }

            const refreshedCourses = await apiRequest('/allcourses');
            setcourses(refreshedCourses);
            setf_data({ ...EMPTY_COURSE });
            setUploadedVideoFiles([]);
            setSelectedVideoFiles([]);
            seteditingid(null);
            setshowform(false);
        }
        catch(err){
            setError(err.message);
        } finally {
            setIsSubmittingCourse(false);
            setVideoUploadStatus('');
        }
    }

    function handleVideoFileSelection(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        const invalidFile = files.find((file) =>
            !VIDEO_MIME_TYPES.includes(file.type) || file.size <= 0 || file.size > MAX_VIDEO_BYTES
        );
        if (invalidFile) {
            setError('Choose MP4, WebM, OGG, MOV, or M4V video files up to 1 GB each.');
            setSelectedVideoFiles([]);
            return;
        }
        setError('');
        setSelectedVideoFiles(files);
    }

    async function removeUploadedVideo(videoId) {
        if (!editingid) return;
        setError('');
        try {
            await apiRequest(`/allcourses/${editingid}/videos/${videoId}`, { method: 'DELETE' });
            setUploadedVideoFiles((current) => current.filter((video) => video._id !== videoId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function handledelete(courseid){
        if(!window.confirm('Are you sure you want to delete this course ?')) {
            return;
        }

        setError('');
        try{
            await apiRequest(`/allcourses/${courseid}`, { method: 'DELETE' });
            const refreshedCourses = await apiRequest('/allcourses');
            setcourses(refreshedCourses);
        }
        catch(err){
            setError(err.message);
        }
    }

    async function handleEnrollment(course) {
        setError('');
        setNotice('');
        const fee = Number(course.course_fee ?? 0);
        if (!Number.isFinite(fee) || fee < 0) {
            setError('The course fee is invalid. Please contact the administrator.');
            return;
        }
        if (fee > 0) {
            if (!upi?.enabled) {
                setError('UPI payments are not configured. Please contact the administrator.');
                return;
            }
            setSelectedCourse(course);
            setPaymentUtr('');
            return;
        }
        try {
            await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ type: 'course', id: course._id })
            });
            setEnrolledCourseIds((current) => [...current, course._id]);
            setNotice(`You’re enrolled in ${course.course_name}. Its notes will appear in your student panel.`);
        } catch (err) {
            setError(err.message);
        }
    }

    async function submitCoursePayment(event) {
        event.preventDefault();
        if (!selectedCourse) return;

        setError('');
        setNotice('');
        setIsSubmittingPayment(true);
        try {
            const result = await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'course',
                    id: selectedCourse._id,
                    amount: selectedCourse.course_fee,
                    utr: paymentUtr
                })
            });
            setPendingCourseIds((current) => [...new Set([...current, selectedCourse._id])]);
            setNotice(result.message);
            setSelectedCourse(null);
            setPaymentUtr('');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmittingPayment(false);
        }
    }

    function handleCancel(){
        setf_data({ ...EMPTY_COURSE });
        setUploadedVideoFiles([]);
        setSelectedVideoFiles([]);
        setVideoUploadStatus('');
        seteditingid(null);
        setshowform(false);
        setError('');
    }
    
    return(
        <main className="course-management-page">
            <Seo
                title={user?.role === 'admin' ? 'Manage Courses | Garvit' : 'Online Tutoring Courses | Garvit'}
                description="Browse tutoring courses by subject and class. Explore course details and find a learning path that fits your goals."
                canonicalPath="/allcourses"
                noIndex={user?.role === 'admin'}
            />
            <nav className="course-management-nav" aria-label="Course page navigation">
                <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/student' : '/'}>
                    Back to {user?.role === 'admin' ? 'admin panel' : user?.role === 'student' ? 'student panel' : 'home'}
                </Link>
                {user?.role === 'admin' && (
                    <button type="button" onClick={handleAddClick} disabled={isSubmittingCourse}><AddCircle /> Add course</button>
                )}
            </nav>

            <header className="course-management-header">
                <span className="course-management-header-icon"><AutoStories /></span>
                <div>
                    <p>{user?.role === 'admin' ? 'ADMIN MANAGEMENT' : 'EXPLORE YOUR NEXT SUBJECT'}</p>
                    <h1>{user?.role === 'admin' ? 'Manage courses' : 'Explore all courses'}</h1>
                    <small>{user?.role === 'admin' ? 'Add, update, and remove courses.' : 'Find a course that fits your learning goals.'}</small>
                </div>
            </header>

            <div className="course-catalog-toolbar">
                <input className="catalog-search" type="search" aria-label="Search courses" placeholder="Search courses" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>

            {showform && user?.role === 'admin' && (
                <form className="course-editor" onSubmit={handleSubmit}>
                    <h2>{editingid ? 'Edit course' : 'Add course details'}</h2>
                    <div className="course-editor-grid">
                        <label htmlFor="course_id">Course ID
                            <input type="number" id="course_id" name="course_id" placeholder="Enter course ID" value={f_data.course_id} onChange={(event) => setf_data((current) => ({ ...current, course_id: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_name">Course name
                            <input type="text" id="course_name" name="course_name" placeholder="Enter course name" value={f_data.course_name} onChange={(event) => setf_data((current) => ({ ...current, course_name: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_class">Class
                            <input type="text" id="course_class" name="course_class" placeholder="e.g. Class 10" value={f_data.course_class} onChange={(event) => setf_data((current) => ({ ...current, course_class: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_subject">Subject
                            <input type="text" id="course_subject" name="course_subject" placeholder="e.g. Mathematics" value={f_data.course_subject} onChange={(event) => setf_data((current) => ({ ...current, course_subject: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_fee">Course fee (₹)
                            <input type="number" id="course_fee" name="course_fee" min="0" step="0.01" value={f_data.course_fee} onChange={(event) => setf_data((current) => ({ ...current, course_fee: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_duration">Duration
                            <input type="text" id="course_duration" name="course_duration" placeholder="e.g. 6 hours" value={f_data.course_duration} onChange={(event) => setf_data((current) => ({ ...current, course_duration: event.target.value }))} required />
                        </label>
                        <label htmlFor="course_img">Banner image URL
                            <input type="url" id="course_img" name="course_img" placeholder="https://..." value={f_data.course_img} onChange={(event) => setf_data((current) => ({ ...current, course_img: event.target.value }))} required />
                        </label>
                        <label className="course-editor-description" htmlFor="course_description">Description
                            <textarea id="course_description" name="course_description" placeholder="Describe this course" value={f_data.course_description} onChange={(event) => setf_data((current) => ({ ...current, course_description: event.target.value }))} required />
                        </label>
                        <div className="catalog-video-fields">
                            <strong>Course videos</strong>
                            <p>Add a YouTube or direct video URL for each lesson.</p>
                            {f_data.course_videos.map((url, index) => (
                                <div className="catalog-video-row" key={`${editingid || 'new-course'}-${index}`}>
                                    <input
                                        type="url"
                                        aria-label={`Course video ${index + 1} URL`}
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={url}
                                        disabled={isSubmittingCourse}
                                        onChange={(event) => setf_data((current) => ({
                                            ...current,
                                            course_videos: current.course_videos.map((currentUrl, currentIndex) =>
                                                currentIndex === index ? event.target.value : currentUrl
                                            )
                                        }))}
                                    />
                                    <button
                                        className="catalog-video-remove"
                                        type="button"
                                        aria-label={`Remove course video ${index + 1}`}
                                        disabled={isSubmittingCourse}
                                        onClick={() => setf_data((current) => ({
                                            ...current,
                                            course_videos: current.course_videos.filter((_, currentIndex) => currentIndex !== index)
                                        }))}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                className="catalog-video-add"
                                type="button"
                                disabled={isSubmittingCourse}
                                onClick={() => setf_data((current) => ({ ...current, course_videos: [...current.course_videos, ''] }))}
                            >
                                Add course video
                            </button>
                        </div>
                        <div className="catalog-video-fields">
                            <strong>Upload video files</strong>
                            <p>Select MP4, WebM, OGG, MOV, or M4V files. Selected files upload when you save the course; maximum 1 GB per file.</p>
                            <input
                                type="file"
                                accept=".mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
                                multiple
                                aria-label="Select course video files"
                                onChange={handleVideoFileSelection}
                                disabled={isSubmittingCourse}
                            />
                            {selectedVideoFiles.map((file, index) => (
                                <div className="catalog-uploaded-video" key={`${file.name}-${file.lastModified}-${index}`}>
                                    <span>{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    <button
                                        className="catalog-video-remove"
                                        type="button"
                                        aria-label={`Remove selected file ${file.name}`}
                                        onClick={() => setSelectedVideoFiles((current) => current.filter((selectedFile) => selectedFile !== file))}
                                        disabled={isSubmittingCourse}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {uploadedVideoFiles.map((video) => (
                                <div className="catalog-uploaded-video" key={video._id}>
                                    <span>{video.title} · {(video.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    <button
                                        className="catalog-video-remove"
                                        type="button"
                                        aria-label={`Delete uploaded video ${video.title}`}
                                        onClick={() => removeUploadedVideo(video._id)}
                                        disabled={isSubmittingCourse}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {videoUploadStatus && <p role="status">{videoUploadStatus}</p>}
                        </div>
                    </div>
                    <div className="course-editor-actions">
                        <button type="submit" disabled={isSubmittingCourse}>
                            {isSubmittingCourse ? videoUploadStatus || 'Saving…' : editingid ? 'Save changes' : 'Add course'}
                        </button>
                        <button type="button" onClick={handleCancel} disabled={isSubmittingCourse}>Cancel</button>
                    </div>
                </form>
            )}

            {error && <p className="course-management-message course-management-error" role="alert">{error}</p>}
            {notice && <p className="course-management-message course-management-success" role="status">{notice}</p>}

            <section className="catalog-grid" id="courses" aria-label="Courses">
                {visibleCourses.length === 0
                    ? <p className="catalog-empty">{courses.length === 0 ? 'No courses found.' : 'No courses match your search.'}</p>
                    : visibleCourses.map((item) => (
                    <article className="catalog-card" key={item._id || item.course_id}>
                        <Link className="catalog-card-image-link" to={`/courses/${encodeURIComponent(item._id)}`} aria-label={`View ${item.course_name}`}>
                            {item.course_img
                                ? <img className="catalog-card-image" src={item.course_img} alt={`${item.course_name} course`} />
                                : <div className="catalog-card-image-placeholder" aria-hidden="true"><AutoStories /></div>}
                        </Link>
                        <div className="catalog-card-content">
                            <p className="catalog-card-eyebrow">Course {item.course_id} · {item.course_duration}</p>
                            <h2><Link className="catalog-card-title-link" to={`/courses/${encodeURIComponent(item._id)}`}>{item.course_name}</Link></h2>
                            {(item.course_class || item.course_subject) && (
                                <p className="catalog-card-eyebrow">
                                    {item.course_class}{item.course_class && item.course_subject ? ' · ' : ''}{item.course_subject}
                                </p>
                            )}
                            <p className="catalog-card-description">{item.course_description}</p>
                            <p className="catalog-card-fee">
                                {Number(item.course_fee ?? 0) > 0
                                    ? `Course fee: ₹${Number(item.course_fee).toLocaleString('en-IN')}`
                                    : 'Free course'}
                            </p>
                            <div className="catalog-card-actions">
                                <Link className="catalog-detail-link" to={`/courses/${encodeURIComponent(item._id)}`}>View course</Link>
                                {user?.role === 'student' && (
                                    enrolledCourseIds.includes(item._id) ? (
                                        <button type="button" disabled>Enrolled</button>
                                    ) : pendingCourseIds.includes(item._id) ? (
                                        <button type="button" disabled>Payment pending verification</button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleEnrollment(item)}
                                        >
                                            {Number(item.course_fee ?? 0) > 0 ? 'Pay and enroll' : 'Enroll in free course'}
                                        </button>
                                    )
                                )}
                                {!user && <Link className="course-sign-in-link" to="/login">Sign in to enroll</Link>}
                                {user?.role === 'admin' && <>
                                    <button type="button" aria-label={`Edit ${item.course_name}`} onClick={() => handleEditClick(item)} disabled={isSubmittingCourse}><Edit /> Edit</button>
                                    <button className="course-delete-button" type="button" aria-label={`Delete ${item.course_name}`} onClick={() => handledelete(item._id)} disabled={isSubmittingCourse}><Delete /> Delete</button>
                                </>}
                            </div>
                            {user?.role === 'student' && pendingCourseIds.includes(item._id) && (
                                <button className="course-payment-status-refresh" type="button" onClick={() => refreshEnrollments().catch((err) => setError(err.message))}>
                                    Check enrollment status
                                </button>
                            )}
                            {user?.role === 'student' && selectedCourse?._id === item._id && (
                                <div className="course-payment-panel">
                                    <h3>Pay ₹{Number(item.course_fee).toLocaleString('en-IN')} for {item.course_name}</h3>
                                    <p>Scan the QR code or open your UPI app. Your enrollment will be enabled after an administrator verifies your payment.</p>
                                    {paymentQr?.intent === paymentIntent && (
                                        <div className="course-payment-qr">
                                            <img src={paymentQr.image} alt={`UPI payment QR for ${item.course_name}`} />
                                        </div>
                                    )}
                                    {paymentIntent && <a className="course-payment-upi-link" href={paymentIntent}>Open UPI app</a>}
                                    <form className="course-payment-form" onSubmit={submitCoursePayment}>
                                        <label>
                                            UPI transaction reference (UTR)
                                            <input
                                                type="text"
                                                value={paymentUtr}
                                                onChange={(event) => setPaymentUtr(event.target.value)}
                                                minLength="6"
                                                maxLength="80"
                                                pattern="[A-Za-z0-9/-]{6,80}"
                                                autoComplete="off"
                                                required
                                            />
                                        </label>
                                        <p>Only submit after the UPI app confirms the transfer. Payment is not automatically verified.</p>
                                        <button type="submit" disabled={isSubmittingPayment || !paymentIntent}>
                                            {isSubmittingPayment ? 'Submitting…' : 'Submit payment for verification'}
                                        </button>
                                        <button type="button" onClick={() => setSelectedCourse(null)} disabled={isSubmittingPayment}>Cancel</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </article>
                    ))}
            </section>
        </main>
    )
}

export default Course_form