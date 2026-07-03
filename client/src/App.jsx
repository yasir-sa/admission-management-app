import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { FiFileText, FiUsers, FiBookOpen } from "react-icons/fi";
import Form from "./components/AdmissionForm/Form";
import List from "./components/AdmissionList/List";
import Detail from "./components/AdmissionDetail/Detail";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <FiBookOpen />
            <span>Course Admission</span>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end>
              <FiFileText /> Admission Form
            </NavLink>
            <NavLink to="/admissions">
              <FiUsers /> Admission List
            </NavLink>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Form />} />
            <Route path="/admissions" element={<List />} />
            <Route path="/admissions/:id" element={<Detail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
