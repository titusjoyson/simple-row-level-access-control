import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, ShieldCheck, Database, History } from 'lucide-react';
import CapabilityToggle from '../components/CapabilityToggle';
import ScopeManager from '../components/ScopeManager';
import AuditLogViewer from '../components/AuditLogViewer';

const AdminUserDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [allCaps, setAllCaps] = useState([]);
    const [activeTab, setActiveTab] = useState('capabilities');

    // Fetch Helper
    const loadData = async () => {
        try {
            const [userRes, capsRes] = await Promise.all([
                fetch(`http://localhost:3001/api/admin/users/${id}`, { headers: { 'x-user-id': '1' } }),
                fetch(`http://localhost:3001/api/admin/capabilities`, { headers: { 'x-user-id': '1' } })
            ]);
            setData(await userRes.json());
            setAllCaps(await capsRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleUpdate = async (slug, action) => {
        await fetch(`http://localhost:3001/api/admin/users/${id}/capabilities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ slug, action })
        });
        loadData(); // Refresh context
    };

    const handleReset = async (slug) => {
        await fetch(`http://localhost:3001/api/admin/users/${id}/capabilities`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify({ slug })
        });
        loadData();
    };

    if (!data) return <div className="p-8">Loading Profile...</div>;

    const { user, role, overrides, scopes, computed_context } = data;

    // Helper: Is this capability in the user's base role?
    const isRoleInherited = (slug) => {
        return computed_context.capabilities.includes(slug) && !overrides.find(o => o.slug === slug);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <Link to="/admin" className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-indigo-700">{role.name}</span>
                </div>
            </div>

            <main className="flex-1 p-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-200 flex">
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
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'audit' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Audit Log
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* TAB: CAPABILITIES */}
                            {activeTab === 'capabilities' && (
                                allCaps.map(cap => {
                                    const override = overrides.find(o => o.slug === cap.slug);
                                    const inherited = computed_context.capabilities.includes(cap.slug) || (override?.action === 'REVOKE');
                                    return (
                                        <CapabilityToggle
                                            key={cap.id}
                                            slug={cap.slug}
                                            overrideAction={override?.action}
                                            isInherited={inherited}
                                            onUpdate={(action) => handleUpdate(cap.slug, action)}
                                            onReset={() => handleReset(cap.slug)}
                                        />
                                    );
                                })
                            )}

                            {/* TAB: DATA SCOPES */}
                            {activeTab === 'scopes' && (
                                <ScopeManager
                                    entityId={user.id}
                                    entityType="user"
                                    scopes={scopes}
                                    onRefresh={loadData}
                                />
                            )}

                            {/* TAB: AUDIT LOG */}
                            {activeTab === 'audit' && (
                                <AuditLogViewer userId={user.id} active={true} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Simulator */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-slate-300 rounded-xl shadow-lg border border-slate-700 overflow-hidden p-4">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Effective Context Simulator</h3>
                        <pre className="text-xs font-mono overflow-auto max-h-[500px]">
                            {JSON.stringify(computed_context, null, 2)}
                        </pre>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2">Legend</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> Explicit Grant</div>
                            <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> Explicit Revoke</div>
                            <div className="flex items-center"><span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span> Role Inherited</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminUserDetail;
