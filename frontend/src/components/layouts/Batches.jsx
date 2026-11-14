import { AddCircle, Edit, Delete, Groups } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../auth-context.js';
import { apiRequest } from '../api.js';
import { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES, uploadVideoFile } from '../fileUploads.js';
import './CatalogCards.css';
import './Courses.css';
import './Batches.css';

const EMPTY_BATCH = {
    batch_img: '',
    batch_id: '',
    batch_name: '',
    batch_duration: '',
    batch_language: '',
    batch_teacher: '',
    batch_fee: '0',
    batch_videos: [],
    batch_live_class_url: ''
};

const Batches = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [form, setform] = useState({ ...EMPTY_BATCH });
    const [uploadedVideoFiles, setUploadedVideoFiles] = useState([]);
    const [selectedVideoFiles, setSelectedVideoFiles] = useState([]);
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
    const [videoUploadStatus, setVideoUploadStatus] = useState('');
    const [showform, setshowform] = useState(user?.role === 'admin' && searchParams.get('action') === 'add');
    const [error, setError] = useState('');
    const [editingid, seteditingid] = useState(null);
    const [batch, setbatch]= useState([]);
    const [enrolledBatchIds, setEnrolledBatchIds] = useState([]);
    const [pendingBatchIds, setPendingBatchIds] = useState([]);
    const [notice, setNotice] = useState('');
    const [upi, setUpi] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [paymentUtr, setPaymentUtr] = useState('');
    const [paymentQr, setPaymentQr] = useState(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const paymentIntent = selectedBatch && upi?.enabled
        ? `upi://pay?${new URLSearchParams({
            pa: upi.vpa,
            pn: upi.merchantName,
            am: Number(selectedBatch.batch_fee ?? 0).toFixed(2),
            cu: 'INR',
            tn: `Batch ${selectedBatch.batch_id}`
        }).toString()}`
        : '';

    useEffect(() => {
        apiRequest('/allbatches')
            .then(setbatch)
            .catch((err) => setError(err.message));
    },[]);

    useEffect(() => {
        if (user?.role !== 'student') return;
        apiRequest('/enrollments/mine')
            .then((result) => {
                setEnrolledBatchIds(result.batches.map((item) => item._id));
                setPendingBatchIds(result.pendingBatches.map((payment) => String(payment.itemId)));
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
                if (isMounted) setError(qrError.message || 'Could not create the batch payment QR code.');
            });
        return () => {
            isMounted = false;
        };
    }, [paymentIntent]);

    async function refreshEnrollments() {
        const result = await apiRequest('/enrollments/mine');
        setEnrolledBatchIds(result.batches.map((item) => item._id));
        setPendingBatchIds(result.pendingBatches.map((payment) => String(payment.itemId)));
    }


    function handleAddClick(){
        setshowform(true);
        setError('');
        seteditingid(null);
        setform({ ...EMPTY_BATCH });
        setUploadedVideoFiles([]);
        setSelectedVideoFiles([]);
    }

    async function handleedit(b){
        setError('');
        try {
            const content = await apiRequest(`/allbatches/${b._id}/content`);
            setUploadedVideoFiles(content.batch_video_files || []);
            setSelectedVideoFiles([]);
            setform({
                batch_img: b.batch_img,
                batch_id: b.batch_id,
                batch_name: b.batch_name,
                batch_duration: b.batch_duration,
                batch_language: b.batch_language,
                batch_teacher: b.batch_teacher,
                batch_fee: b.batch_fee ?? 0,
                batch_videos: content.batch_videos || [],
                batch_live_class_url: content.batch_live_class_url || ''
            });
            setshowform(true);
            seteditingid(b._id);
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleSubmit(event){
        event.preventDefault();
        setError('');
        setIsSubmittingBatch(true);
        try{
            const batchData = {
                ...form,
                batch_videos: form.batch_videos.map((url) => url.trim()).filter(Boolean)
            };
            let batchId = editingid;
            if (batchId) {
                await apiRequest(`/allbatches/${batchId}`, {
                    method: 'PUT',
                    body: JSON.stringify(batchData)
                });
            } else {
                const createdBatch = await apiRequest('/allbatches', {
                    method: 'POST',
                    body: JSON.stringify(batchData)
                });
                batchId = createdBatch._id;
                seteditingid(batchId);
            }

            for (let index = 0; index < selectedVideoFiles.length; index += 1) {
                const file = selectedVideoFiles[index];
                setVideoUploadStatus(`Uploading video ${index + 1} of ${selectedVideoFiles.length}…`);
                const uploadedVideo = await uploadVideoFile('batch', batchId, file);
                setUploadedVideoFiles((current) => [...current, uploadedVideo]);
                setSelectedVideoFiles((current) => current.filter((selectedFile) => selectedFile !== file));
            }

            setbatch(await apiRequest('/allbatches'));
            setform({ ...EMPTY_BATCH });
            setUploadedVideoFiles([]);
            setSelectedVideoFiles([]);
            seteditingid(null);
            setshowform(false);
        } catch(err){
            setError(err.message);
        } finally {
            setIsSubmittingBatch(false);
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
            await apiRequest(`/allbatches/${editingid}/videos/${videoId}`, { method: 'DELETE' });
            setUploadedVideoFiles((current) => current.filter((video) => video._id !== videoId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function handledelete (bid){
        if(!window.confirm ('Are you sure you want to delete this batch?')){
            return;
        }
        setError('');
        try{
            await apiRequest(`/allbatches/${bid}`, { method: 'DELETE' });
            setbatch(await apiRequest('/allbatches'));

        } catch(err){
            setError(err.message);
        }
    }

    async function handleEnrollment(item) {
        setError('');
        setNotice('');
        const fee = Number(item.batch_fee ?? 0);
        if (!Number.isFinite(fee) || fee < 0) {
            setError('The batch fee is invalid. Please contact the administrator.');
            return;
        }
        if (fee > 0) {
            if (!upi?.enabled) {
                setError('UPI payments are not configured. Please contact the administrator.');
                return;
            }
            setSelectedBatch(item);
            setPaymentUtr('');
            return;
        }
        try {
            await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ type: 'batch', id: item._id })
            });
            setEnrolledBatchIds((current) => [...current, item._id]);
            setNotice(`You’re enrolled in ${item.batch_name}.`);
        } catch (err) {
            setError(err.message);
        }
    }

    async function submitBatchPayment(event) {
        event.preventDefault();
        if (!selectedBatch) return;

        setError('');
        setNotice('');
        setIsSubmittingPayment(true);
        try {
            const result = await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'batch',
                    id: selectedBatch._id,
                    amount: selectedBatch.batch_fee,
                    utr: paymentUtr
                })
            });
            setPendingBatchIds((current) => [...new Set([...current, selectedBatch._id])]);
            setNotice(result.message);
            setSelectedBatch(null);
            setPaymentUtr('');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmittingPayment(false);
        }
    }

    function handleCancel(){
        setform({ ...EMPTY_BATCH });
        setUploadedVideoFiles([]);
        setSelectedVideoFiles([]);
        setVideoUploadStatus('');
        setshowform(false);
        seteditingid(null);
        setError('');
    }

    return (
        <main className="batch-management-page">
            <nav className="batch-management-nav" aria-label="Batch page navigation">
                <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/student' : '/'}>Back to {user?.role === 'admin' ? 'admin panel' : user?.role === 'student' ? 'student panel' : 'home'}</Link>
                {user?.role === 'admin' && (
                    <button type="button" onClick={handleAddClick} disabled={isSubmittingBatch}><AddCircle /> Add batch</button>
                )}
            </nav>

            <header className="batch-management-header">
                <span className="batch-management-header-icon"><Groups /></span>
                <div>
                    <p>{user?.role === 'admin' ? 'ADMIN MANAGEMENT' : 'FIND YOUR LEARNING GROUP'}</p>
                    <h1>{user?.role === 'admin' ? 'Manage batches' : 'Explore batches'}</h1>
                    <small>{user?.role === 'admin' ? 'Add, update, and remove tutoring batches.' : 'Find a batch that fits your learning goals.'}</small>
                </div>
            </header>

            {showform && user?.role === 'admin' && (
                <form className="batch-editor" onSubmit={handleSubmit}>
                    <h2>{editingid ? 'Edit batch' : 'Add batch details'}</h2>
                    <div className="batch-editor-grid">
                        <label htmlFor="batch_id">Batch ID
                            <input type="number" id="batch_id" name="batch_id" placeholder="Enter batch ID" value={form.batch_id} onChange={(event) => setform((current) => ({ ...current, batch_id: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_name">Batch name
                            <input type="text" id="batch_name" name="batch_name" placeholder="Enter batch name" value={form.batch_name} onChange={(event) => setform((current) => ({ ...current, batch_name: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_duration">Duration
                            <input type="text" id="batch_duration" name="batch_duration" placeholder="e.g. 10 hours" value={form.batch_duration} onChange={(event) => setform((current) => ({ ...current, batch_duration: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_language">Language
                            <input type="text" id="batch_language" name="batch_language" placeholder="Teaching language" value={form.batch_language} onChange={(event) => setform((current) => ({ ...current, batch_language: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_teacher">Teacher
                            <input type="text" id="batch_teacher" name="batch_teacher" placeholder="Teacher name" value={form.batch_teacher} onChange={(event) => setform((current) => ({ ...current, batch_teacher: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_fee">Batch fee (₹)
                            <input type="number" id="batch_fee" name="batch_fee" min="0" step="0.01" value={form.batch_fee} onChange={(event) => setform((current) => ({ ...current, batch_fee: event.target.value }))} required />
                        </label>
                        <label htmlFor="batch_img">Banner image URL
                            <input type="url" id="batch_img" name="batch_img" placeholder="https://..." value={form.batch_img} onChange={(event) => setform((current) => ({ ...current, batch_img: event.target.value }))} required />
                        </label>
                        <div className="catalog-video-fields">
                            <strong>Batch videos</strong>
                            <p>Add a YouTube or direct video URL for each lesson.</p>
                            {form.batch_videos.map((url, index) => (
                                <div className="catalog-video-row" key={`${editingid || 'new-batch'}-${index}`}>
                                    <input
                                        type="url"
                                        aria-label={`Batch video ${index + 1} URL`}
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={url}
                                        disabled={isSubmittingBatch}
                                        onChange={(event) => setform((current) => ({
                                            ...current,
                                            batch_videos: current.batch_videos.map((currentUrl, currentIndex) =>
                                                currentIndex === index ? event.target.value : currentUrl
                                            )
                                        }))}
                                    />
                                    <button
                                        className="catalog-video-remove"
                                        type="button"
                                        aria-label={`Remove batch video ${index + 1}`}
                                        disabled={isSubmittingBatch}
                                        onClick={() => setform((current) => ({
                                            ...current,
                                            batch_videos: current.batch_videos.filter((_, currentIndex) => currentIndex !== index)
                                        }))}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                className="catalog-video-add"
                                type="button"
                                disabled={isSubmittingBatch}
                                onClick={() => setform((current) => ({ ...current, batch_videos: [...current.batch_videos, ''] }))}
                            >
                                Add batch video
                            </button>
                        </div>
                        <label htmlFor="batch_live_class_url">Live class join link
                            <input
                                type="url"
                                id="batch_live_class_url"
                                name="batch_live_class_url"
                                placeholder="https://meet.google.com/..."
                                value={form.batch_live_class_url}
                                onChange={(event) => setform((current) => ({ ...current, batch_live_class_url: event.target.value }))}
                            />
                        </label>
                        <div className="catalog-video-fields">
                            <strong>Upload video files</strong>
                            <p>Select MP4, WebM, OGG, MOV, or M4V files. Selected files upload when you save the batch; maximum 1 GB per file.</p>
                            <input
                                type="file"
                                accept=".mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
                                multiple
                                aria-label="Select batch video files"
                                onChange={handleVideoFileSelection}
                                disabled={isSubmittingBatch}
                            />
                            {selectedVideoFiles.map((file, index) => (
                                <div className="catalog-uploaded-video" key={`${file.name}-${file.lastModified}-${index}`}>
                                    <span>{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    <button
                                        className="catalog-video-remove"
                                        type="button"
                                        aria-label={`Remove selected file ${file.name}`}
                                        onClick={() => setSelectedVideoFiles((current) => current.filter((selectedFile) => selectedFile !== file))}
                                        disabled={isSubmittingBatch}
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
                                        disabled={isSubmittingBatch}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {videoUploadStatus && <p role="status">{videoUploadStatus}</p>}
                        </div>
                    </div>
                    <div className="batch-editor-actions">
                        <button type="submit" disabled={isSubmittingBatch}>
                            {isSubmittingBatch ? videoUploadStatus || 'Saving…' : editingid ? 'Save changes' : 'Add batch'}
                        </button>
                        <button type="button" onClick={handleCancel} disabled={isSubmittingBatch}>Cancel</button>
                    </div>
                </form>
            )}

            {error && <p className="batch-management-message batch-management-error" role="alert">{error}</p>}
            {notice && <p className="batch-management-message batch-management-success" role="status">{notice}</p>}
            <section className="catalog-grid" id="batches" aria-label="Batches">
                {batch.length === 0 ? <p className="catalog-empty">No batches found.</p> : batch.map((item) => (
                    <article className="catalog-card" key={item._id || item.batch_id}>
                        <Link className="catalog-card-image-link" to={`/batches/${encodeURIComponent(item._id)}`} aria-label={`View ${item.batch_name}`}>
                            {item.batch_img
                                ? <img className="catalog-card-image" src={item.batch_img} alt="" />
                                : <div className="catalog-card-image-placeholder" aria-hidden="true"><Groups /></div>}
                        </Link>
                        <div className="catalog-card-content">
                            <p className="catalog-card-eyebrow">Batch {item.batch_id}</p>
                            <h2><Link className="catalog-card-title-link" to={`/batches/${encodeURIComponent(item._id)}`}>{item.batch_name}</Link></h2>
                            <dl className="catalog-card-details">
                                <div><dt>Duration</dt><dd>{item.batch_duration}</dd></div>
                                <div><dt>Language</dt><dd>{item.batch_language}</dd></div>
                                <div><dt>Teacher</dt><dd>{item.batch_teacher}</dd></div>
                            </dl>
                            <p className="catalog-card-fee">
                                {Number(item.batch_fee ?? 0) > 0
                                    ? `Batch fee: ₹${Number(item.batch_fee).toLocaleString('en-IN')}`
                                    : 'Free batch'}
                            </p>
                            <div className="catalog-card-actions">
                                <Link className="catalog-detail-link" to={`/batches/${encodeURIComponent(item._id)}`}>View batch</Link>
                                {user?.role === 'student' && (
                                    enrolledBatchIds.includes(item._id) ? (
                                        <button type="button" disabled>Enrolled</button>
                                    ) : pendingBatchIds.includes(item._id) ? (
                                        <button type="button" disabled>Payment pending verification</button>
                                    ) : (
                                        <button type="button" onClick={() => handleEnrollment(item)}>
                                            {Number(item.batch_fee ?? 0) > 0 ? 'Pay and enroll' : 'Enroll in free batch'}
                                        </button>
                                    )
                                )}
                                {!user && <Link to="/login">Sign in to enroll</Link>}
                                {user?.role === 'admin' && <>
                                    <button type="button" onClick={() => handleedit(item)} disabled={isSubmittingBatch}><Edit /> Edit</button>
                                    <button className="batch-delete-button" type="button" onClick={() => handledelete(item._id)} disabled={isSubmittingBatch}><Delete /> Delete</button>
                                </>}
                            </div>
                            {user?.role === 'student' && pendingBatchIds.includes(item._id) && (
                                <button className="course-payment-status-refresh" type="button" onClick={() => refreshEnrollments().catch((err) => setError(err.message))}>
                                    Check enrollment status
                                </button>
                            )}
                            {user?.role === 'student' && selectedBatch?._id === item._id && (
                                <div className="course-payment-panel">
                                    <h3>Pay ₹{Number(item.batch_fee).toLocaleString('en-IN')} for {item.batch_name}</h3>
                                    <p>Scan the QR code or open your UPI app. Your enrollment will be enabled after an administrator verifies your payment.</p>
                                    {paymentQr?.intent === paymentIntent && (
                                        <div className="course-payment-qr">
                                            <img src={paymentQr.image} alt={`UPI payment QR for ${item.batch_name}`} />
                                        </div>
                                    )}
                                    {paymentIntent && <a className="course-payment-upi-link" href={paymentIntent}>Open UPI app</a>}
                                    <form className="course-payment-form" onSubmit={submitBatchPayment}>
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
                                        <button type="button" onClick={() => setSelectedBatch(null)} disabled={isSubmittingPayment}>Cancel</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}


export default Batches
// export { Batch_add, Batch_edit, Batch_delete }