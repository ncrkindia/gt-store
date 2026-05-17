import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { 
    Percent, Plus, Trash2, Edit3, 
    Check, X, ToggleLeft, ToggleRight, Tag, Users, Package, Search
} from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
    id?: number;
    code: string;
    discountType: string; // FIXED_CART, PERCENT_CART, FIXED_PRODUCT, PERCENT_PRODUCT
    discountValue: number;
    maxDiscountCap?: number;
    minOrderValue?: number;
    startDate?: string;
    expiryDate?: string;
    active: boolean;
    applicableProductIds?: string;
    minQuantity?: number;
    applicableUserIds?: string;
    isRefundCompensation: boolean;
    usagePolicy?: string;
}

const CouponsPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal & Form State
    const [isOpen, setIsOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState('PERCENT_CART');
    const [discountValue, setDiscountValue] = useState(10);
    const [maxDiscountCap, setMaxDiscountCap] = useState<string>('');
    const [minOrderValue, setMinOrderValue] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [applicableProductIds, setApplicableProductIds] = useState('');
    const [minQuantity, setMinQuantity] = useState<string>('');
    const [applicableUserIds, setApplicableUserIds] = useState('');
    const [isRefundCompensation, setIsRefundCompensation] = useState(false);
    const [active, setActive] = useState(true);
    const [usagePolicy, setUsagePolicy] = useState('UNLIMITED');

    const isRefundEditDisabled = isEdit && isRefundCompensation;

    const fetchCoupons = async () => {
        if (!keycloak.authenticated) return;
        try {
            setLoading(true);
            const res = await apiClient.get('/api/orders/coupons');
            setCoupons(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching coupons", error);
            toast.error("Failed to retrieve coupon catalog.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) fetchCoupons();
    }, [initialized, keycloak.authenticated]);

    const generateRefundCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'TA';
        for (let i = 0; i < 14; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSelectedId(null);
        setCode('');
        setDiscountType('PERCENT_CART');
        setDiscountValue(10);
        setMaxDiscountCap('');
        setMinOrderValue('');
        setStartDate('');
        setExpiryDate('');
        setApplicableProductIds('');
        setMinQuantity('');
        setApplicableUserIds('');
        setIsRefundCompensation(false);
        setActive(true);
        setUsagePolicy('UNLIMITED');
        setIsOpen(true);
    };

    const handleOpenEdit = (c: Coupon) => {
        setIsEdit(true);
        setSelectedId(c.id || null);
        setCode(c.code);
        setDiscountType(c.discountType);
        setDiscountValue(c.discountValue);
        setMaxDiscountCap(c.maxDiscountCap ? c.maxDiscountCap.toString() : '');
        setMinOrderValue(c.minOrderValue ? c.minOrderValue.toString() : '');
        setStartDate(c.startDate ? c.startDate.substring(0, 16) : '');
        setExpiryDate(c.expiryDate ? c.expiryDate.substring(0, 16) : '');
        setApplicableProductIds(c.applicableProductIds || '');
        setMinQuantity(c.minQuantity ? c.minQuantity.toString() : '');
        setApplicableUserIds(c.applicableUserIds || '');
        setIsRefundCompensation(c.isRefundCompensation || false);
        setActive(c.active);
        setUsagePolicy(c.usagePolicy || 'UNLIMITED');
        setIsOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!code.trim()) {
            toast.error("Coupon code cannot be empty");
            return;
        }

        if (isRefundCompensation && !applicableUserIds.trim()) {
            toast.error("Store Refund/Compensation coupons must have at least one user specified under 'Applicable Users'");
            return;
        }

        const payload: Coupon = {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : undefined,
            minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
            applicableProductIds: applicableProductIds.trim() || undefined,
            minQuantity: minQuantity ? Number(minQuantity) : undefined,
            applicableUserIds: applicableUserIds.trim() || undefined,
            isRefundCompensation,
            active,
            usagePolicy: isRefundCompensation ? 'ONCE_LIFESPAN' : usagePolicy
        };

        try {
            if (isEdit && selectedId !== null) {
                await apiClient.put(`/api/orders/coupons/${selectedId}`, payload);
                toast.success(`Coupon ${code.toUpperCase()} successfully updated!`);
            } else {
                await apiClient.post('/api/orders/coupons', payload);
                toast.success(`Coupon ${code.toUpperCase()} successfully created!`);
            }
            setIsOpen(false);
            fetchCoupons();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data || "Operation failed. Ensure code is unique.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this coupon?")) return;
        try {
            await apiClient.delete(`/api/orders/coupons/${id}`);
            toast.success("Coupon code successfully deleted!");
            fetchCoupons();
        } catch (error) {
            toast.error("Failed to delete coupon.");
        }
    };

    const handleToggleActive = async (c: Coupon) => {
        try {
            const updated = { ...c, active: !c.active };
            await apiClient.put(`/api/orders/coupons/${c.id}`, updated);
            toast.success(`Coupon status updated successfully!`);
            fetchCoupons();
        } catch (error) {
            toast.error("Failed to update status.");
        }
    };

    const formatValue = (c: Coupon) => {
        if (c.discountType.includes('PERCENT')) {
            return `${c.discountValue}%`;
        }
        return `₹${c.discountValue}`;
    };

    const filteredCoupons = coupons.filter(c => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
            c.code.toLowerCase().includes(query) ||
            c.discountType.toLowerCase().includes(query) ||
            (c.applicableProductIds && c.applicableProductIds.toLowerCase().includes(query)) ||
            (c.applicableUserIds && c.applicableUserIds.toLowerCase().includes(query))
        );
    });

    if (loading && coupons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p>Retrieving coupon parameters...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Percent size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coupons & Promos</h1>
                        <p className="text-slate-500 text-sm">Configure marketing campaign rules, user-specific compensations, and discount thresholds.</p>
                    </div>
                </div>

                <button 
                    onClick={handleOpenCreate} 
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition border border-indigo-600 shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                    <Plus size={18} />
                    New Promo Code
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Tag size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Campaigns</span>
                        <p className="text-2xl font-bold text-slate-800">{coupons.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Check size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Codes</span>
                        <p className="text-2xl font-bold text-slate-800">{coupons.filter(c => c.active).length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                        <X size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disabled Codes</span>
                        <p className="text-2xl font-bold text-slate-800">{coupons.filter(c => !c.active).length}</p>
                    </div>
                </div>
            </div>

            {/* Search & Actions Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search coupons by code, type, products, users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="text-xs text-slate-500 font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                        Found {filteredCoupons.length} matching coupons
                    </div>
                )}
            </div>

            {/* Coupons Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Promo Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type & Value</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Threshold & Limits</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Applicability</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Active Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {coupons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                        No active coupon campaigns configured.
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                        No coupons match your search query "{searchQuery}".
                                    </td>
                                </tr>
                            ) : (
                                filteredCoupons.map(c => (
                                    <tr key={c.id} className="hover:bg-indigo-50/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded inline-block">
                                                {c.code}
                                            </div>
                                            {c.isRefundCompensation && (
                                                <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                                                    Refund Compensation/Store Credit
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{formatValue(c)}</div>
                                            <div className="text-slate-400 text-xs mt-0.5">{c.discountType}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 text-xs">
                                                Min Order: <span className="font-medium">₹{c.minOrderValue || 0}</span>
                                            </div>
                                            {c.maxDiscountCap && (
                                                <div className="text-slate-500 text-xs mt-0.5">
                                                    Upper Cap: <span className="font-medium">₹{c.maxDiscountCap}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {c.applicableProductIds ? (
                                                <div className="flex items-center gap-1 text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 w-max mb-1">
                                                    <Package size={12} />
                                                    <span>Product Restricted ({c.applicableProductIds.split(',').length})</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">All Products</span>
                                            )}
                                            {c.applicableUserIds ? (
                                                <div className="flex items-center gap-1 text-slate-600 bg-indigo-50/50 rounded px-1.5 py-0.5 w-max mt-1">
                                                    <Users size={12} className="text-indigo-500" />
                                                    <span>User Specific ({c.applicableUserIds.split(',').length})</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 block mt-0.5">All Users</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleActive(c)} className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                                                {c.active ? (
                                                    <ToggleRight size={32} className="text-emerald-500" />
                                                ) : (
                                                    <ToggleLeft size={32} className="text-slate-300" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={() => handleOpenEdit(c)} 
                                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                                                title="Edit Coupon"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(c.id!)} 
                                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                                                title="Delete Coupon"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Dialog */}
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Modify Coupon Campaign' : 'Create New Promotional Code'}</h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            
                            <div className="flex flex-col space-y-1.5 col-span-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Coupon Code</label>
                                <div className="flex gap-2">
                                    <input 
                                        placeholder={isRefundCompensation ? "Generating..." : "e.g. SAVE20"}
                                        className={`flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition uppercase text-slate-800 ${
                                            isRefundCompensation ? 'bg-slate-50 text-slate-500 font-mono cursor-not-allowed' : ''
                                        }`}
                                        value={code}
                                        onChange={e => {
                                            if (!isRefundCompensation) {
                                                setCode(e.target.value.toUpperCase());
                                            }
                                        }}
                                        disabled={isRefundCompensation || isRefundEditDisabled}
                                        required
                                    />
                                    {isRefundCompensation && !isRefundEditDisabled && (
                                        <button
                                            type="button"
                                            onClick={() => setCode(generateRefundCode())}
                                            className="px-3 py-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition cursor-pointer"
                                        >
                                            Regenerate
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Discount Category</label>
                                <select 
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                >
                                    <option value="PERCENT_CART">% Off Cart Total</option>
                                    <option value="FIXED_CART">Flat Price Off Cart Total</option>
                                    <option value="PERCENT_PRODUCT">% Off Single Product</option>
                                    <option value="FIXED_PRODUCT">Flat Price Off Single Product</option>
                                </select>
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Value Rate</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 10 or 100"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(Number(e.target.value))}
                                    min="1"
                                    required
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Max Upper Cap (Discount Limit)</label>
                                <input 
                                    type="number"
                                    placeholder="Leave blank for no upper cap"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={maxDiscountCap}
                                    onChange={e => setMaxDiscountCap(e.target.value)}
                                    min="0"
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Minimum Cart Order Value (Threshold)</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 500"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={minOrderValue}
                                    onChange={e => setMinOrderValue(e.target.value)}
                                    min="0"
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Minimum Product Quantity</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 2 (Rule A: Minimum count)"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={minQuantity}
                                    onChange={e => setMinQuantity(e.target.value)}
                                    min="0"
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Applicable Products (Product Restrictions)</label>
                                <input 
                                    placeholder="Comma separated Product IDs (Leave empty for sitewide)"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={applicableProductIds}
                                    onChange={e => setApplicableProductIds(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Applicable Users (Audience Restrictions)</label>
                                <input 
                                    placeholder="Comma separated User Emails or IDs (Leave empty for public accessibility)"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={applicableUserIds}
                                    onChange={e => setApplicableUserIds(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                             <div className="flex flex-col space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">User Usage Restriction Policy</label>
                                <select 
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={usagePolicy}
                                    onChange={e => setUsagePolicy(e.target.value)}
                                    disabled={isRefundEditDisabled || isRefundCompensation}
                                >
                                    <option value="UNLIMITED">Unlimited Use (Standard reusable promotion)</option>
                                    <option value="ONCE_LIFESPAN">Single Use by User (Once in lifespan of coupon)</option>
                                    <option value="ONCE_DAILY">Single Use per User per Day (24-hour cooling window)</option>
                                    <option value="ONCE_WEEKLY">Single Use per User per Week (7-day cooling window)</option>
                                    <option value="ONCE_MONTHLY">Single Use per User per Month (30-day cooling window)</option>
                                </select>
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                                <input 
                                    type="datetime-local"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Expiry Date</label>
                                <input 
                                    type="datetime-local"
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={expiryDate}
                                    onChange={e => setExpiryDate(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                />
                            </div>

                            <div className="flex items-center gap-3 mt-4 md:col-span-2">
                                <input 
                                    type="checkbox"
                                    id="isRefundCompensation"
                                    className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                    checked={isRefundCompensation}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setIsRefundCompensation(checked);
                                        if (checked) {
                                            setCode(generateRefundCode());
                                            setUsagePolicy("ONCE_LIFESPAN");
                                        } else {
                                            setCode('');
                                            setUsagePolicy("UNLIMITED");
                                        }
                                    }}
                                    disabled={isEdit || isRefundEditDisabled}
                                />
                                <label htmlFor="isRefundCompensation" className={`text-sm font-semibold text-slate-700 cursor-pointer select-none ${isEdit ? 'text-slate-400 cursor-not-allowed' : ''}`}>
                                    Flag as Store Refund/Compensation Code (Rule D)
                                </label>
                            </div>

                            <div className="flex items-center gap-3 mt-1 md:col-span-2">
                                <input 
                                    type="checkbox"
                                    id="active"
                                    className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                    checked={active}
                                    onChange={e => setActive(e.target.checked)}
                                />
                                <label htmlFor="active" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                    Activate immediately upon save
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 md:col-span-2 mt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/10 cursor-pointer"
                                >
                                    Save Rules
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponsPage;
