import { AutoStories, Delete, Edit, MenuBook, Search } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context.js';
import { apiRequest } from '../api.js';
import { MAX_NOTE_ATTACHMENT_BYTES, NOTE_ATTACHMENT_MIME_TYPES, uploadNoteAttachment } from '../fileUploads.js';
import './Notes.css';

const EMPTY_NOTE = { courseId: '', chapter: '', summary: '', keyPoint: '', content: '', attachmentUrl: '' };

const Notes = ({ compact = false }) => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('All subjects');
    const [notes, setNotes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState(EMPTY_NOTE);
    const [uploadedAttachments, setUploadedAttachments] = useState([]);
    const [selectedAttachments, setSelectedAttachments] = useState([]);
    const [courseInput, setCourseInput] = useState('');
    const [editingId, setEditingId] = useState('');
    const [showForm, setShowForm] = useState(user?.role === 'admin' && searchParams.get('action') === 'add');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function loadNotes() {
        setNotes(await apiRequest('/notes'));
    }

    useEffect(() => {
        apiRequest('/notes')
            .then(setNotes)
            .catch((requestError) => setError(requestError.message));
        if (user?.role === 'admin') {
            apiRequest('/allcourses')
                .then(setCourses)
                .catch((requestError) => setError(requestError.message));
        }
    }, [user]);

    const subjects = useMemo(() => ['All subjects', ...new Set(notes.map((note) => note.courseId?.course_name).filter(Boolean))], [notes]);
    const filteredNotes = useMemo(() => notes.filter((note) => {
        const noteSubject = note.courseId?.course_name || '';
        const matchesSubject = subject === 'All subjects' || noteSubject === subject;
        const query = search.trim().toLowerCase();
        return matchesSubject && (!query || `${noteSubject} ${note.chapter} ${note.summary} ${note.keyPoint} ${note.content}`.toLowerCase().includes(query));
    }), [notes, search, subject]);

    function addNote() {
        setForm(EMPTY_NOTE);
        setUploadedAttachments([]);
        setSelectedAttachments([]);
        setCourseInput('');
        setEditingId('');
        setError('');
        setShowForm(true);
    }

    function editNote(note) {
        const courseId = note.courseId?._id || '';
        setUploadedAttachments(note.attachmentFiles || []);
        setSelectedAttachments([]);
        setForm({
            courseId,
            chapter: note.chapter,
            summary: note.summary,
            keyPoint: note.keyPoint,
            content: note.content || '',
            attachmentUrl: note.attachmentUrl || ''
        });
        setCourseInput(note.courseId?.course_name || courseId);
        setEditingId(note._id);
        setError('');
        setShowForm(true);
    }

    async function saveNote(event) {
        event.preventDefault();
        setError('');
        setNotice('');
        setIsSaving(true);
        try {
            let noteId = editingId;
            if (noteId) {
                await apiRequest(`/notes/${noteId}`, {
                    method: 'PUT',
                    body: JSON.stringify(form)
                });
            } else {
                const createdNote = await apiRequest('/notes', {
                    method: 'POST',
                    body: JSON.stringify(form)
                });
                noteId = createdNote._id;
                setEditingId(noteId);
            }

            for (let index = 0; index < selectedAttachments.length; index += 1) {
                const file = selectedAttachments[index];
                setUploadStatus(`Uploading attachment ${index + 1} of ${selectedAttachments.length}...`);
                const uploadedFile = await uploadNoteAttachment(noteId, file);
                setUploadedAttachments((current) => [...current, uploadedFile]);
                setSelectedAttachments((current) => current.filter((selectedFile) => selectedFile !== file));
            }

            await loadNotes();
            setShowForm(false);
            setForm(EMPTY_NOTE);
            setUploadedAttachments([]);
            setSelectedAttachments([]);
            setCourseInput('');
            setEditingId('');
            setNotice(editingId ? 'Study note updated.' : 'Study note added.');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
            setUploadStatus('');
        }
    }

    function handleAttachmentSelection(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        const invalidFile = files.find((file) =>
            !NOTE_ATTACHMENT_MIME_TYPES.includes(file.type)
            || file.size <= 0
            || file.size > MAX_NOTE_ATTACHMENT_BYTES
        );
        if (invalidFile) {
            setError('Choose supported PDF, Office, OpenDocument, text, CSV, or image files up to 50 MB each.');
            setSelectedAttachments([]);
            return;
        }
        setError('');
        setSelectedAttachments(files);
    }

    async function removeUploadedAttachment(attachmentId) {
        if (!editingId) return;
        setError('');
        try {
            await apiRequest(`/notes/${editingId}/attachments/${attachmentId}`, { method: 'DELETE' });
            setUploadedAttachments((current) => current.filter((attachment) => attachment._id !== attachmentId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function deleteNote(note) {
        if (!window.confirm(`Delete "${note.chapter}"?`)) return;
        setError('');
        setNotice('');
        try {
            await apiRequest(`/notes/${note._id}`, { method: 'DELETE' });
            await loadNotes();
            setNotice('Study note deleted.');
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <div className={`notes-page${compact ? ' notes-page-compact' : ''}`}>
            {!compact && (
                <>
                    <nav className="notes-page-nav" aria-label="Notes navigation">
                        <Link to={user?.role === 'admin' ? '/admin' : `/${user?.role || ''}`}>Back to dashboard</Link>
                        <Link to="/play-arena">Play Arena</Link>
                    </nav>
                    <header className="notes-header">
                        <span className="notes-header-icon"><MenuBook /></span>
                        <div>
                            <p className="notes-kicker">{user?.role === 'admin' ? 'ADMIN NOTE LIBRARY' : 'YOUR QUICK REVISION SPACE'}</p>
                            <h1>Study notes</h1>
                            <p>{user?.role === 'admin' ? 'Create notes and link them to the course they cover.' : 'Notes for courses you are enrolled in.'}</p>
                        </div>
                        {user?.role === 'admin' && <button className="notes-add-button" type="button" onClick={addNote}>Add note</button>}
                    </header>
                </>
            )}
            {compact && user?.role === 'admin' && <button className="notes-add-button" type="button" onClick={addNote}>Add note</button>}
            {error && <p className="notes-message notes-error" role="alert">{error}</p>}
            {notice && <p className="notes-message notes-success" role="status">{notice}</p>}
            {user?.role === 'admin' && showForm && (
                <form className="notes-editor" onSubmit={saveNote}>
                    <h2>{editingId ? 'Edit study note' : 'Add study note'}</h2>
                    <label>Course
                        <input
                            type="text"
                            list="notes-course-options"
                            value={courseInput}
                            onChange={(event) => {
                                const value = event.target.value;
                                const selectedCourse = courses.find((course) => course.course_name === value || course._id === value);
                                setCourseInput(value);
                                setForm((current) => ({ ...current, courseId: selectedCourse?._id || value }));
                            }}
                            placeholder="Enter or select a course"
                            required
                        />
                        <datalist id="notes-course-options">
                            {courses.map((course) => <option value={course.course_name} key={course._id} />)}
                        </datalist>
                    </label>
                    <label>Chapter<input value={form.chapter} onChange={(event) => setForm((current) => ({ ...current, chapter: event.target.value }))} maxLength={120} required /></label>
                    <label>Summary<textarea rows="3" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} maxLength={2000} required /></label>
                    <label>Key point<input value={form.keyPoint} onChange={(event) => setForm((current) => ({ ...current, keyPoint: event.target.value }))} maxLength={500} required /></label>
                    <label>Full notes (optional)<textarea rows="5" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} maxLength={12000} /></label>
                    <label>Resource URL (optional)<input type="url" value={form.attachmentUrl} onChange={(event) => setForm((current) => ({ ...current, attachmentUrl: event.target.value }))} placeholder="https://..." /></label>
                    <div className="notes-attachments-editor">
                        <label htmlFor="notes-attachment-files">Upload note files</label>
                        <p>PDF, Word, RTF, PowerPoint, Excel, OpenDocument, text, CSV, and image files. Up to 50 MB each.</p>
                        <input
                            id="notes-attachment-files"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.rtf,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.odt,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif"
                            onChange={handleAttachmentSelection}
                        />
                        {uploadedAttachments.length > 0 && (
                            <ul className="notes-attachment-list">
                                {uploadedAttachments.map((attachment) => (
                                    <li key={attachment._id}>
                                        <span>{attachment.title}</span>
                                        <button type="button" disabled={isSaving} onClick={() => removeUploadedAttachment(attachment._id)}>Remove</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {selectedAttachments.length > 0 && (
                            <ul className="notes-attachment-list notes-attachment-pending">
                                {selectedAttachments.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
                            </ul>
                        )}
                        {uploadStatus && <p className="notes-upload-status" role="status">{uploadStatus}</p>}
                    </div>
                    <div className="notes-editor-actions">
                        <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add note'}</button>
                        <button type="button" disabled={isSaving} onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </form>
            )}
            <div className="notes-filters">
                <label className="notes-search"><Search /><input type="search" aria-label="Search study notes" placeholder="Search notes or chapters" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <label className="notes-subject-filter"><span>Course</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            </div>
            <section className="notes-grid" id="study-notes" aria-label="Study notes">
                {filteredNotes.length ? filteredNotes.map((note) => (
                    <article className="note-card" key={note._id}>
                        <div className="note-card-icon"><AutoStories /></div>
                        <p className="note-subject">{note.courseId?.course_name || 'Course'}</p>
                        <h2>{note.chapter}</h2>
                        <p className="note-summary">{note.summary}</p>
                        <p className="note-key-point"><b>Remember</b>{note.keyPoint}</p>
                        {note.content && <details className="note-full-content"><summary>Read full notes</summary><p>{note.content}</p></details>}
                        {note.attachmentUrl && <a className="note-resource-link" href={note.attachmentUrl} target="_blank" rel="noreferrer">Open study resource</a>}
                        {note.attachmentFiles?.length > 0 && (
                            <ul className="note-attachment-links" aria-label="Note attachments">
                                {note.attachmentFiles.map((attachment) => (
                                    <li key={attachment._id}>
                                        <a href={attachment.url} target="_blank" rel="noreferrer" download>{attachment.title}</a>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {user?.role === 'admin' && <div className="note-admin-actions">
                            <button type="button" onClick={() => editNote(note)}><Edit /> Edit</button>
                            <button type="button" onClick={() => deleteNote(note)}><Delete /> Delete</button>
                        </div>}
                    </article>
                )) : <p className="notes-empty">{user?.role === 'student' ? 'No notes yet. Enroll in a course to see its study notes here.' : 'No notes match your search, or no notes have been added yet.'}</p>}
            </section>
        </div>
    );
};

export default Notes;
