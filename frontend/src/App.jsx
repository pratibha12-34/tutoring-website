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

import './App.css';



function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
       <div>
       
        <Routes>
          <Route path="/teacher_salary" element={<Teacher_sal/>}/>
          
          <Route path="/" element={<Home/>} />
          <Route path="/admin" element={<RoleRoute roles={['admin']}><Admin/></RoleRoute>} />
          <Route path="/admin/teachers" element={<RoleRoute roles={['admin']}><TeacherManagement/></RoleRoute>} />
          <Route path="/teacher" element={<RoleRoute roles={['teacher']}><Teacher/></RoleRoute>} />
          <Route path="/student" element={<RoleRoute roles={['student']}><Student/></RoleRoute>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/enquiry/chat/:token" element={<EnquiryChat/>} />
          <Route path="/enroll" element={<Navigate to="/allcourses" replace />} />
          <Route path="/notes" element={<RoleRoute roles={['admin', 'student', 'teacher']}><Notes/></RoleRoute>} />
          <Route path="/play-arena" element={<PlayArena/>} />
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


        </Routes>
        <WelcomeAudio />
       </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
