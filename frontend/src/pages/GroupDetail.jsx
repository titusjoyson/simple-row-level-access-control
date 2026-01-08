import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Users, ShieldCheck } from 'lucide-react';
import ScopeManager from '../components/ScopeManager';
import CapabilityToggle from '../components/CapabilityToggle';

const GroupDetail = () => {
    const { id } = useParams();
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [scopes, setScopes] = useState([]);
    const [overrides, setOverrides] = useState([]);
    const [allCaps, setAllCaps] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For dropdown

    // UI State
    const [selectedUser, setSelectedUser] = useState('');
    const [activeTab, setActiveTab] = useState('members');

    const loadData = async () => {
        try {
            const [gRes, uRes, cRes] = await Promise.all([
                fetch(`http://localhost:3001/api/admin/groups/${id}`, { headers: { 'x-user-id': '1' } }),
                fetch('http://localhost:3001/api/admin/users?limit=1000', { headers: { 'x-user-id': '1' } }),
                fetch('http://localhost:3001/api/admin/capabilities', { headers: { 'x-user-id': '1' } })
            ]);

            const gData = await gRes.json();
            const uData = await uRes.json();
            const cData = await cRes.json();

            setGroup(gData.group);
            setMembers(gData.members);
            setScopes(gData.scopes || []);
            setOverrides(gData.overrides || []);
            setAllUsers(uData.users || []);
            setAllCaps(cData);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    // --- Members Logic ---
    const handleAddMember = async () => {
        if (!selectedUser) return;
        await fetch(`http://localhost:3001/api/admin/groups/${id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ userId: selectedUser })
        });
        loadData();
    };

    const handleRemoveMember = async (userId) => {
        await fetch(`http://localhost:3001/api/admin/groups/${id}/members/${userId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': '1' }
        });
        loadData();
    };

    // --- Capabilities Logic ---
    const handleCapUpdate = async (slug, action) => {
        await fetch(`http://localhost:3001/api/admin/groups/${id}/capabilities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ slug, action })
        });
        loadData();
    };

    const handleCapReset = async (slug) => {
        await fetch(`http://localhost:3001/api/admin/groups/${id}/capabilities`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ slug })
        });
        loadData();
    };


    if (!group) return <div>Loading...</div>;

    const availableUsers = allUsers.filter(u => !members.find(m => m.id === u.id));

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <Link to="/admin/groups" className="text-gray-500 hover:text-gray-800 flex items-center mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Groups
            </Link>

            <header className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                        <Users size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                        <p className="text-gray-500">{group.description || 'No description'}</p>
                    </div>
                </div>
            </header>

            {/* TAB NAV */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                <div className="border-b border-gray-200 flex">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'members' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Members ({members.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('capabilities')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'capabilities' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Functional (PBAC)
                    </button>
                    <button
                        onClick={() => setActiveTab('scopes')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'scopes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Data Scopes (RLS)
                    </button>
                </div>

                <div className="p-6 flex-1">

                    {/* --- MEMBERS TAB --- */}
                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            {/* Add Member */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-2xl">
                                <h3 className="font-semibold text-gray-800 mb-4">Add Member</h3>
                                <div className="flex gap-4">
                                    <select
                                        className="flex-1 p-2 border border-gray-300 rounded"
                                        value={selectedUser}
                                        onChange={e => setSelectedUser(e.target.value)}
                                    >
                                        <option value="">Select User...</option>
                                        {availableUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.username} ({u.role_name})</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAddMember}
                                        disabled={!selectedUser}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        <UserPlus size={16} /> Add
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {members.map(m => (
                                            <tr key={m.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{m.username}</div>
                                                    <div className="text-sm text-gray-500">{m.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button onClick={() => handleRemoveMember(m.id)} className="text-red-600 hover:text-red-900">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {members.length === 0 && <tr><td colSpan="2" className="p-8 text-center text-gray-400">No members.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- CAPABILITIES TAB --- */}
                    {activeTab === 'capabilities' && (
                        <div className="space-y-4 max-w-2xl">
                            <p className="text-sm text-gray-500 mb-4">
                                Capabilities assigned here will apply to <strong>ALL members</strong> of this group.
                                <br />(Resolves as: User Override > Group Grant > Group Revoke > Role).
                            </p>
                            {allCaps.map(cap => {
                                const override = overrides.find(o => o.slug === cap.slug);
                                // For Groups, "Inherited" conceptually means "Does the role generally have it?".
                                // But here, we just want to show the Group's setting.
                                // We pass `isInherited={false}` to force the toggle to show "Default" unless overridden.
                                // Actually, `CapabilityToggle` shows "Inherited (Allow/Deny)" based on the prop.
                                // Since we don't know the members' roles, we can't say if it's inherited or not. 
                                // So we treat "Default" as "No Group Rule".
                                return (
                                    <CapabilityToggle
                                        key={cap.id}
                                        slug={cap.slug}
                                        overrideAction={override?.action}
                                        isInherited={null} // Pass null or special flag to indicate "No Base Context"
                                        onUpdate={(action) => handleCapUpdate(cap.slug, action)}
                                        onReset={() => handleCapReset(cap.slug)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* --- SCOPES TAB --- */}
                    {activeTab === 'scopes' && (
                        <ScopeManager
                            entityId={group.id}
                            entityType="group"
                            scopes={scopes}
                            onRefresh={loadData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupDetail;
