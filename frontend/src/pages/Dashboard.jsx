import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Lock } from 'lucide-react';

const Dashboard = () => {
    const { currentUser } = useAuth();
    const [kpis, setKpis] = useState([]);
    const [selectedKpi, setSelectedKpi] = useState(null);
    const [kpiData, setKpiData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchKpis();
        setSelectedKpi(null);
        setKpiData(null);
    }, [currentUser]);

    const fetchKpis = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/kpis', {
                headers: { 'x-user-id': currentUser.id }
            });
            setKpis(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchKpiData = async (kpiId) => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3001/api/kpis/${kpiId}/data`, {
                headers: { 'x-user-id': currentUser.id }
            });
            setKpiData(res.data);
            setSelectedKpi(kpis.find(k => k.id === kpiId));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">Executive Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {kpis.map(kpi => (
                    <div
                        key={kpi.id}
                        onClick={() => fetchKpiData(kpi.id)}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedKpi?.id === kpi.id
                                ? 'border-accent bg-blue-50 shadow-lg'
                                : 'border-slate-200 bg-white hover:border-accent/50 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg text-accent">
                                <BarChart3 size={24} />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">{kpi.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{kpi.description}</p>
                    </div>
                ))}

                {kpis.length === 0 && (
                    <div className="col-span-3 p-8 text-center bg-slate-100 rounded-xl border border-dashed border-slate-300">
                        <Lock className="mx-auto text-slate-400 mb-2" size={32} />
                        <p className="text-slate-500">No KPIs available for your role.</p>
                    </div>
                )}
            </div>

            {selectedKpi && kpiData && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">{selectedKpi.name} Data</h3>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="text-slate-500">Access Policy:</span>
                            <span className={`px-2 py-1 rounded font-medium ${kpiData.policy === 'FULL_ACCESS' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                {kpiData.policy || 'Full Access'}
                            </span>
                            {kpiData.filters && (
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                    Filter: {kpiData.filters.dimension} IN [{kpiData.filters.values.join(', ')}]
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                                    {Object.keys(kpiData.data[0] || {}).map(key => (
                                        <th key={key} className="pb-3 font-medium">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kpiData.data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        {Object.values(row).map((val, i) => (
                                            <td key={i} className="py-3 text-slate-700">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {kpiData.data.length === 0 && (
                            <p className="text-center text-slate-500 py-8">No data visible with current permissions.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
