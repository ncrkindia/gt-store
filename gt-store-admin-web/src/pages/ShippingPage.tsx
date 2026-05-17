import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Truck, ExternalLink, RefreshCw, Box, Search, Calendar, Clock, Save, Plus, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

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

interface ShippingBand {
    min: number;
    max: number | '+';
    charge: number;
}

const ShippingPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Tab controls
    const [activeTab, setActiveTab] = useState<'tracking' | 'pricing'>('tracking');

    // Pricing Rule States
    const [shippingBands, setShippingBands] = useState<ShippingBand[]>([
        { min: 0, max: 499, charge: 50 },
        { min: 500, max: 999, charge: 30 },
        { min: 1000, max: '+', charge: 0 }
    ]);
    const [codCharge, setCodCharge] = useState('5');
    const [savingSettings, setSavingSettings] = useState(false);

    // Form inputs for a new band
    const [newMin, setNewMin] = useState('');
    const [newMax, setNewMax] = useState('');
    const [newCharge, setNewCharge] = useState('');
    const [isPlusMax, setIsPlusMax] = useState(false);

    const parseRules = (rulesStr: string): ShippingBand[] => {
        try {
            return rulesStr.split(',').map(rule => {
                const [range, chargeStr] = rule.trim().split(':');
                const charge = Number(chargeStr.trim());
                if (range.endsWith('+')) {
                    const min = Number(range.replace('+', '').trim());
                    return { min, max: '+', charge };
                } else {
                    const [minStr, maxStr] = range.split('-');
                    return { min: Number(minStr.trim()), max: Number(maxStr.trim()), charge };
                }
            });
        } catch (e) {
            return [
                { min: 0, max: 499, charge: 50 },
                { min: 500, max: 999, charge: 30 },
                { min: 1000, max: '+', charge: 0 }
            ];
        }
    };

    const serializeRules = (bands: ShippingBand[]): string => {
        // Sort bands by min value first to be clean
        const sorted = [...bands].sort((a, b) => a.min - b.min);
        return sorted.map(b => {
            if (b.max === '+') {
                return `${b.min}+:${b.charge}`;
            }
            return `${b.min}-${b.max}:${b.charge}`;
        }).join(',');
    };

    const fetchShipmentsAndSettings = async () => {
        if (!keycloak.authenticated) return;
        try {
            setLoading(true);
            
            // 1. Fetch shipments
            const shipRes = await apiClient.get('/api/shipping/all');
            setShipments(Array.isArray(shipRes.data) ? shipRes.data : []);

            // 2. Fetch pricing settings
            const settingsRes = await apiClient.get('/api/orders/settings');
            if (settingsRes.data) {
                if (settingsRes.data.SHIPPING_RULES) {
                    setShippingBands(parseRules(settingsRes.data.SHIPPING_RULES));
                }
                if (settingsRes.data.COD_FIXED_CHARGE) {
                    setCodCharge(settingsRes.data.COD_FIXED_CHARGE);
                }
            }
        } catch (error) {
            console.error("Error fetching logistics configs", error);
            toast.error("Failed to load logistics dispatch or shipping rules.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) fetchShipmentsAndSettings();
    }, [initialized, keycloak.authenticated]);

    const handleSavePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (shippingBands.length === 0) {
            toast.error("At least one shipping charge band rule is required.");
            return;
        }

        const codNum = Number(codCharge);
        if (isNaN(codNum) || codNum < 0) {
            toast.error("COD fixed charge must be 0 or more.");
            return;
        }

        const serializedRules = serializeRules(shippingBands);

        try {
            setSavingSettings(true);
            await apiClient.post('/api/orders/settings', {
                SHIPPING_RULES: serializedRules,
                COD_FIXED_CHARGE: codCharge.toString()
            });
            toast.success("Delivery bands and COD fees updated successfully!");
            fetchShipmentsAndSettings();
        } catch (error) {
            console.error(error);
            toast.error("Failed to persist logistics pricing rules.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAddBand = (e: React.FormEvent) => {
        e.preventDefault();
        const minVal = Number(newMin);
        const chargeVal = Number(newCharge);

        if (isNaN(minVal) || minVal < 0) {
            toast.error("Minimum cart value must be 0 or more.");
            return;
        }
        if (isNaN(chargeVal) || chargeVal < 0) {
            toast.error("Delivery charge must be 0 or more.");
            return;
        }

        let bandMax: number | '+' = '+';
        if (!isPlusMax) {
            const maxVal = Number(newMax);
            if (isNaN(maxVal) || maxVal <= minVal) {
                toast.error("Maximum value must be greater than minimum cart value.");
                return;
            }
            bandMax = maxVal;
        }

        const newBand: ShippingBand = { min: minVal, max: bandMax, charge: chargeVal };
        setShippingBands([...shippingBands, newBand]);
        
        // Reset inputs
        setNewMin('');
        setNewMax('');
        setNewCharge('');
        setIsPlusMax(false);
        toast.success("New pricing band rule added!");
    };

    const handleDeleteBand = (index: number) => {
        const updated = shippingBands.filter((_, idx) => idx !== index);
        setShippingBands(updated);
        toast.info("Pricing band rule removed.");
    };

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
            
            {/* Header with Tabs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Truck size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Logistics & Dispatch</h1>
                        <p className="text-slate-500 text-sm">Monitor AWB dispatch codes, Shiprocket fulfillment status, and configure custom shipping bands.</p>
                    </div>
                </div>

                {/* Modern Glassmorphic Tab switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('tracking')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeTab === 'tracking' 
                            ? 'bg-white text-indigo-600 shadow-sm font-semibold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Tracking Feed
                    </button>
                    <button 
                        onClick={() => setActiveTab('pricing')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeTab === 'pricing' 
                            ? 'bg-white text-indigo-600 shadow-sm font-semibold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Pricing Rules
                    </button>
                </div>
            </div>

            {/* Tabbed content */}
            {activeTab === 'tracking' ? (
                <>
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
                        <button 
                            onClick={fetchShipmentsAndSettings}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 text-sm font-semibold transition cursor-pointer shadow-sm shrink-0"
                            title="Sync Feed"
                            type="button"
                        >
                            <RefreshCw size={16} className="text-slate-500" />
                            Sync Feed
                        </button>
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
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-sm">
                    {/* Left: Current Shipping Charge Bands & COD Fee Form */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                        <div className="border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold text-slate-900">Custom Delivery Bands</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Establish custom delivery fee brackets based on final checkout cart values.</p>
                        </div>
                        
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                            {shippingBands.length === 0 ? (
                                <p className="p-6 text-slate-400 italic text-center">No active shipping charge bands. Default fallbacks will apply.</p>
                            ) : (
                                [...shippingBands].sort((a, b) => a.min - b.min).map((band, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    Cart Order Value: {band.max === '+' ? `₹${band.min} +` : `₹${band.min} - ₹${band.max}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                                {band.charge === 0 ? 'FREE DELIVERY' : `₹${band.charge}`}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteBand(idx)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                type="button"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* COD Configuration form card */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-slate-500" /> Cash on Delivery Configuration
                            </h4>
                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">COD Fixed Fee (INR)</label>
                                <div className="relative flex items-center">
                                    <input 
                                        type="number"
                                        placeholder="5"
                                        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 font-semibold outline-none transition"
                                        value={codCharge}
                                        onChange={e => setCodCharge(e.target.value)}
                                        min="0"
                                    />
                                    <span className="absolute right-4 font-semibold text-slate-400 text-sm">INR</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Fixed convenience processing charge automatically added to orders placed via Cash on Delivery.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                            <button 
                                onClick={handleSavePricing}
                                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                                disabled={savingSettings}
                                type="button"
                            >
                                {savingSettings ? (
                                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Save size={16} />
                                )}
                                Persist Configurations
                            </button>
                        </div>
                    </div>

                    {/* Right: Add Band Form Panel */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Add Pricing Band</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Establish a new delivery band condition.</p>
                        </div>

                        <form onSubmit={handleAddBand} className="space-y-4">
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Min Cart Value (₹)</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 0"
                                    className="px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm outline-none transition text-slate-800"
                                    value={newMin}
                                    onChange={e => setNewMin(e.target.value)}
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Max Cart Value (₹)</label>
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="checkbox"
                                            id="plus-max"
                                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded cursor-pointer"
                                            checked={isPlusMax}
                                            onChange={e => setIsPlusMax(e.target.checked)}
                                        />
                                        <label htmlFor="plus-max" className="text-[10px] font-bold text-slate-400 cursor-pointer uppercase select-none">No upper limit (+)</label>
                                    </div>
                                </div>
                                <input 
                                    type="number"
                                    placeholder={isPlusMax ? "No upper limit (+)" : "e.g. 499"}
                                    className="px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm outline-none transition text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                                    value={newMax}
                                    onChange={e => setNewMax(e.target.value)}
                                    min="0"
                                    disabled={isPlusMax}
                                    required={!isPlusMax}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Delivery Fee (₹)</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 50 (0 for free delivery)"
                                    className="px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm outline-none transition text-slate-800"
                                    value={newCharge}
                                    onChange={e => setNewCharge(e.target.value)}
                                    min="0"
                                    required
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition border border-slate-800 shadow-md shadow-slate-800/10 cursor-pointer mt-2"
                            >
                                <Plus size={16} />
                                Add Rule Band
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
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
