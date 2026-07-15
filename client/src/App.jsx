import { BrowserRouter, Routes, Route, NavLink, Outlet } from "react-router-dom";
import { FiFileText, FiUsers, FiBookOpen, FiDollarSign, FiClipboard, FiLayers, FiCheckSquare, FiBook, FiUserCheck, FiCalendar } from "react-icons/fi";
import Form from "./components/AdmissionForm/Form";
import List from "./components/AdmissionList/List";
import InactiveList from "./components/InactiveList/InactiveList";
import FeeHistory from "./components/FeeHistory/FeeHistory";
import FeeEntry from "./components/FeeEntry/FeeEntry";
import InformationSheetEntry from "./components/InformationSheet/InformationSheetEntry";
import CourseManagement from "./components/CourseManagement/CourseManagement";
import InactiveCourses from "./components/CourseManagement/InactiveCourses";
import SubjectManagement from "./components/SubjectManagement/SubjectManagement";
import TeacherManagement from "./components/TeacherManagement/TeacherManagement";
import BatchManagement from "./components/BatchManagement/BatchManagement";
import AttendanceList from "./components/AttendanceList/AttendanceList";
import AttendanceScanner from "./components/AttendanceScanner/AttendanceScanner";
import AttendanceRegister from "./components/AttendanceRegister/AttendanceRegister";
import TeacherRegister from "./components/TeacherRegister/TeacherRegister";
import Detail from "./components/AdmissionDetail/Detail";
import "./App.css";

function AdminLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <FiBookOpen />
          <span>Course Admission</span>
        </div>
        <nav className="topbar-nav">
          <NavLink to="/" end>
            <FiUsers /> Admission List
          </NavLink>
          <NavLink to="/form">
            <FiFileText /> Admission Form
          </NavLink>
          <NavLink to="/fee-entry">
            <FiDollarSign /> Fee Entry
          </NavLink>
          <NavLink to="/information-sheet">
            <FiClipboard /> Information Sheet
          </NavLink>
          <NavLink to="/courses">
            <FiLayers /> Course Management
          </NavLink>
          <NavLink to="/subjects">
            <FiBook /> Subject Management
          </NavLink>
          <NavLink to="/teachers">
            <FiUserCheck /> Teacher Management
          </NavLink>
          <NavLink to="/batches">
            <FiCalendar /> Batch Management
          </NavLink>
          <NavLink to="/attendance">
            <FiCheckSquare /> Attendance
          </NavLink>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/attendance/register/:slug"
          element={<AttendanceRegister />}
        />
        <Route
          path="/teacher/register/:slug"
          element={<TeacherRegister />}
        />
        <Route element={<AdminLayout />}>
          <Route path="/" element={<List />} />
          <Route path="/inactive" element={<InactiveList />} />
          <Route path="/form" element={<Form />} />
          <Route path="/fee-entry" element={<FeeEntry />} />
          <Route
            path="/information-sheet"
            element={<InformationSheetEntry />}
          />
          <Route path="/courses" element={<CourseManagement />} />
          <Route path="/courses/inactive" element={<InactiveCourses />} />
          <Route path="/subjects" element={<SubjectManagement />} />
          <Route path="/teachers" element={<TeacherManagement />} />
          <Route path="/batches" element={<BatchManagement />} />
          <Route path="/attendance" element={<AttendanceList />} />
          <Route path="/attendance/scan" element={<AttendanceScanner />} />
          <Route path="/admissions/:id" element={<FeeHistory />} />
          <Route path="/admissions/:id/details" element={<Detail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
