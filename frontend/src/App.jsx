import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RBACProvider } from './context/RBACContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AccessManagement from './pages/AccessManagement';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';
import GroupList from './pages/GroupList';
import GroupDetail from './pages/GroupDetail';

function App() {
  return (
    <AuthProvider>
      <RBACProvider>
        <Router>
          <div className="flex h-screen bg-slate-50 font-sans">
            {/* We pass nothing to Sidebar, it should now use Link or NavLink internally if updated, 
                    but for now it might look static which is fine for POC. 
                    Ideally Sidebar needs refactor to use <Link> */}
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/access" element={<AccessManagement />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminUsers />} />
                <Route path="/admin/users/:id" element={<AdminUserDetail />} />
                <Route path="/admin/groups" element={<GroupList />} />
                <Route path="/admin/groups/:id" element={<GroupDetail />} />
              </Routes>
            </main>
          </div>
        </Router>
      </RBACProvider>
    </AuthProvider>
  );
}

export default App;
