import Student from './components/pages/Student.jsx';
import Home from './components/layouts/Home.jsx';
import Login from './components/pages/login.jsx';
import Admin from './components/pages/admin.jsx';
import Teacher from './components/pages/Teacher.jsx';
import Register from './components/pages/Register.jsx';
import EnquiryChat from './components/pages/EnquiryChat.jsx';
import WelcomeAudio from './components/WelcomeAudio.jsx';
// import Batches, { Batch_add, Batch_edit, Batch_delete } from './components/layouts/Batches.jsx';
import Notes from './components/layouts/Notes.jsx';
import About from './components/pages/about.jsx';
import Contact from './components/pages/Contact.jsx';
import PlayArena from './components/pages/PlayArena.jsx';
// import Course_form, { Course_add, Course_edit, Course_delete } from './components/layouts/course_form.jsx';
import Course from './components/pages/Course.jsx';
import Teacher_sal from './components/layouts/Teacher_salary';
import Batch from './components/pages/Batch.jsx';
import LearningDetail from './components/pages/LearningDetail.jsx';
import TeacherManagement from './components/pages/TeacherManagement.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';
import { AuthProvider } from './components/AuthContext.jsx';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuth } from './components/auth-context.js';
import Seo from './components/Seo.jsx';

import './App.css';



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
       
        <Routes>
          <Route path="/teacher_salary" element={<NoIndexPage title="Teacher Salary | Garvit"><Teacher_sal/></NoIndexPage>}/>
          
          <Route path="/" element={<Home/>} />
          <Route path="/admin" element={<NoIndexPage title="Admin Dashboard | Garvit"><RoleRoute roles={['admin']}><Admin/></RoleRoute></NoIndexPage>} />
          <Route path="/admin/teachers" element={<NoIndexPage title="Teacher Management | Garvit"><RoleRoute roles={['admin']}><TeacherManagement/></RoleRoute></NoIndexPage>} />
          <Route path="/teacher" element={<NoIndexPage title="Teacher Dashboard | Garvit"><RoleRoute roles={['teacher']}><Teacher/></RoleRoute></NoIndexPage>} />
          <Route path="/student" element={<NoIndexPage title="Student Dashboard | Garvit"><RoleRoute roles={['student']}><Student/></RoleRoute></NoIndexPage>} />
          <Route path="/login" element={<NoIndexPage title="Sign In | Garvit"><Login/></NoIndexPage>} />
          <Route path="/register" element={<NoIndexPage title="Create an Account | Garvit"><Register/></NoIndexPage>} />
          <Route path="/enquiry/chat/:token" element={<NoIndexPage title="Private Enquiry | Garvit"><EnquiryChat/></NoIndexPage>} />
          <Route path="/enroll" element={<Navigate to="/allcourses" replace />} />
          <Route path="/notes" element={<NoIndexPage title="Study Notes | Garvit"><RoleRoute roles={['admin', 'student', 'teacher']}><Notes/></RoleRoute></NoIndexPage>} />
          <Route path="/play-arena" element={<><Seo title="Study Games and Quizzes | Garvit" description="Practice mathematics and science with short educational quizzes in the Garvit Play Arena." canonicalPath="/play-arena"/><PlayArena/></>} />
          <Route path="/about" element={<About/>} />
          <Route path="/contact" element={<Contact/>} />
          {/* <Route path="/courseform" element={<Course_form/>} /> */}
          {/* <Route path="/addcourse" element={<Course_add/>} /> */}
          {/* <Route path="/editcourse" element={<Course_edit/>} /> */}
          {/* <Route path="/deletecourse" element={<Course_delete/>} /> */}
          <Route path="/allcourses" element={<Course/>} />
          <Route path="/courses/:id" element={<LearningDetail type="course" />} />
          {/* <Route path="/addbatch" element={<Batch_add/>} /> */}
          {/* <Route path="/editbatch" element={<Batch_edit/>} /> */}
          {/* <Route path="/deletebatch" element={<Batch_delete/>} /> */}
          <Route path="/allbatches" element={<Batch/>} />
          <Route path="/batches/:id" element={<LearningDetail type="batch" />} />
          {/* <Route path ="/batches" element ={<Batches/>} /> */}
          {/* <Route path="/courses/:slug" element={<Course_form/>} /> */}
          <Route path="*" element={<NoIndexPage title="Page Not Found | Garvit"><main><h1>Page not found</h1><a href="/">Return to Garvit</a></main></NoIndexPage>} />

        </Routes>
        <WelcomeAudio />
       </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
