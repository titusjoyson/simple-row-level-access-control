import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Database } from 'lucide-react';

const ScopeManager = ({ entityId, entityType = 'user', scopes, onRefresh }) => {
    const [dimensions, setDimensions] = useState([]);
    const [newScope, setNewScope] = useState({ dimension: '', value: '' });

    useEffect(() => {
        fetch('http://localhost:3001/api/admin/dimensions', { headers: { 'x-user-id': '1' } })
            .then(res => res.json())
            .then(setDimensions);
    }, []);

    const endpointBase = `http://localhost:3001/api/admin/${entityType === 'group' ? 'groups' : 'users'}/${entityId}/scopes`;

    const handleAdd = async () => {
        if (!newScope.dimension || !newScope.value) return;
        await fetch(endpointBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
            body: JSON.stringify(newScope)
        });
        setNewScope({ dimension: '', value: '' });
        onRefresh();
    };

    const handleDelete = async (scopeId) => {
        await fetch(`${endpointBase}/${scopeId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': '1' }
        });
        onRefresh();
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Database className="w-5 h-5 mr-2 text-indigo-600" />
                Assigned Data Scopes
            </h3>

            {/* List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Value</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {scopes.map(scope => (
                            <tr key={scope.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{scope.dimension}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scope.value}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(scope.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {scopes.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No scopes assigned.</div>}
            </div>

            {/* Add Form */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-end space-x-3">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimension</label>
                    <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white"
                        value={newScope.dimension}
                        onChange={e => setNewScope({ ...newScope, dimension: e.target.value })}
                    >
                        <option value="">Select...</option>
                        {dimensions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value (e.g. Region Key)</label>
                    <input
                        type="text"
                        className="block w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        placeholder="EMEA, NA, etc."
                        value={newScope.value}
                        onChange={e => setNewScope({ ...newScope, value: e.target.value })}
                    />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!newScope.dimension}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center shadow-sm disabled:opacity-50"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add
                </button>
            </div>

            <p className="text-xs text-gray-500 italic">
                {entityType === 'group'
                    ? "Scopes assigned here are inherited by ALL members of this group."
                    : "Scopes define specific data rows this user can see."
                }
            </p>
        </div>
    );
};

export default ScopeManager;
