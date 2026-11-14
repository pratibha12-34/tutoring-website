import { useEffect, useState } from 'react';
import { AddCircle, Delete, Edit, School } from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import Teacher_sal from '../layouts/Teacher_salary';
import './TeacherManagement.css';

const EMPTY_TEACHER = { name: '', subject: '', language: '', salary: '', upiVpa: '' };

const TeacherManagement = () => {
    const [searchParams] = useSearchParams();
    const [teachers, setTeachers] = useState([]);
    const [form, setForm] = useState(EMPTY_TEACHER);
    const [editingId, setEditingId] = useState('');
    const [showForm, setShowForm] = useState(searchParams.get('action') === 'add');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function loadTeachers() {
        setTeachers(await apiRequest('/teachers/admin'));
    }

    useEffect(() => {
        apiRequest('/teachers/admin')
            .then(setTeachers)
            .catch((requestError) => setError(requestError.message));
    }, []);

    function startAdd() {
        setForm(EMPTY_TEACHER);
        setEditingId('');
        setError('');
        setShowForm(true);
    }

    function startEdit(teacher) {
        setForm({
            name: teacher.name,
            subject: teacher.subject,
            language: teacher.language,
            salary: teacher.salary ?? '',
            upiVpa: teacher.upiVpa ?? ''
        });
        setEditingId(teacher._id);
        setError('');
        setShowForm(true);
    }

    async function saveTeacher(event) {
        event.preventDefault();
        setError('');
        setNotice('');
        try {
            await apiRequest(editingId ? `/teachers/${editingId}` : '/teachers', {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify(form)
            });
            await loadTeachers();
            setShowForm(false);
            setForm(EMPTY_TEACHER);
            setEditingId('');
            setNotice(editingId ? 'Teacher details updated.' : 'Teacher added.');
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function removeTeacher(teacher) {
        if (!window.confirm(`Remove ${teacher.name} from the teacher list?`)) return;
        setError('');
        setNotice('');
        try {
            await apiRequest(`/teachers/${teacher._id}`, { method: 'DELETE' });
            await loadTeachers();
            setNotice(`${teacher.name} was removed.`);
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <main className="teacher-management-page">
            <nav className="teacher-management-nav">
                <Link to="/admin">Back to admin panel</Link>
                <button type="button" onClick={startAdd}><AddCircle /> Add teacher</button>
            </nav>
            <header className="teacher-management-header">
                <span><School /></span>
                <div>
                    <p>ADMIN MANAGEMENT</p>
                    <h1>Teachers</h1>
                    <small>Manage teacher profiles, salary amounts, and private UPI payout IDs.</small>
                </div>
            </header>
            {error && <p className="teacher-management-message error" role="alert">{error}</p>}
            {notice && <p className="teacher-management-message success" role="status">{notice}</p>}
            {showForm && (
                <form className="teacher-management-form" onSubmit={saveTeacher}>
                    <h2>{editingId ? 'Edit teacher' : 'Add teacher'}</h2>
                    <label>Teacher name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={100} required /></label>
                    <label>Subject<input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} maxLength={100} required /></label>
                    <label>Language<input value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))} maxLength={80} required /></label>
                    <label>Monthly salary (₹)<input type="number" value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} min="0" step="0.01" required /></label>
                    <label>Teacher UPI ID (for salary payouts)<input type="text" value={form.upiVpa} onChange={(event) => setForm((current) => ({ ...current, upiVpa: event.target.value }))} maxLength={100} placeholder="name@bank" autoComplete="off" /></label>
                    <div className="teacher-management-form-actions">
                        <button type="submit">{editingId ? 'Save changes' : 'Add teacher'}</button>
                        <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </form>
            )}
            <section className="teacher-management-grid" id="teachers" aria-label="Teacher list">
                {teachers.length === 0 ? <p className="teacher-management-empty">No teachers have been added yet.</p> : teachers.map((teacher) => (
                    <article className="teacher-management-card" key={teacher._id}>
                        <div><h2>{teacher.name}</h2><p>{teacher.subject} · {teacher.language} · {teacher.salary == null ? 'Salary not set' : `₹${Number(teacher.salary).toLocaleString('en-IN')}`}</p></div>
                        <div className="teacher-management-card-actions">
                            <button type="button" onClick={() => startEdit(teacher)}><Edit /> Edit</button>
                            <button type="button" onClick={() => removeTeacher(teacher)}><Delete /> Delete</button>
                        </div>
                    </article>
                ))}
            </section>
            <section className="teacher-management-salary" aria-label="Teacher salaries">
                <h2>Teacher salaries</h2>
                <Teacher_sal teachers={teachers} />
            </section>
        </main>
    );
};

export default TeacherManagement;
