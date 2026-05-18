import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Award, Sparkles, Save, RefreshCw, Gift, AlertCircle, Percent } from 'lucide-react';
import { toast } from 'sonner';

const LoyaltyPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings States
    const [earnRate, setEarnRate] = useState('10');
    const [returnDays, setReturnDays] = useState('15');
    const [maxUsage, setMaxUsage] = useState('20');
    const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);

    const fetchSettings = async () => {
        if (!keycloak.authenticated) return;
        try {
            setLoading(true);
            
            // 1. Fetch user-service loyalty settings (earn rate, return window)
            const userRes = await apiClient.get('/api/users/loyalty/settings');
            if (userRes.data) {
                if (userRes.data.LOYALTY_EARN_RATE_PERCENT) {
                    setEarnRate(userRes.data.LOYALTY_EARN_RATE_PERCENT);
                }
                if (userRes.data.RETURN_PERIOD_DAYS) {
                    setReturnDays(userRes.data.RETURN_PERIOD_DAYS);
                }
            }

            // 2. Fetch order-service settings (max usage cap, enabled status)
            const orderRes = await apiClient.get('/api/orders/settings');
            if (orderRes.data) {
                if (orderRes.data.LOYALTY_MAX_USAGE_PERCENT) {
                    setMaxUsage(orderRes.data.LOYALTY_MAX_USAGE_PERCENT);
                }
                if (orderRes.data.LOYALTY_PROGRAM_ENABLED) {
                    setLoyaltyEnabled(orderRes.data.LOYALTY_PROGRAM_ENABLED === 'true');
                }
            }
        } catch (error) {
            console.error("Error loading settings", error);
            toast.error("Failed to load global loyalty settings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) fetchSettings();
    }, [initialized, keycloak.authenticated]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const rateNum = Number(earnRate);
        const daysNum = Number(returnDays);
        const usageNum = Number(maxUsage);

        if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
            toast.error("Earning rate must be a valid percentage between 0 and 100.");
            return;
        }
        if (isNaN(daysNum) || daysNum < 0) {
            toast.error("Return period must be 0 or more days.");
            return;
        }
        if (isNaN(usageNum) || usageNum < 0 || usageNum > 100) {
            toast.error("Maximum usage must be a valid percentage between 0 and 100.");
            return;
        }

        try {
            setSaving(true);
            
            // 1. Save user-service settings
            await apiClient.post('/api/users/loyalty/settings', {
                LOYALTY_EARN_RATE_PERCENT: earnRate.toString(),
                RETURN_PERIOD_DAYS: returnDays.toString()
            });

            // 2. Save order-service settings
            await apiClient.post('/api/orders/settings', {
                LOYALTY_MAX_USAGE_PERCENT: maxUsage.toString(),
                LOYALTY_PROGRAM_ENABLED: loyaltyEnabled.toString()
            });

            toast.success("Loyalty program parameters saved successfully!");
            fetchSettings();
        } catch (error) {
            console.error("Error saving settings", error);
            toast.error("Failed to update loyalty settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p>Retrieving loyalty settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header banner */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
                        <Award size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Loyalty Program Control Board</h1>
                            {loyaltyEnabled ? (
                                <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">
                                    <Sparkles size={10} /> Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-wide">
                                    Disabled
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">Configure point accumulation scales, release schedules, and maximum deduction percentage limits.</p>
                    </div>
                </div>
            </div>

            {/* Explainer Widgets / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 p-6 rounded-2xl relative shadow-sm">
                    <div className="absolute top-4 right-4 text-indigo-400">
                        <Gift size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Accumulation Scale</span>
                    <p className="text-xl font-bold text-slate-800 mt-2">{earnRate}% Points Earned</p>
                    <p className="text-xs text-slate-500 mt-1">Customers earn {earnRate}% of order value (excluding shipping/COD fees) as redeemable store points.</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100 p-6 rounded-2xl relative shadow-sm">
                    <div className="absolute top-4 right-4 text-purple-400">
                        <AlertCircle size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Release Threshold</span>
                    <p className="text-xl font-bold text-slate-800 mt-2">{returnDays} Days Lock-in</p>
                    <p className="text-xs text-slate-500 mt-1">Points remain pending until the return period of {returnDays} days expires after package delivery.</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 p-6 rounded-2xl relative shadow-sm">
                    <div className="absolute top-4 right-4 text-amber-400">
                        <Percent size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Deduction Cap</span>
                    <p className="text-xl font-bold text-slate-800 mt-2">Max {maxUsage}% of Cart</p>
                    <p className="text-xs text-slate-500 mt-1">Limits single transaction redemptions. Customers can pay up to {maxUsage}% of order totals using points.</p>
                </div>
            </div>

            {/* Configuration Form */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                        System settings parameters
                    </h3>

                    {/* Operational Enable/Disable switch with Premium Aesthetics */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:shadow-sm">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                Loyalty Program Functional Status
                            </h4>
                            <p className="text-xs text-slate-400">
                                When disabled, customers cannot earn or redeem points on checkout, and the loyalty sub-pages are suppressed from their dashboards. Past order data remains unaffected.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-wider ${loyaltyEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {loyaltyEnabled ? "Active / Enabled" : "Inactive / Disabled"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${loyaltyEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${loyaltyEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Earn Rate */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    Points Earn Percentage (%)
                                </label>
                                <span className="text-[10px] text-slate-400">Default: 10%</span>
                            </div>
                            <div className="relative flex items-center">
                                <input 
                                    type="number"
                                    placeholder="10"
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 font-medium outline-none transition"
                                    value={earnRate}
                                    onChange={e => setEarnRate(e.target.value)}
                                    min="0"
                                    max="100"
                                    required
                                />
                                <span className="absolute right-4 font-semibold text-slate-400 text-sm">%</span>
                            </div>
                            <p className="text-[11px] text-slate-400">Defines how many loyalty points are credited to the customer. 1 Point = 1 INR value.</p>
                        </div>

                        {/* Lock-in Window */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Return Lock-in Window (Days)
                                </label>
                                <span className="text-[10px] text-slate-400">Default: 15 Days</span>
                            </div>
                            <div className="relative flex items-center">
                                <input 
                                    type="number"
                                    placeholder="15"
                                    className="w-full pl-4 pr-16 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 font-medium outline-none transition"
                                    value={returnDays}
                                    onChange={e => setReturnDays(e.target.value)}
                                    min="0"
                                    required
                                />
                                <span className="absolute right-4 font-semibold text-slate-400 text-xs">DAYS</span>
                            </div>
                            <p className="text-[11px] text-slate-400">Protects store against abuse by holding points in 'PENDING' status until the product's return window expires.</p>
                        </div>

                        {/* Max Usage Limit */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Maximum Redemption Cap (%)
                                </label>
                                <span className="text-[10px] text-slate-400">Default: 20%</span>
                            </div>
                            <div className="relative flex items-center">
                                <input 
                                    type="number"
                                    placeholder="20"
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 font-medium outline-none transition"
                                    value={maxUsage}
                                    onChange={e => setMaxUsage(e.target.value)}
                                    min="0"
                                    max="100"
                                    required
                                />
                                <span className="absolute right-4 font-semibold text-slate-400 text-sm">%</span>
                            </div>
                            <p className="text-[11px] text-slate-400">The upper limit of cart totals payable using loyalty points. Prevents checkout with zero cash payable.</p>
                        </div>

                    </div>

                    {/* Form Controls */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                        <button 
                            type="button" 
                            onClick={fetchSettings}
                            className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
                            disabled={saving}
                        >
                            <RefreshCw size={15} />
                            Reset Settings
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                            disabled={saving}
                        >
                            {saving ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Save size={16} />
                            )}
                            Save Configurations
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoyaltyPage;
