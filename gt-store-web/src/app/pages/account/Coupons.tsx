import { useState, useEffect } from "react";
import { Tag, Calendar, AlertCircle, Sparkles, Check, Gift, Copy, Search, ExternalLink } from "lucide-react";
import apiClient from "../../../api/axios";
import { toast } from "sonner";
import { useKeycloak } from "@react-keycloak/web";

interface Coupon {
  id: number;
  code: string;
  discountType: string;
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

export function Coupons() {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      fetchCoupons();
    }
  }, [initialized, keycloak.authenticated]);

  const fetchCoupons = async () => {
    try {
      const response = await apiClient.get("/orders/coupons");
      setCoupons(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch coupons", error);
      toast.error("Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getHumanReadableType = (type: string) => {
    if (type.includes("PERCENT")) return "Percentage Discount";
    return "Flat Cash Discount";
  };

  const getCouponHumanDescription = (coupon: Coupon) => {
    const isPercent = coupon.discountType.includes("PERCENT");
    const isCart = coupon.discountType.includes("CART");
    const val = coupon.discountValue;

    let desc = "";
    if (isPercent) {
      desc = `${val}% OFF`;
      if (coupon.maxDiscountCap) {
        desc += ` up to ₹${coupon.maxDiscountCap}`;
      }
    } else {
      desc = `Flat ₹${val} OFF`;
    }

    if (isCart) {
      desc += " on your total order value.";
    } else {
      desc += " on selected promotional products.";
    }

    const rules = [];
    if (coupon.minOrderValue) {
      rules.push(`Valid on orders above ₹${coupon.minOrderValue}`);
    }
    if (coupon.minQuantity && coupon.minQuantity > 1) {
      rules.push(`Requires at least ${coupon.minQuantity} items`);
    }
    if (coupon.applicableUserIds) {
      rules.push("Exclusive user-specific special code");
    }
    if (coupon.isRefundCompensation) {
      rules.push("Refund/Compensation balance code");
    }
    if (coupon.usagePolicy) {
      const up = coupon.usagePolicy.toUpperCase();
      if (up === "ONCE_LIFESPAN") {
        rules.push("Single use per profile");
      } else if (up === "ONCE_DAILY") {
        rules.push("Once daily");
      } else if (up === "ONCE_WEEKLY") {
        rules.push("Once weekly");
      } else if (up === "ONCE_MONTHLY") {
        rules.push("Once monthly");
      }
    }

    return {
      main: desc,
      rules: rules.length > 0 ? rules.join(" • ") : "No minimum transaction conditions."
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Fetching exclusive coupons...</p>
      </div>
    );
  }

  // Filter to active and unexpired coupons
  const now = new Date();
  const activeCoupons = coupons.filter(c => {
    if (!c.active) return false;
    if (c.expiryDate && new Date(c.expiryDate) < now) return false;
    return true;
  });

  const expiredCoupons = coupons.filter(c => {
    return !c.active || (c.expiryDate && new Date(c.expiryDate) < now);
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Gift className="w-48 h-48" fill="currentColor" />
        </div>
        
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl font-black mb-2 flex items-center justify-center md:justify-start gap-2 tracking-tight">
            <Gift className="w-8 h-8" />
            Vouchers & Coupons
          </h2>
          <p className="text-indigo-100 font-medium max-w-md text-sm mt-1">
            Unlock additional checkout deductions by applying exclusive promo codes, special refunds, or limited-time campaign bonuses.
          </p>
        </div>
        
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center min-w-[200px]">
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Available Vouchers</p>
          <p className="text-4xl font-black">{activeCoupons.length}</p>
          <p className="text-xs text-indigo-200 mt-2">Apply directly during checkout</p>
        </div>
      </div>

      {/* Active Coupons Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-indigo-500 w-5 h-5" />
          Active Promotional Offers
        </h3>
        
        {activeCoupons.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No promo codes active right now</h4>
            <p className="text-xs text-slate-400 mt-1">Check back later or join our premium loyalty club to earn special coupons!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeCoupons.map((coupon) => {
              const info = getCouponHumanDescription(coupon);
              return (
                <div 
                  key={coupon.id}
                  className="bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-lg rounded-2xl shadow-sm transition-all duration-300 flex overflow-hidden group relative"
                >
                  {/* Left coupon ticket element */}
                  <div className="w-4 bg-gradient-to-b from-indigo-500 to-purple-600 shrink-0 relative flex flex-col justify-between py-2">
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                  </div>

                  {/* Coupon card details */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100/50">
                          {getHumanReadableType(coupon.discountType)}
                        </span>
                        {coupon.expiryDate && (
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                            <Calendar size={10} /> Exp: {new Date(coupon.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-base font-bold text-gray-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {info.main}
                      </h4>
                      <p className="text-xs text-gray-400 mt-2 font-medium flex items-center gap-1">
                        <AlertCircle size={12} className="text-indigo-400 shrink-0" />
                        {info.rules}
                      </p>
                    </div>

                    {/* Ticket notch cut and promo code line */}
                    <div className="mt-6 pt-4 border-t border-dashed border-slate-100 flex items-center justify-between">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-slate-700 tracking-wider flex items-center gap-2">
                        <Tag size={13} className="text-slate-400" />
                        {coupon.code}
                      </div>

                      <button
                        onClick={() => copyToClipboard(coupon.code)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-600/10 cursor-pointer"
                        type="button"
                      >
                        {copiedCode === coupon.code ? (
                          <>
                            <Check size={12} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expired Coupons */}
      {expiredCoupons.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
            Archived or Expired Vouchers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
            {expiredCoupons.map((coupon) => {
              const info = getCouponHumanDescription(coupon);
              return (
                <div 
                  key={coupon.id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm flex overflow-hidden relative"
                >
                  <div className="w-4 bg-slate-300 shrink-0 relative flex flex-col justify-between py-2">
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                    <div className="w-2 h-2 bg-gray-50 rounded-full -translate-x-1" />
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-0.5 bg-gray-50 rounded border border-gray-200">
                          Inactive Voucher
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          Expired
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-gray-500 line-through">
                        {info.main}
                      </h4>
                      <p className="text-xs text-gray-400 mt-2">
                        {info.rules}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-dashed border-slate-100 flex items-center justify-between">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-gray-400 line-through tracking-wider">
                        {coupon.code}
                      </div>
                      <span className="text-xs text-gray-400 font-semibold">Not Applicable</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
