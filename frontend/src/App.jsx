import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AccessManagement from './pages/AccessManagement';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <AuthProvider>
      <div className="flex h-screen bg-slate-50 font-sans">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'access' && <AccessManagement />}
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
