import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

const AuditLogViewer = ({ userId, active }) => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (!active) return;
        fetch(`http://localhost:3001/api/admin/audit/${userId}`, { headers: { 'x-user-id': '1' } })
            .then(res => res.json())
            .then(setLogs);
    }, [userId, active]);

    if (!active) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <History className="w-5 h-5 mr-2 text-gray-500" />
                Audit History
            </h3>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {log.action}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && <div className="p-8 text-center text-gray-400">No activity recorded.</div>}
            </div>
        </div>
    );
};

export default AuditLogViewer;
