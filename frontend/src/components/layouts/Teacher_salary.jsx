import { Fragment, useEffect, useState } from 'react';
import { AccountBalanceWallet } from '@mui/icons-material';
import QRCode from 'qrcode';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth-context.js';
import './TeacherSalary.css';

function getCurrentSalaryMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const Teacher_sal = ({ teachers }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [loadedTeachers, setLoadedTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(teachers === undefined);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [activePayout, setActivePayout] = useState(null);
    const [payoutOverrides, setPayoutOverrides] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (teachers !== undefined) return undefined;

        let isMounted = true;
        apiRequest(isAdmin ? '/teachers/admin' : '/teachers')
            .then((result) => {
                if (isMounted) setLoadedTeachers(result);
            })
            .catch((requestError) => {
                if (isMounted) setError(requestError instanceof Error ? requestError.message : 'Could not load teacher details.');
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [isAdmin, teachers]);

    const teacherDetails = teachers ?? loadedTeachers;
    const salaryMonth = getCurrentSalaryMonth();

    async function preparePayout(teacher) {
        setError('');
        setNotice('');
        if (!teacher.upiVpa || !Number.isFinite(Number(teacher.salary)) || Number(teacher.salary) <= 0) return;

        const amount = Number(teacher.salary);
        const intent = `upi://pay?${new URLSearchParams({
            pa: teacher.upiVpa,
            pn: teacher.name,
            am: amount.toFixed(2),
            cu: 'INR',
            tn: `Salary ${salaryMonth}`
        }).toString()}`;

        try {
            const image = await QRCode.toDataURL(intent, { width: 220, margin: 2 });
            setActivePayout({ teacherId: teacher._id, amount, month: salaryMonth, utr: '', intent, image });
        } catch (qrError) {
            setError(qrError instanceof Error ? qrError.message : 'Could not create the salary UPI QR code.');
        }
    }

    async function recordPayout(event) {
        event.preventDefault();
        if (!activePayout) return;

        setError('');
        setNotice('');
        setIsSaving(true);
        try {
            const result = await apiRequest(`/teachers/${activePayout.teacherId}/payouts`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: activePayout.amount,
                    month: activePayout.month,
                    utr: activePayout.utr
                })
            });
            setPayoutOverrides((current) => ({
                ...current,
                [activePayout.teacherId]: [
                    ...(current[activePayout.teacherId] || []),
                    result.payout
                ]
            }));
            setNotice(result.message);
            setActivePayout(null);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not record the salary payout.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="salary-table-wrap">
            {error && <p className="teacher-payout-message error" role="alert">{error}</p>}
            {notice && <p className="teacher-payout-message success" role="status">{notice}</p>}
            <table>
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Subject</th>
                        <th scope="col"><AccountBalanceWallet /> Salary</th>
                        {isAdmin && <th scope="col">UPI payout</th>}
                    </tr>
                </thead>
                <tbody>
                    {teachers === undefined && isLoading ? (
                        <tr><td colSpan={isAdmin ? 4 : 3}>Loading teacher details…</td></tr>
                    ) : teachers === undefined && error ? (
                        <tr><td colSpan={isAdmin ? 4 : 3} role="alert">{error}</td></tr>
                    ) : teacherDetails.length === 0 ? (
                        <tr><td colSpan={isAdmin ? 4 : 3}>No teacher salaries available.</td></tr>
                    ) : teacherDetails.map((teacher) => {
                        const payments = [
                            ...(teacher.salaryPayments || []),
                            ...(payoutOverrides[teacher._id] || [])
                        ];
                        const recordedPayout = payments.find((payment) => payment.month === salaryMonth);
                        return (
                            <Fragment key={teacher._id}>
                                <tr>
                                    <td>{teacher.name}</td>
                                    <td>{teacher.subject}</td>
                                    <td>{teacher.salary == null ? '—' : Number(teacher.salary).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                    {isAdmin && (
                                        <td className="teacher-payout-cell">
                                            {recordedPayout ? (
                                                <span className="teacher-payout-paid">Recorded for {salaryMonth}</span>
                                            ) : !teacher.upiVpa ? (
                                                <span>Set a teacher UPI ID first</span>
                                            ) : (
                                                <>
                                                    <span>{teacher.upiVpa}</span>
                                                    <button
                                                        className="teacher-payout-button"
                                                        type="button"
                                                        onClick={() => preparePayout(teacher)}
                                                        disabled={isSaving}
                                                    >
                                                        Prepare UPI payout
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                                {isAdmin && activePayout?.teacherId === teacher._id && (
                                    <tr>
                                        <td colSpan="4">
                                            <div className="teacher-payout-panel">
                                                <h3>Pay {teacher.name} — {activePayout.month}</h3>
                                                <p>Scan the QR code or open the UPI app to send ₹{activePayout.amount.toLocaleString('en-IN')} to {teacher.upiVpa}.</p>
                                                <div className="teacher-payout-qr">
                                                    <img src={activePayout.image} alt={`UPI salary payment QR for ${teacher.name}`} />
                                                </div>
                                                <a className="teacher-payout-link" href={activePayout.intent}>Open UPI app</a>
                                                <p className="teacher-payout-warning">This page does not transfer money or verify settlement. Confirm the payment in your UPI account before recording it.</p>
                                                <form className="teacher-payout-form" onSubmit={recordPayout}>
                                                    <label>
                                                        UPI transaction reference (UTR)
                                                        <input
                                                            type="text"
                                                            value={activePayout.utr}
                                                            onChange={(event) => setActivePayout((current) => ({ ...current, utr: event.target.value }))}
                                                            minLength="6"
                                                            maxLength="80"
                                                            pattern="[A-Za-z0-9/-]{6,80}"
                                                            autoComplete="off"
                                                            required
                                                        />
                                                    </label>
                                                    <button type="submit" disabled={isSaving}>
                                                        {isSaving ? 'Recording…' : 'Record confirmed payout'}
                                                    </button>
                                                    <button type="button" onClick={() => setActivePayout(null)} disabled={isSaving}>Cancel</button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default Teacher_sal;