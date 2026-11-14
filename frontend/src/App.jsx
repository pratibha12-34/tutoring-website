import { lazy, Suspense } from 'react';
import WelcomeAudio from './components/WelcomeAudio.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';
import { AuthProvider } from './components/AuthContext.jsx';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuth } from './components/auth-context.js';
import Seo from './components/Seo.jsx';

import './App.css';

const Home = lazy(() => import('./components/layouts/Home.jsx'));
const Login = lazy(() => import('./components/pages/Login.jsx'));
const Admin = lazy(() => import('./components/pages/admin.jsx'));
const Teacher = lazy(() => import('./components/pages/Teacher.jsx'));
const Student = lazy(() => import('./components/pages/Student.jsx'));
const Register = lazy(() => import('./components/pages/Register.jsx'));
const EnquiryChat = lazy(() => import('./components/pages/EnquiryChat.jsx'));
const Notes = lazy(() => import('./components/layouts/Notes.jsx'));
const About = lazy(() => import('./components/pages/about.jsx'));
const Contact = lazy(() => import('./components/pages/Contact.jsx'));
const PlayArena = lazy(() => import('./components/pages/PlayArena.jsx'));
const Course = lazy(() => import('./components/pages/Course.jsx'));
const Teacher_sal = lazy(() => import('./components/layouts/Teacher_salary'));
const Batch = lazy(() => import('./components/pages/Batch.jsx'));
const LearningDetail = lazy(() => import('./components/pages/LearningDetail.jsx'));
const TeacherManagement = lazy(() => import('./components/pages/TeacherManagement.jsx'));

function AppLoading() {
  return (
    <main className="app-route-loading" role="status" aria-live="polite">
      <span className="app-route-loading-spinner" aria-hidden="true" />
      <p>Loading your page…</p>
    </main>
  );
}


function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function NoIndexPage({ title, children }) {
  return (
    <>
      <Seo title={title} description="This Garvit page is for signed-in users." noIndex />
      {children}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
       <div>
       
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/teacher_salary" element={<NoIndexPage title="Teacher Salary | Garvit"><Teacher_sal /></NoIndexPage>} />
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<NoIndexPage title="Admin Dashboard | Garvit"><RoleRoute roles={['admin']}><Admin /></RoleRoute></NoIndexPage>} />
            <Route path="/admin/teachers" element={<NoIndexPage title="Teacher Management | Garvit"><RoleRoute roles={['admin']}><TeacherManagement /></RoleRoute></NoIndexPage>} />
            <Route path="/teacher" element={<NoIndexPage title="Teacher Dashboard | Garvit"><RoleRoute roles={['teacher']}><Teacher /></RoleRoute></NoIndexPage>} />
            <Route path="/student" element={<NoIndexPage title="Student Dashboard | Garvit"><RoleRoute roles={['student']}><Student /></RoleRoute></NoIndexPage>} />
            <Route path="/login" element={<NoIndexPage title="Sign In | Garvit"><Login /></NoIndexPage>} />
            <Route path="/register" element={<NoIndexPage title="Create an Account | Garvit"><Register /></NoIndexPage>} />
            <Route path="/enquiry/chat/:token" element={<NoIndexPage title="Private Enquiry | Garvit"><EnquiryChat /></NoIndexPage>} />
            <Route path="/enroll" element={<Navigate to="/allcourses" replace />} />
            <Route path="/notes" element={<NoIndexPage title="Study Notes | Garvit"><RoleRoute roles={['admin', 'student', 'teacher']}><Notes /></RoleRoute></NoIndexPage>} />
            <Route path="/play-arena" element={<><Seo title="Study Games and Quizzes | Garvit" description="Practice mathematics and science with short educational quizzes in the Garvit Play Arena." canonicalPath="/play-arena" /><PlayArena /></>} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/allcourses" element={<Course />} />
            <Route path="/courses/:id" element={<LearningDetail type="course" />} />
            <Route path="/allbatches" element={<Batch />} />
            <Route path="/batches/:id" element={<LearningDetail type="batch" />} />
            <Route path="*" element={<NoIndexPage title="Page Not Found | Garvit"><main><h1>Page not found</h1><a href="/">Return to Garvit</a></main></NoIndexPage>} />
          </Routes>
        </Suspense>
        <WelcomeAudio />
       </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
