import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { FiFileText, FiUsers, FiBookOpen } from "react-icons/fi";
import Form from "./components/AdmissionForm/Form";
import List from "./components/AdmissionList/List";
import InactiveList from "./components/InactiveList/InactiveList";
import FeeHistory from "./components/FeeHistory/FeeHistory";
import Detail from "./components/AdmissionDetail/Detail";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
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
          </nav>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<List />} />
            <Route path="/inactive" element={<InactiveList />} />
            <Route path="/form" element={<Form />} />
            <Route path="/admissions/:id" element={<FeeHistory />} />
            <Route path="/admissions/:id/details" element={<Detail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
