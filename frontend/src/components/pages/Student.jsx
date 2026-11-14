import { useEffect, useState } from 'react';
import { AccountBalanceWallet, AutoStories, School, WavingHand } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import ThemeToggle from '../ThemeToggle.jsx';
import { apiRequest } from '../api.js';
import Notes from '../layouts/Notes.jsx';
import './Dashboard.css';
import './Student.css';

const Student = () => {
    const [enrollments, setEnrollments] = useState({
        courses: [],
        batches: [],
        pendingCourses: [],
        pendingBatches: []
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [tuitionRequest, setTuitionRequest] = useState(null);
    const [tuitionRequestError, setTuitionRequestError] = useState('');
    const [isLoadingTuitionRequest, setIsLoadingTuitionRequest] = useState(true);
    const [studentFee, setStudentFee] = useState(null);
    const [upi, setUpi] = useState(null);
    const [feeLoading, setFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');
    const [feeNotice, setFeeNotice] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [transactionReference, setTransactionReference] = useState('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentQr, setPaymentQr] = useState(null);
    const [selectedTuitionCourse, setSelectedTuitionCourse] = useState(null);
    const [tuitionPaymentUtr, setTuitionPaymentUtr] = useState('');
    const [tuitionPaymentQr, setTuitionPaymentQr] = useState(null);
    const [isSubmittingTuitionPayment, setIsSubmittingTuitionPayment] = useState(false);
    const [isRefreshingTuitionAccess, setIsRefreshingTuitionAccess] = useState(false);
    const [tuitionPaymentError, setTuitionPaymentError] = useState('');
    const [tuitionPaymentNotice, setTuitionPaymentNotice] = useState('');

    const remaining = studentFee?.remaining ?? 0;
    const pendingAmount = studentFee?.payments
        ?.filter((payment) => payment.status === 'pending')
        .reduce((total, payment) => total + payment.amount, 0) ?? 0;
    const availableToPay = Math.max(0, remaining - pendingAmount);
    const amountNumber = Number(paymentAmount);
    const canGeneratePayment = Boolean(upi?.enabled && Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= availableToPay);
    const upiIntent = canGeneratePayment
        ? `upi://pay?${new URLSearchParams({
            pa: upi.vpa,
            pn: upi.merchantName,
            am: amountNumber.toFixed(2),
            cu: 'INR',
            tn: 'Garvit Classes fee payment'
        }).toString()}`
        : '';
    const tuitionUpiIntent = selectedTuitionCourse && upi?.enabled
        ? `upi://pay?${new URLSearchParams({
            pa: upi.vpa,
            pn: upi.merchantName,
            am: Number(selectedTuitionCourse.course_fee).toFixed(2),
            cu: 'INR',
            tn: `Course ${selectedTuitionCourse.course_id}`
        }).toString()}`
        : '';

    useEffect(() => {
        apiRequest('/enrollments/mine')
            .then(setEnrollments)
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/students/tuition-request/mine')
            .then((result) => {
                if (isMounted) setTuitionRequest(result);
            })
            .catch((requestError) => {
                if (isMounted) setTuitionRequestError(requestError.message);
            })
            .finally(() => {
                if (isMounted) setIsLoadingTuitionRequest(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/students/fees/mine')
            .then((result) => {
                if (!isMounted) return;
                setStudentFee(result.fee);
                setUpi(result.upi);
                if (result.fee && result.fee.remaining > 0) {
                    const pendingTotal = result.fee.payments
                        .filter((payment) => payment.status === 'pending')
                        .reduce((total, payment) => total + payment.amount, 0);
                    setPaymentAmount(String(Math.max(0, result.fee.remaining - pendingTotal)));
                }
            })
            .catch((requestError) => {
                if (isMounted) setFeeError(requestError.message);
            })
            .finally(() => {
                if (isMounted) setFeeLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (!upiIntent) return () => {
            isMounted = false;
        };
        QRCode.toDataURL(upiIntent, { width: 220, margin: 2 })
            .then((image) => {
                if (isMounted) setPaymentQr({ intent: upiIntent, image });
            })
            .catch((qrError) => {
                if (isMounted) setFeeError(qrError.message || 'Could not create the UPI QR code.');
            });
        return () => {
            isMounted = false;
        };
    }, [upiIntent]);

    useEffect(() => {
        let isMounted = true;
        if (!tuitionUpiIntent) return () => {
            isMounted = false;
        };
        QRCode.toDataURL(tuitionUpiIntent, { width: 220, margin: 2 })
            .then((image) => {
                if (isMounted) setTuitionPaymentQr({ intent: tuitionUpiIntent, image });
            })
            .catch((qrError) => {
                if (isMounted) setTuitionPaymentError(qrError.message || 'Could not create the tuition payment QR code.');
            });
        return () => {
            isMounted = false;
        };
    }, [tuitionUpiIntent]);

    async function refreshEnrollments() {
        const result = await apiRequest('/enrollments/mine');
        setEnrollments(result);
    }

    async function refreshTuitionAccess() {
        setTuitionPaymentError('');
        setError('');
        setIsRefreshingTuitionAccess(true);
        try {
            const [request, result] = await Promise.all([
                apiRequest('/students/tuition-request/mine'),
                apiRequest('/enrollments/mine')
            ]);
            setTuitionRequest(request);
            setEnrollments(result);
        } catch (requestError) {
            setError(requestError.message);
            setTuitionPaymentError(requestError.message);
        } finally {
            setIsRefreshingTuitionAccess(false);
        }
    }

    async function enrollInFreeTuitionCourse(course) {
        setTuitionPaymentError('');
        setTuitionPaymentNotice('');
        try {
            const result = await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({ type: 'course', id: course._id })
            });
            await refreshEnrollments();
            setTuitionPaymentNotice(result.message);
        } catch (requestError) {
            setTuitionPaymentError(requestError.message);
        }
    }

    async function submitTuitionPayment(event) {
        event.preventDefault();
        if (!selectedTuitionCourse) return;

        setTuitionPaymentError('');
        setTuitionPaymentNotice('');
        setIsSubmittingTuitionPayment(true);
        try {
            const result = await apiRequest('/enrollments', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'course',
                    id: selectedTuitionCourse._id,
                    amount: selectedTuitionCourse.course_fee,
                    utr: tuitionPaymentUtr
                })
            });
            await refreshEnrollments();
            setTuitionPaymentNotice(result.message);
            setSelectedTuitionCourse(null);
            setTuitionPaymentUtr('');
        } catch (requestError) {
            setTuitionPaymentError(requestError.message);
        } finally {
            setIsSubmittingTuitionPayment(false);
        }
    }

    async function submitPaymentReference(event) {
        event.preventDefault();
        setFeeError('');
        setFeeNotice('');
        setIsSubmittingPayment(true);
        try {
            const result = await apiRequest('/students/fees/payments', {
                method: 'POST',
                body: JSON.stringify({ amount: paymentAmount, utr: transactionReference })
            });
            setStudentFee(result.fee);
            setTransactionReference('');
            setFeeNotice(result.message);
        } catch (requestError) {
            setFeeError(requestError.message);
        } finally {
            setIsSubmittingPayment(false);
        }
    }

    return (
        <>
            <ThemeToggle />
            <div className="student-page">
                <header>
                    <div className="dashboard-welcome">
                        <span className="dashboard-kicker"><School /> STUDENT WORKSPACE</span>
                        <h1>Welcome back, learner <WavingHand className="welcome-wave" /></h1>
                        <p>Your courses, batches and notes are all in one place.</p>
                    </div>
                    <div className="dashboard-header-icon"><AutoStories /></div>
                </header>
                {error && <p className="student-data-error" role="alert">{error}</p>}
                <main>
                    <section className="student-courses">
                        <div className="student-section-heading">
                            <h2><span className="section-icon icon-yellow"><AutoStories /></span>My courses</h2>
                            <Link to="/allcourses">Explore courses</Link>
                        </div>
                        {loading ? <p>Loading your courses…</p> : enrollments.courses.length ? (
                            <div className="student-learning-list">
                                {enrollments.courses.map((course) => (
                                    <Link
                                        className="student-learning-card student-learning-card-link"
                                        key={course._id}
                                        to={`/courses/${encodeURIComponent(course._id)}`}
                                    >
                                        <p>COURSE {course.course_id}</p>
                                        <h3>{course.course_name}</h3>
                                        <span>{course.course_duration}</span>
                                        <span className="student-course-open">Open course and notes</span>
                                    </Link>
                                ))}
                            </div>
                        ) : <p className="student-empty">You haven’t enrolled in a course yet. Browse courses to get started.</p>}
                    </section>
                    <section className="student-batches">
                        <div className="student-section-heading">
                            <h2><span className="section-icon icon-yellow"><WavingHand /></span>My batches</h2>
                            <Link to="/allbatches">Explore batches</Link>
                        </div>
                        {loading ? <p>Loading your batches…</p> : enrollments.batches.length ? (
                            <div className="student-learning-list">
                                {enrollments.batches.map((batch) => (
                                    <article className="student-learning-card" key={batch._id}>
                                        <p>BATCH {batch.batch_id}</p>
                                        <h3>{batch.batch_name}</h3>
                                        <span>{batch.batch_duration} · {batch.batch_language} · {batch.batch_teacher}</span>
                                    </article>
                                ))}
                            </div>
                        ) : <p className="student-empty">You haven’t enrolled in a batch yet.</p>}
                    </section>
                    <section className="student-tuition-request">
                        <div className="student-section-heading">
                            <h2><span className="section-icon icon-yellow"><School /></span>My tuition request</h2>
                            <Link to="/allcourses">Explore courses</Link>
                        </div>
                        {tuitionRequestError && <p className="student-data-error" role="alert">{tuitionRequestError}</p>}
                        {isLoadingTuitionRequest ? <p>Loading your tuition request…</p> : !tuitionRequest?.courses.length ? (
                            <p className="student-empty">You haven’t requested tuition courses yet. Explore courses to get started.</p>
                        ) : (
                            <>
                                <p className="student-tuition-class">Class: {tuitionRequest.tuitionClass}</p>
                                <p className={`student-tuition-status student-tuition-status-${tuitionRequest.status || 'pending'}`}>
                                    Request status: {tuitionRequest.status || 'pending'}
                                </p>
                                <button
                                    className="student-tuition-action"
                                    type="button"
                                    onClick={refreshTuitionAccess}
                                    disabled={isRefreshingTuitionAccess}
                                >
                                    {isRefreshingTuitionAccess ? 'Refreshing…' : 'Refresh approval and access status'}
                                </button>
                                {tuitionPaymentError && <p className="student-data-error" role="alert">{tuitionPaymentError}</p>}
                                {tuitionPaymentNotice && <p className="student-payment-notice" role="status">{tuitionPaymentNotice}</p>}
                                <div className="student-learning-list">
                                    {tuitionRequest.courses.map((course) => {
                                        const isEnrolled = enrollments.courses.some((enrolledCourse) => enrolledCourse._id === course._id);
                                        const pendingPayment = (enrollments.pendingCourses ?? []).find((payment) => String(payment.itemId) === course._id);
                                        const fee = Number(course.course_fee ?? 0);
                                        const isSelectedForPayment = selectedTuitionCourse?._id === course._id;
                                        return (
                                            <article className="student-learning-card" key={course._id}>
                                                <p>COURSE {course.course_id}</p>
                                                <h3>{course.course_name}</h3>
                                                <span>{course.course_class || tuitionRequest.tuitionClass}{course.course_subject ? ` · ${course.course_subject}` : ''}</span>
                                                {loading || error ? (
                                                    <p className="student-tuition-course-status">
                                                        {loading
                                                            ? 'Checking enrollment and payment status…'
                                                            : 'Could not verify enrollment and payment status. Refresh before continuing.'}
                                                    </p>
                                                ) : tuitionRequest.status !== 'approved' ? (
                                                    <p className="student-tuition-course-status">
                                                        {tuitionRequest.status === 'rejected'
                                                            ? 'Tuition request rejected; enrollment is unavailable.'
                                                            : 'Waiting for an administrator to approve this tuition request.'}
                                                    </p>
                                                ) : isEnrolled ? (
                                                    <p className="student-tuition-course-status student-tuition-course-active">
                                                        Enrolled — this course and its notes are available.
                                                    </p>
                                                ) : pendingPayment ? (
                                                    <p className="student-tuition-course-status">
                                                        Payment of ₹{Number(pendingPayment.amount).toLocaleString('en-IN')} submitted; waiting for administrator verification.
                                                    </p>
                                                ) : fee > 0 ? (
                                                    <>
                                                        <p className="student-tuition-course-status">Tuition fee: ₹{fee.toLocaleString('en-IN')}</p>
                                                        {isSelectedForPayment ? (
                                                            <div className="student-tuition-payment">
                                                                {!upi?.enabled ? (
                                                                    <p>UPI payment is not available yet. Please contact the administrator.</p>
                                                                ) : (
                                                                    <>
                                                                        {tuitionPaymentQr?.intent === tuitionUpiIntent && (
                                                                            <div className="student-payment-qr">
                                                                                <img src={tuitionPaymentQr.image} alt={`UPI payment QR for ${course.course_name}`} />
                                                                                <span>Scan with any UPI app</span>
                                                                            </div>
                                                                        )}
                                                                        <a className="student-upi-link" href={tuitionUpiIntent}>Pay ₹{fee.toLocaleString('en-IN')} with UPI</a>
                                                                        <p className="student-payment-instructions">
                                                                            After paying, submit your UTR. Course access and notes are enabled only after an administrator verifies the payment.
                                                                        </p>
                                                                        <form className="student-payment-form" onSubmit={submitTuitionPayment}>
                                                                            <label>
                                                                                UPI transaction reference (UTR)
                                                                                <input
                                                                                    type="text"
                                                                                    value={tuitionPaymentUtr}
                                                                                    onChange={(event) => setTuitionPaymentUtr(event.target.value)}
                                                                                    minLength="6"
                                                                                    maxLength="80"
                                                                                    pattern="[A-Za-z0-9/-]{6,80}"
                                                                                    autoComplete="off"
                                                                                    required
                                                                                />
                                                                            </label>
                                                                            <button type="submit" disabled={isSubmittingTuitionPayment}>
                                                                                {isSubmittingTuitionPayment ? 'Submitting…' : 'Submit payment reference'}
                                                                            </button>
                                                                        </form>
                                                                    </>
                                                                )}
                                                                <button
                                                                    className="student-tuition-cancel"
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedTuitionCourse(null);
                                                                        setTuitionPaymentUtr('');
                                                                        setTuitionPaymentError('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="student-tuition-action"
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTuitionCourse(course);
                                                                    setTuitionPaymentUtr('');
                                                                    setTuitionPaymentError('');
                                                                }}
                                                            >
                                                                Pay tuition fee
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        className="student-tuition-action"
                                                        type="button"
                                                        onClick={() => enrollInFreeTuitionCourse(course)}
                                                    >
                                                        Enroll in free course
                                                    </button>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                                <p className="student-tuition-help">Paid courses unlock only after the administrator verifies your UPI payment. Free courses can be enrolled after approval. Enrolled courses and their notes are available in your student panel.</p>
                            </>
                        )}
                    </section>
                    <section className="student-notes">
                        <div className="student-section-heading">
                            <h2><span className="section-icon icon-yellow"><AutoStories /></span>Notes for my courses</h2>
                            <Link to="/notes">Browse notes</Link>
                        </div>
                        <Notes compact key={enrollments.courses.map((course) => course._id).join(':')} />
                    </section>
                    <section className="student-fee">
                        <h2><span className="section-icon icon-yellow"><AccountBalanceWallet /></span>Fees and UPI payment</h2>
                        {feeError && <p className="student-data-error" role="alert">{feeError}</p>}
                        {feeNotice && <p className="student-payment-notice" role="status">{feeNotice}</p>}
                        {feeLoading ? <p>Loading your fee details…</p> : !studentFee ? (
                            <p>Your course fee has not been set yet. Please contact the administrator.</p>
                        ) : (
                            <>
                                <div className="student-fee-summary">
                                    <div><span>Total fee</span><strong>₹{Number(studentFee.totalFee).toLocaleString('en-IN')}</strong></div>
                                    <div><span>Paid</span><strong>₹{Number(studentFee.paidAmount).toLocaleString('en-IN')}</strong></div>
                                    <div><span>Balance due</span><strong>₹{Number(remaining).toLocaleString('en-IN')}</strong></div>
                                </div>
                                {availableToPay > 0 && (
                                    <div className="student-upi-payment">
                                        <h3>Pay with your UPI app</h3>
                                        {!upi?.enabled ? (
                                            <p>UPI payment is not available yet. Please contact the administrator.</p>
                                        ) : (
                                            <>
                                                <label className="student-payment-amount">
                                                    Amount to pay (₹), up to ₹{Number(availableToPay).toLocaleString('en-IN')} available
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        max={availableToPay}
                                                        step="0.01"
                                                        value={paymentAmount}
                                                        onChange={(event) => setPaymentAmount(event.target.value)}
                                                    />
                                                </label>
                                                {paymentQr?.intent === upiIntent && (
                                                    <div className="student-payment-qr">
                                                        <img src={paymentQr.image} alt={`UPI payment QR for ₹${amountNumber.toFixed(2)}`} />
                                                        <span>Scan with any UPI app</span>
                                                    </div>
                                                )}
                                                {upiIntent ? (
                                                    <a className="student-upi-link" href={upiIntent}>Open UPI app</a>
                                                ) : <p className="student-payment-instructions">Enter an amount within your remaining balance to continue.</p>}
                                                <p className="student-payment-instructions">
                                                    After paying, enter the transaction reference (UTR) below. Your balance changes only after an administrator verifies the payment.
                                                </p>
                                                <form className="student-payment-form" onSubmit={submitPaymentReference}>
                                                    <label>
                                                        UPI transaction reference (UTR)
                                                        <input
                                                            type="text"
                                                            value={transactionReference}
                                                            onChange={(event) => setTransactionReference(event.target.value)}
                                                            minLength="6"
                                                            maxLength="80"
                                                            pattern="[A-Za-z0-9/-]{6,80}"
                                                            autoComplete="off"
                                                            required
                                                        />
                                                    </label>
                                                    <button type="submit" disabled={isSubmittingPayment || !canGeneratePayment}>
                                                        {isSubmittingPayment ? 'Submitting…' : 'Submit payment reference'}
                                                    </button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="student-payment-history">
                                    <h3>Payment references</h3>
                                    {studentFee.payments.length ? (
                                        <ul>
                                            {studentFee.payments.map((payment) => (
                                                <li key={payment._id}>
                                                    <span>₹{Number(payment.amount).toLocaleString('en-IN')} · {payment.utr}</span>
                                                    <strong className={`payment-status payment-status-${payment.status}`}>{payment.status}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p>No UPI payment references submitted.</p>}
                                </div>
                            </>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
};

export default Student;
