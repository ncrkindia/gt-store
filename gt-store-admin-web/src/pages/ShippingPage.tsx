import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Truck, ExternalLink, RefreshCw, Box, Search, Calendar, Clock } from 'lucide-react';

interface Shipment {
    id: number;
    orderId: string;
    shiprocketOrderId: string;
    shiprocketShipmentId: string;
    awbCode: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

const ShippingPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchShipments = async () => {
        if (!keycloak.authenticated) return;
        try {
            setLoading(true);
            const res = await apiClient.get('/api/shipping/all');
            setShipments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching logistic data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) fetchShipments();
    }, [initialized, keycloak.authenticated]);

    const filtered = shipments.filter(s => 
        s.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.awbCode && s.awbCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && shipments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p>Connecting to Logistics Engine...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Premium Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Truck size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Logistics Dispatch</h1>
                        <p className="text-slate-500 text-sm">Track third-party courier synchronization and automated routing data.</p>
                    </div>
                </div>

                <button onClick={fetchShipments} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition border border-slate-200 shadow-sm">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Sync Feed
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition duration-300">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Box size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Managed</span>
                        <p className="text-2xl font-bold text-slate-800">{shipments.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition duration-300">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Window</span>
                        <p className="text-2xl font-bold text-slate-800">Today</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition duration-300">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Pickup</span>
                        <p className="text-2xl font-bold text-slate-800">
                            {shipments.filter(s => s.status === 'PENDING_PICKUP' || s.status === 'PROCESSING').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white/50 backdrop-blur p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        placeholder="Search tracking numbers, order keys..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Store Reference</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Consignment Keys</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">AWB / Courier ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Logistics Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Generated At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                                        No matching consignments located in storage feed.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">Order Lookup</div>
                                            <div className="font-mono text-xs text-indigo-600 bg-indigo-50 inline-block px-1.5 rounded border border-indigo-100 mt-1">
                                                {s.orderId.includes('-') ? `${s.orderId.substring(0, 8)}...` : s.orderId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 font-medium">ID: {s.shiprocketOrderId}</div>
                                            <div className="text-slate-400 text-xs">ShipID: {s.shiprocketShipmentId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.awbCode ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 tracking-wide">{s.awbCode}</span>
                                                    <a 
                                                        href={`https://shiprocket.co/tracking/${s.awbCode}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="opacity-0 group-hover:opacity-100 transition text-indigo-500 hover:text-indigo-700"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-orange-500 italic font-medium">Queued for generation</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border
                                                ${s.status === 'PENDING_PICKUP' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                                s.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                'bg-blue-50 text-blue-700 border-blue-100'}
                                            `}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {new Date(s.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="text-center pt-4">
                <span className="text-xs text-slate-400 bg-white border border-slate-200 px-4 py-1.5 rounded-full inline-flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> 
                    Integrated seamlessly with Shiprocket Fulfillment API stack
                </span>
            </div>
        </div>
    );
};

export default ShippingPage;
