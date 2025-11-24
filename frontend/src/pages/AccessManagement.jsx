import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const AccessManagement = () => {
    const { currentUser } = useAuth();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [requestForm, setRequestForm] = useState({ dimension: 'REGION', value: '' });
    const [message, setMessage] = useState(null);

    const canApprove = ['MANAGER', 'ADMIN'].includes(currentUser.role);

    useEffect(() => {
        if (canApprove) {
            fetchPendingRequests();
        } else {
            setPendingRequests([]);
        }
    }, [currentUser]);

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/access/pending', {
                headers: { 'x-user-id': currentUser.id }
            });
            setPendingRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/access/request', requestForm, {
                headers: { 'x-user-id': currentUser.id }
            });
            setMessage({ type: 'success', text: 'Request submitted successfully!' });
            setRequestForm({ ...requestForm, value: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit request' });
        }
    };

    const handleApprove = async (requestId, action) => {
        try {
            await axios.post('http://localhost:3001/api/access/approve', { requestId, action }, {
                headers: { 'x-user-id': currentUser.id }
            });
            fetchPendingRequests();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">Access Management</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Request Access Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold mb-4 text-slate-700">Request New Access</h3>
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Dimension</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent outline-none"
                                value={requestForm.dimension}
                                onChange={e => setRequestForm({ ...requestForm, dimension: e.target.value })}
                            >
                                <option value="REGION">Region</option>
                                {/* Add more dimensions here if needed */}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Value (Scope)</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent outline-none"
                                value={requestForm.value}
                                onChange={e => setRequestForm({ ...requestForm, value: e.target.value })}
                            >
                                <option value="">Select Region...</option>
                                <option value="NA">North America (NA)</option>
                                <option value="EMEA">Europe, Middle East, Africa (EMEA)</option>
                                <option value="APAC">Asia Pacific (APAC)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary text-white py-2 rounded hover:bg-secondary transition-colors"
                            disabled={!requestForm.value}
                        >
                            Submit Request
                        </button>
                    </form>
                    {message && (
                        <div className={`mt-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Approval Section */}
                {canApprove ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-xl font-bold mb-4 text-slate-700">Pending Approvals</h3>
                        <div className="space-y-3">
                            {pendingRequests.length === 0 ? (
                                <p className="text-slate-500 text-sm">No pending requests.</p>
                            ) : (
                                pendingRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                                        <div>
                                            <p className="font-medium text-slate-800">{req.username}</p>
                                            <p className="text-xs text-slate-500">Requesting: <span className="font-semibold">{req.dimension} - {req.value}</span></p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleApprove(req.id, 'APPROVED')}
                                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                title="Approve"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(req.id, 'REJECTED')}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Reject"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                        <Clock className="text-slate-400 mb-2" size={32} />
                        <h3 className="text-lg font-medium text-slate-600">Approval Queue</h3>
                        <p className="text-sm text-slate-500 mt-1">You do not have permission to approve requests.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessManagement;
