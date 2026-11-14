import { useEffect, useMemo, useState } from 'react';
import { EventAvailable, FactCheck } from '@mui/icons-material';
import { apiRequest } from '../api.js';
import './Attendance.css';

function getLocalDate() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

const Attendance = () => {
    const [statusInput, setStatusInput] = useState('');
    const [date, setDate] = useState(getLocalDate);
    const [records, setRecords] = useState([]);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);

    async function loadRecords() {
        setRecords(await apiRequest('/attendance/mine'));
    }

    useEffect(() => {
        let isCurrent = true;
        apiRequest('/attendance/mine')
            .then((result) => {
                if (isCurrent) setRecords(result);
            })
            .catch((requestError) => {
                if (isCurrent) setError(requestError.message);
            });
        return () => { isCurrent = false; };
    }, []);

    const selectedMonth = useMemo(() => {
        const [year, month] = date.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstWeekday = new Date(year, month - 1, 1).getDay();
        return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
            if (index < firstWeekday) return null;
            const day = index - firstWeekday + 1;
            return `${date.slice(0, 7)}-${String(day).padStart(2, '0')}`;
        });
    }, [date]);

    const attendanceByDate = useMemo(() => new Map(records.map((record) => [record.date, record.status])), [records]);
    const monthRecords = records.filter((record) => record.date.startsWith(date.slice(0, 7)));
    const presentCount = monthRecords.filter((record) => record.status === 'present').length;
    const absentCount = monthRecords.filter((record) => record.status === 'absent').length;

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setNotice('');
        setSaving(true);
        try {
            const result = await apiRequest('/attendance', {
                method: 'POST',
                body: JSON.stringify({ date, status: statusInput })
            });
            setNotice(result.message);
            setStatusInput('');
            await loadRecords();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="dashboard-card teacher-attendance-card">
            <header className="attendance-heading">
                <h2><span className="section-icon icon-green"><EventAvailable /></span>My attendance</h2>
                <p>Mark yourself present (P) or absent (A). You can update an entry for the same date.</p>
            </header>
            <form className="attendance-form" onSubmit={handleSubmit}>
                <label htmlFor="attendance-date">Date
                    <input id="attendance-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                </label>
                <label htmlFor="attendance-status">Status
                    <input id="attendance-status" type="text" value={statusInput} onChange={(event) => setStatusInput(event.target.value)} placeholder="Present / P or Absent / A" required />
                </label>
                <button type="submit" disabled={saving}><FactCheck /> {saving ? 'Saving…' : 'Mark attendance'}</button>
            </form>
            {error && <p className="attendance-error" role="alert">{error}</p>}
            {notice && <p className="attendance-notice" role="status">{notice}</p>}
            <div className="attendance-summary" aria-live="polite">
                <span><b>{presentCount}</b> present</span>
                <span><b>{absentCount}</b> absent</span>
            </div>
            <div className="attendance-calendar" aria-label="Attendance chart">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <span className="attendance-weekday" key={weekday}>{weekday}</span>)}
                {selectedMonth.map((day, index) => {
                    if (!day) return <span className="attendance-day attendance-day-empty" key={`empty-${index}`} aria-hidden="true" />;
                    const status = attendanceByDate.get(day);
                    return (
                        <span className={`attendance-day${status ? ` attendance-day-${status}` : ''}`} key={day} title={status ? `${day}: ${status}` : day}>
                            <span>{Number(day.slice(-2))}</span>
                            {status && <small>{status === 'present' ? 'P' : 'A'}</small>}
                        </span>
                    );
                })}
            </div>
            <div className="attendance-legend"><span><i className="legend-present" /> Present</span><span><i className="legend-absent" /> Absent</span></div>
        </section>
    );
};

export default Attendance;
