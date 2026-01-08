import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Data
    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:3001/api/admin/users?page=${page}&limit=9&q=${debouncedSearch}`, {
            headers: { 'x-user-id': '1' }
        })
            .then(res => res.json())
            .then(data => {
                setUsers(data.users || []);
                setTotalPages(data.totalPages || 1);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, [page, debouncedSearch]);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <header className="mb-8 flex md:flex-row flex-col md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">User Access Management</h1>
                    <p className="text-gray-600">Manage Roles, Capabilities, and Data Scopes</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="search"
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }} // Reset page on search
                    />
                </div>
            </header>

            {loading ? (
                <div className="p-12 text-center text-gray-500">Loading Users...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {users.map(user => (
                            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{user.username}</h3>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {user.status}
                                    </span>
                                </div>

                                <div className="mt-6 flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <Shield className="w-4 h-4 text-indigo-500" />
                                    <span className="font-medium text-gray-900">{user.role_name}</span>
                                    <span className="text-gray-400">•</span>
                                    <span>Inherits permissions</span>
                                </div>

                                <div className="mt-6">
                                    <Link
                                        to={`/admin/users/${user.id}`}
                                        className="block w-full text-center py-2 px-4 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                        Manage Effective Access
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-4">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-gray-600 font-medium">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminUsers;
