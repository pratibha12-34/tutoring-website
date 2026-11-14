import Teacher_sal from "../layouts/Teacher_salary.jsx";
import { AccountBalanceWallet, Groups, SpaceDashboard, Visibility, VisibilityOff } from '@mui/icons-material';
import ThemeToggle from '../ThemeToggle.jsx';
import { AddCircle, ArrowDropDown, Delete, Edit } from '@mui/icons-material';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';
import ForgotPasswordHelp from '../ForgotPasswordHelp.jsx';
import Enquiries from './Enquiries.jsx';
import './Dashboard.css';
import './admin.css';

const Admin = () => {
    const [students, setStudents] = useState([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [studentsError, setStudentsError] = useState('');
    const [tuitionRequests, setTuitionRequests] = useState([]);
    const [isLoadingTuitionRequests, setIsLoadingTuitionRequests] = useState(true);
    const [tuitionRequestsError, setTuitionRequestsError] = useState('');
    const [tuitionRequestsNotice, setTuitionRequestsNotice] = useState('');
    const [reviewingTuitionRequestId, setReviewingTuitionRequestId] = useState('');
    const [editingStudentId, setEditingStudentId] = useState('');
    const [feeForm, setFeeForm] = useState({ totalFee: '', paidAmount: '0' });
    const [isSavingFee, setIsSavingFee] = useState(false);
    const [feeNotice, setFeeNotice] = useState('');
    const [pendingPayments, setPendingPayments] = useState([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(true);
    const [paymentsError, setPaymentsError] = useState('');
    const [paymentsNotice, setPaymentsNotice] = useState('');
    const [reviewingPaymentId, setReviewingPaymentId] = useState('');
    const [pendingCoursePayments, setPendingCoursePayments] = useState([]);
    const [isLoadingCoursePayments, setIsLoadingCoursePayments] = useState(true);
    const [coursePaymentsError, setCoursePaymentsError] = useState('');
    const [coursePaymentsNotice, setCoursePaymentsNotice] = useState('');
    const [reviewingCoursePaymentId, setReviewingCoursePaymentId] = useState('');

    const loadStudentFees = useCallback(async () => {
        setStudentsError('');
        try {
            setStudents(await apiRequest('/students/fees'));
        } catch (error) {
            setStudentsError(error instanceof Error ? error.message : 'Could not load student fee details.');
        } finally {
            setIsLoadingStudents(false);
        }
    }, []);

    const loadTuitionRequests = useCallback(async () => {
        setTuitionRequestsError('');
        try {
            setTuitionRequests(await apiRequest('/students/tuition-requests'));
        } catch (error) {
            setTuitionRequestsError(error instanceof Error ? error.message : 'Could not load tuition requests.');
        } finally {
            setIsLoadingTuitionRequests(false);
        }
    }, []);

    const loadPendingPayments = useCallback(async () => {
        setPaymentsError('');
        try {
            setPendingPayments(await apiRequest('/students/fees/payments/pending'));
        } catch (error) {
            setPaymentsError(error instanceof Error ? error.message : 'Could not load pending payments.');
        } finally {
            setIsLoadingPayments(false);
        }
    }, []);

    const loadPendingCoursePayments = useCallback(async () => {
        setCoursePaymentsError('');
        try {
            setPendingCoursePayments(await apiRequest('/enrollments/payments/pending'));
        } catch (error) {
            setCoursePaymentsError(error instanceof Error ? error.message : 'Could not load pending course payments.');
        } finally {
            setIsLoadingCoursePayments(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/students/fees')
            .then((result) => {
                if (isMounted) setStudents(result);
            })
            .catch((error) => {
                if (isMounted) setStudentsError(error instanceof Error ? error.message : 'Could not load student fee details.');
            })
            .finally(() => {
                if (isMounted) setIsLoadingStudents(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/students/tuition-requests')
            .then((result) => {
                if (isMounted) setTuitionRequests(result);
            })
            .catch((error) => {
                if (isMounted) setTuitionRequestsError(error instanceof Error ? error.message : 'Could not load tuition requests.');
            })
            .finally(() => {
                if (isMounted) setIsLoadingTuitionRequests(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/students/fees/payments/pending')
            .then((result) => {
                if (isMounted) setPendingPayments(result);
            })
            .catch((error) => {
                if (isMounted) setPaymentsError(error instanceof Error ? error.message : 'Could not load pending payments.');
            })
            .finally(() => {
                if (isMounted) setIsLoadingPayments(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        apiRequest('/enrollments/payments/pending')
            .then((result) => {
                if (isMounted) setPendingCoursePayments(result);
            })
            .catch((error) => {
                if (isMounted) setCoursePaymentsError(error instanceof Error ? error.message : 'Could not load pending course payments.');
            })
            .finally(() => {
                if (isMounted) setIsLoadingCoursePayments(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    async function reviewPayment(paymentId, action) {
        setPaymentsError('');
        setPaymentsNotice('');
        setReviewingPaymentId(paymentId);
        try {
            const result = await apiRequest(`/students/fees/payments/${paymentId}`, {
                method: 'PATCH',
                body: JSON.stringify({ action })
            });
            setPaymentsNotice(result.message);
            await Promise.all([loadPendingPayments(), action === 'approve' ? loadStudentFees() : Promise.resolve()]);
        } catch (error) {
            setPaymentsError(error instanceof Error ? error.message : 'Could not review the payment.');
        } finally {
            setReviewingPaymentId('');
        }
    }

    async function reviewCoursePayment(paymentId, action) {
        setCoursePaymentsError('');
        setCoursePaymentsNotice('');
        setReviewingCoursePaymentId(paymentId);
        try {
            const result = await apiRequest(`/enrollments/payments/${paymentId}`, {
                method: 'PATCH',
                body: JSON.stringify({ action })
            });
            setCoursePaymentsNotice(result.message);
            await Promise.all([
                loadPendingCoursePayments(),
                action === 'approve' ? loadStudentFees() : Promise.resolve()
            ]);
        } catch (error) {
            setCoursePaymentsError(error instanceof Error ? error.message : 'Could not review the course payment.');
        } finally {
            setReviewingCoursePaymentId('');
        }
    }

    async function reviewTuitionRequest(studentId, action) {
        setTuitionRequestsError('');
        setTuitionRequestsNotice('');
        setReviewingTuitionRequestId(studentId);
        try {
            const result = await apiRequest(`/students/tuition-requests/${studentId}`, {
                method: 'PATCH',
                body: JSON.stringify({ action })
            });
            setTuitionRequestsNotice(result.message);
            await loadTuitionRequests();
        } catch (error) {
            setTuitionRequestsError(error instanceof Error ? error.message : 'Could not review the tuition request.');
        } finally {
            setReviewingTuitionRequestId('');
        }
    }

    function startFeeEdit(student) {
        setEditingStudentId(student.id);
        setFeeForm({
            totalFee: student.totalFee == null ? '' : String(student.totalFee),
            paidAmount: student.paidAmount == null ? '0' : String(student.paidAmount)
        });
        setStudentsError('');
        setFeeNotice('');
    }

    async function saveStudentFee(event, studentId) {
        event.preventDefault();
        setStudentsError('');
        setFeeNotice('');
        setIsSavingFee(true);
        try {
            const updatedStudent = await apiRequest(`/students/fees/${studentId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    totalFee: feeForm.totalFee,
                    paidAmount: feeForm.paidAmount
                })
            });
            setStudents((current) => current.map((student) => student.id === studentId ? updatedStudent : student));
            setEditingStudentId('');
            setFeeNotice(`Fee details saved for ${updatedStudent.username}.`);
        } catch (error) {
            setStudentsError(error instanceof Error ? error.message : 'Could not save student fee details.');
        } finally {
            setIsSavingFee(false);
        }
    }

    const managementActions = [
        {
            label: 'Add',
            icon: <AddCircle />,
            targets: [
                { label: 'Teacher', to: '/admin/teachers?action=add' },
                { label: 'Course', to: '/allcourses?action=add' },
                { label: 'Batch', to: '/allbatches?action=add' },
                { label: 'Note', to: '/notes?action=add' }
            ]
        },
        {
            label: 'Edit',
            icon: <Edit />,
            targets: [
                { label: 'Teacher', to: '/admin/teachers#teachers' },
                { label: 'Course', to: '/allcourses#courses' },
                { label: 'Batch', to: '/allbatches#batches' },
                { label: 'Note', to: '/notes#study-notes' }
            ]
        },
        {
            label: 'Delete',
            icon: <Delete />,
            targets: [
                { label: 'Teacher', to: '/admin/teachers#teachers' },
                { label: 'Course', to: '/allcourses#courses' },
                { label: 'Batch', to: '/allbatches#batches' },
                { label: 'Note', to: '/notes#study-notes' }
            ]
        }
    ];

    const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
    const [pinMessage, setPinMessage] = useState('');
    const [pinError, setPinError] = useState('');
    const [isChangingPin, setIsChangingPin] = useState(false);
    const [showPinForm, setShowPinForm] = useState(false);
    const [visiblePins, setVisiblePins] = useState({ currentPin: false, newPin: false, confirmPin: false });

    function togglePinVisibility(field) {
        setVisiblePins((current) => ({ ...current, [field]: !current[field] }));
    }

    async function handlePinChange(event) {
        event.preventDefault();
        setPinMessage('');
        setPinError('');

        if (pinForm.newPin !== pinForm.confirmPin) {
            setPinError('The new PINs do not match.');
            return;
        }
        if (!/^\d{8,}$/.test(pinForm.newPin)) {
            setPinError('The new PIN must contain at least 8 digits.');
            return;
        }

        setIsChangingPin(true);
        try {
            const result = await apiRequest('/login/change-pin', {
                method: 'POST',
                body: JSON.stringify({
                    currentPin: pinForm.currentPin,
                    newPin: pinForm.newPin
                })
            });
            setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
            setPinMessage(result.message || 'Admin PIN changed successfully.');
        } catch (err) {
            setPinError(err instanceof Error ? err.message : 'Could not change the admin PIN.');
        } finally {
            setIsChangingPin(false);
        }
    }



    
    return(
        <>
            
            <div className="admin-page">
                <section className="admin-toolbar-section">
                    <nav className="admin-toolbar" aria-label="Admin actions">
                        {managementActions.map((action) => (
                            <details className="admin-action-menu" key={action.label}>
                                <summary aria-label={`${action.label} management items`}>
                                    {action.icon}<span>{action.label}</span><ArrowDropDown className="admin-action-chevron" />
                                </summary>
                                <div className="admin-action-options">
                                    {action.targets.map((target) => (
                                        <Link key={target.label} to={target.to}>{target.label}</Link>
                                    ))}
                                </div>
                            </details>
                        ))}
                        <div className="admin-action-group" aria-label="Enquiry actions">
                            <span className="admin-action-label">Enquiries</span>
                            <Link className="admin-action-button" to="#enquiries" aria-label="Open enquiry inbox" title="Open enquiry inbox"><Groups /></Link>
                        </div>
                        <ThemeToggle />
                    </nav>
                </section>
            <header>
                <div className="dashboard-welcome">
                    <span className="dashboard-kicker"><SpaceDashboard /> ADMIN WORKSPACE</span>
                    <h1>Welcome to the admin panel</h1>
                    <p>Here’s a quick look at your learning community.</p>
                </div>
                
                <div className="dashboard-header-icon"><Groups /></div>
            </header>

            <main>
                <Enquiries />
                <section className="admin-student-fees">
                <div className="admin-fees-heading">
                    <h2><span className="section-icon icon-coral"><AccountBalanceWallet /></span>Students fees</h2>
                    <button className="admin-fees-refresh" type="button" onClick={loadStudentFees} disabled={isLoadingStudents}>Refresh</button>
                </div>
                <p className="admin-fees-description">Students with recorded fees or course enrollments. Payment references and their review status appear alongside each fee balance.</p>
                {studentsError && <p className="admin-fees-error" role="alert">{studentsError}</p>}
                {feeNotice && <p className="admin-fees-notice" role="status">{feeNotice}</p>}
                <div className="admin-fees-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Total fee</th>
                                <th scope="col">Paid</th>
                                <th scope="col">Balance</th>
                                <th scope="col">Payment history</th>
                                <th scope="col">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingStudents ? (
                                <tr><td colSpan="7">Loading student fee details…</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan="7">No students with fee records or course enrollments yet.</td></tr>
                            ) : students.map((student) => (
                                <tr key={student.id}>
                                    <td>{student.username}</td>
                                    <td>{student.email}</td>
                                    {editingStudentId === student.id ? (
                                        <td colSpan="4">
                                            <form className="admin-fee-edit-form" onSubmit={(event) => saveStudentFee(event, student.id)}>
                                                <label>Total fee
                                                    <input type="number" min="0" step="0.01" value={feeForm.totalFee} onChange={(event) => setFeeForm((current) => ({ ...current, totalFee: event.target.value }))} required />
                                                </label>
                                                <label>Paid
                                                    <input type="number" min="0" step="0.01" value={feeForm.paidAmount} onChange={(event) => setFeeForm((current) => ({ ...current, paidAmount: event.target.value }))} required />
                                                </label>
                                                <div className="admin-fee-edit-actions">
                                                    <button type="submit" disabled={isSavingFee}>{isSavingFee ? 'Saving…' : 'Save'}</button>
                                                    <button type="button" onClick={() => setEditingStudentId('')} disabled={isSavingFee}>Cancel</button>
                                                </div>
                                            </form>
                                        </td>
                                    ) : (
                                        <>
                                            <td>{student.totalFee == null ? 'Not set' : `₹${Number(student.totalFee).toLocaleString('en-IN')}`}</td>
                                            <td>{student.paidAmount == null ? 'Not set' : `₹${Number(student.paidAmount).toLocaleString('en-IN')}`}</td>
                                            <td>{student.remaining == null ? 'Not set' : student.remaining > 0 ? `₹${Number(student.remaining).toLocaleString('en-IN')}` : 'Paid in full'}</td>
                                            <td>
                                                {student.payments.length ? (
                                                    <ul className="admin-fee-payment-history">
                                                        {student.payments.map((payment) => (
                                                            <li key={payment.id}>
                                                                <span>₹{Number(payment.amount).toLocaleString('en-IN')} · {payment.utr}</span>
                                                                <strong className={`payment-status payment-status-${payment.status}`}>{payment.status}</strong>
                                                                <small>{new Date(payment.submittedAt).toLocaleString()}</small>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <span>No payment references</span>}
                                            </td>
                                            <td><button className="admin-fee-edit-button" type="button" onClick={() => startFeeEdit(student)}><Edit /> {student.totalFee == null ? 'Set fees' : 'Edit fees'}</button></td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </section>
                <section className="admin-student-fees admin-tuition-requests">
                    <div className="admin-fees-heading">
                        <h2><span className="section-icon icon-coral"><AccountBalanceWallet /></span>Student tuition requests</h2>
                        <button className="admin-fees-refresh" type="button" onClick={loadTuitionRequests} disabled={isLoadingTuitionRequests}>Refresh</button>
                    </div>
                    <p className="admin-fees-description">Review the class and courses each student selected during registration. Approving a request does not enroll the student or confirm payment.</p>
                    {tuitionRequestsError && <p className="admin-fees-error" role="alert">{tuitionRequestsError}</p>}
                    {tuitionRequestsNotice && <p className="admin-fees-notice" role="status">{tuitionRequestsNotice}</p>}
                    <div className="admin-fees-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Student</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Class</th>
                                    <th scope="col">Requested courses</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Requested</th>
                                    <th scope="col">Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingTuitionRequests ? (
                                    <tr><td colSpan="7">Loading tuition requests…</td></tr>
                                ) : tuitionRequests.length === 0 ? (
                                    <tr><td colSpan="7">No tuition requests have been submitted.</td></tr>
                                ) : tuitionRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td>{request.username}</td>
                                        <td>{request.email}</td>
                                        <td>{request.tuitionClass}</td>
                                        <td>{request.courses.map((course) => course.course_name).join(', ') || 'No available courses'}</td>
                                        <td><strong className={`payment-status payment-status-${request.status}`}>{request.status}</strong></td>
                                        <td>{new Date(request.createdAt).toLocaleString()}</td>
                                        <td>
                                            {request.status === 'pending' ? (
                                                <div className="admin-payment-review-actions">
                                                    <button type="button" onClick={() => reviewTuitionRequest(request.id, 'approve')} disabled={Boolean(reviewingTuitionRequestId)}>{reviewingTuitionRequestId === request.id ? 'Saving…' : 'Approve'}</button>
                                                    <button type="button" onClick={() => reviewTuitionRequest(request.id, 'reject')} disabled={Boolean(reviewingTuitionRequestId)}>Reject</button>
                                                </div>
                                            ) : request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
                <section className="admin-student-fees admin-pending-payments">
                    <div className="admin-fees-heading">
                        <h2><span className="section-icon icon-coral"><AccountBalanceWallet /></span>Student tuition fees</h2>
                        <button className="admin-fees-refresh" type="button" onClick={loadPendingPayments} disabled={isLoadingPayments}>Refresh</button>
                    </div>
                    <p className="admin-fees-description">Verify each UTR against your UPI account before approving. Student balances are updated only when you approve a reference.</p>
                    {paymentsError && <p className="admin-fees-error" role="alert">{paymentsError}</p>}
                    {paymentsNotice && <p className="admin-fees-notice" role="status">{paymentsNotice}</p>}
                    <div className="admin-fees-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Student</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Amount</th>
                                    <th scope="col">UTR</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingPayments ? (
                                    <tr><td colSpan="6">Loading payment references…</td></tr>
                                ) : pendingPayments.length === 0 ? (
                                    <tr><td colSpan="6">No payment references are waiting for review.</td></tr>
                                ) : pendingPayments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{payment.username}</td>
                                        <td>{payment.email}</td>
                                        <td>₹{Number(payment.amount).toLocaleString('en-IN')}</td>
                                        <td>{payment.utr}</td>
                                        <td>{new Date(payment.submittedAt).toLocaleString()}</td>
                                        <td>
                                            <div className="admin-payment-review-actions">
                                                <button type="button" onClick={() => reviewPayment(payment.id, 'approve')} disabled={Boolean(reviewingPaymentId)}>{reviewingPaymentId === payment.id ? 'Saving…' : 'Approve'}</button>
                                                <button type="button" onClick={() => reviewPayment(payment.id, 'reject')} disabled={Boolean(reviewingPaymentId)}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
                <section className="admin-student-fees admin-pending-payments">
                    <div className="admin-fees-heading">
                        <h2><span className="section-icon icon-coral"><AccountBalanceWallet /></span>Course and batch payments awaiting verification</h2>
                        <button className="admin-fees-refresh" type="button" onClick={loadPendingCoursePayments} disabled={isLoadingCoursePayments}>Refresh</button>
                    </div>
                    <p className="admin-fees-description">Check the UTR in your UPI account before approving. Students become enrolled only after you approve the course or batch payment.</p>
                    {coursePaymentsError && <p className="admin-fees-error" role="alert">{coursePaymentsError}</p>}
                    {coursePaymentsNotice && <p className="admin-fees-notice" role="status">{coursePaymentsNotice}</p>}
                    <div className="admin-fees-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Student</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Item</th>
                                    <th scope="col">Amount</th>
                                    <th scope="col">UTR</th>
                                    <th scope="col">Submitted</th>
                                    <th scope="col">Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingCoursePayments ? (
                                    <tr><td colSpan="7">Loading course payment references…</td></tr>
                                ) : pendingCoursePayments.length === 0 ? (
                                    <tr><td colSpan="7">No course payments are waiting for review.</td></tr>
                                ) : pendingCoursePayments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{payment.username}</td>
                                        <td>{payment.email}</td>
                                        <td>{payment.itemType === 'batch' ? 'Batch' : 'Course'}: {payment.itemName}</td>
                                        <td>₹{Number(payment.amount).toLocaleString('en-IN')}</td>
                                        <td>{payment.utr}</td>
                                        <td>{new Date(payment.submittedAt).toLocaleString()}</td>
                                        <td>
                                            <div className="admin-payment-review-actions">
                                                <button type="button" onClick={() => reviewCoursePayment(payment.id, 'approve')} disabled={Boolean(reviewingCoursePaymentId)}>{reviewingCoursePaymentId === payment.id ? 'Saving…' : 'Approve'}</button>
                                                <button type="button" onClick={() => reviewCoursePayment(payment.id, 'reject')} disabled={Boolean(reviewingCoursePaymentId)}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2><span className="section-icon icon-blue"><Groups /></span>Teachers salary</h2>
                    <Teacher_sal/>
                </section>            
                <section className="admin-pin-settings">
                    <h2><span className="section-icon icon-purple"><AccountBalanceWallet /></span>Change admin PIN</h2>
                    <button className="admin-pin-toggle-button" type="button" aria-expanded={showPinForm} onClick={() => setShowPinForm((visible) => !visible)}>
                        {showPinForm ? 'Cancel PIN change' : 'Change PIN'}
                    </button>
                    {showPinForm && (
                    <form onSubmit={handlePinChange}>
                        <label>
                            Current admin PIN
                            <span className="admin-pin-help">Use the PIN you use to sign in as admin, not the registration code.</span>
                            <span className="admin-pin-input-wrap">
                                <input type={visiblePins.currentPin ? 'text' : 'password'} inputMode="numeric" autoComplete="current-password" value={pinForm.currentPin} onChange={(event) => setPinForm((current) => ({ ...current, currentPin: event.target.value }))} required />
                                <button className="admin-pin-visibility-toggle" type="button" aria-label={visiblePins.currentPin ? 'Hide current PIN' : 'Show current PIN'} aria-pressed={visiblePins.currentPin} onClick={() => togglePinVisibility('currentPin')}>
                                    {visiblePins.currentPin ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </span>
                        </label>
                        <label>
                            New PIN (at least 8 digits)
                            <span className="admin-pin-input-wrap">
                                <input type={visiblePins.newPin ? 'text' : 'password'} inputMode="numeric" autoComplete="new-password" pattern="[0-9]{8,}" value={pinForm.newPin} onChange={(event) => setPinForm((current) => ({ ...current, newPin: event.target.value }))} required />
                                <button className="admin-pin-visibility-toggle" type="button" aria-label={visiblePins.newPin ? 'Hide new PIN' : 'Show new PIN'} aria-pressed={visiblePins.newPin} onClick={() => togglePinVisibility('newPin')}>
                                    {visiblePins.newPin ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </span>
                        </label>
                        <label>
                            Confirm new PIN
                            <span className="admin-pin-input-wrap">
                                <input type={visiblePins.confirmPin ? 'text' : 'password'} inputMode="numeric" autoComplete="new-password" pattern="[0-9]{8,}" value={pinForm.confirmPin} onChange={(event) => setPinForm((current) => ({ ...current, confirmPin: event.target.value }))} required />
                                <button className="admin-pin-visibility-toggle" type="button" aria-label={visiblePins.confirmPin ? 'Hide confirmation PIN' : 'Show confirmation PIN'} aria-pressed={visiblePins.confirmPin} onClick={() => togglePinVisibility('confirmPin')}>
                                    {visiblePins.confirmPin ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </span>
                        </label>
                        <ForgotPasswordHelp label="Forgot your PIN?" credential="admin PIN" />
                        <button type="submit" disabled={isChangingPin}>
                            {isChangingPin ? 'Changing PIN…' : 'Change PIN'}
                        </button>
                    </form>
                    )}
                    {pinError && <p role="alert">{pinError}</p>}
                    {pinMessage && <p role="status">{pinMessage}</p>}
                </section>
            </main>
        </div>
        </>
        
    )
}

export default Admin


// $env:ADMIN_LOGIN_PASSWORD = '84629173'
// $env:ADMIN_REGISTRATION_CODE = 'admin'