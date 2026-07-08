import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import Applications from './pages/Applications';

function App() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Candidate Tracker
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink
            to="/candidates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Users size={20} />
            <span>Candidates</span>
          </NavLink>

          <NavLink
            to="/applications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <FileText size={20} />
            <span>Applications</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/applications" element={<Applications />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
