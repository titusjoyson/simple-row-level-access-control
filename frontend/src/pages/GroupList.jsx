import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, List } from 'lucide-react';

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const load = () => {
        fetch('http://localhost:3001/api/admin/groups', { headers: { 'x-user-id': '1' } })
            .then(res => res.json())
            .then(setGroups);
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!name) return;
        await fetch('http://localhost:3001/api/admin/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ name, description: desc })
        });
        setName('');
        setDesc('');
        load();
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Groups</h1>
                    <p className="text-gray-600">Manage Teams and Departments</p>
                </div>
            </header>

            {/* Create Form */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8 max-w-2xl">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" /> Create New Group
                </h3>
                <div className="flex gap-4">
                    <input
                        className="flex-1 p-2 border border-gray-300 rounded"
                        placeholder="Group Name (e.g. Sales East)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <input
                        className="flex-1 p-2 border border-gray-300 rounded"
                        placeholder="Description"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!name}
                        className="bg-accent text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(g => (
                    <Link key={g.id} to={`/admin/groups/${g.id}`} className="block">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{g.name}</h3>
                                    <p className="text-xs text-gray-500">{g.memberCount} Members</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">{g.description || 'No description'}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default GroupList;
