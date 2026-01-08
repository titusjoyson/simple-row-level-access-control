import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, User, Settings, Users } from 'lucide-react';

const Sidebar = () => {
    const { currentUser, users, login } = useAuth();
    const location = useLocation();

    // Helper for active class
    const getLinkClass = (path) => {
        const isActive = location.pathname.startsWith(path);
        // Special case for admin to not highlight on groups sub-route if strict matching desired, 
        // but simple startsWith works for now if we organize paths correctly.
        return `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-accent text-white' : 'hover:bg-secondary text-slate-300'
            }`;
    };

    return (
        <div className="w-64 bg-primary text-white h-screen flex flex-col p-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-wider">NEXUS<span className="text-accent">KPI</span></h1>
                <p className="text-xs text-slate-400">Enterprise Access Control</p>
            </div>

            <nav className="flex-1 space-y-2">
                <Link to="/dashboard" className={getLinkClass('/dashboard')}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </Link>

                <Link to="/access" className={getLinkClass('/access')}>
                    <ShieldCheck size={20} />
                    <span>Access Requests</span>
                </Link>

                <Link to="/admin" className={getLinkClass('/admin')}>
                    <Settings size={20} />
                    <span>Admin Controls</span>
                </Link>

                <Link to="/admin/groups" className={getLinkClass('/admin/groups')}>
                    <Users size={20} />
                    <span>Groups</span>
                </Link>
            </nav>

            <div className="mt-auto border-t border-secondary pt-4">
                <div className="flex items-center space-x-3 mb-4 text-slate-300">
                    <User size={20} />
                    <div>
                        <p className="text-sm font-medium">{currentUser.username}</p>
                        <p className="text-xs text-slate-500">{currentUser.role}</p>
                    </div>
                </div>

                <label className="block text-xs text-slate-500 mb-1">Switch Persona (Demo)</label>
                <select
                    className="w-full bg-secondary text-sm rounded px-2 py-1 border-none focus:ring-1 focus:ring-accent"
                    value={currentUser.id}
                    onChange={(e) => login(e.target.value)}
                >
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default Sidebar;
