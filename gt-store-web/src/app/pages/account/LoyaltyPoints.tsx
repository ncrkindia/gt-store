import { useState, useEffect } from "react";
import { Star, Clock, CheckCircle, Search, ArrowDownRight, ArrowUpRight } from "lucide-react";
import apiClient from "../../../api/axios";
import { Link } from "react-router";
import { toast } from "sonner";
import { useKeycloak } from "@react-keycloak/web";

export function LoyaltyPoints() {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(true);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      fetchLoyaltyData();
    }
  }, [initialized, keycloak.authenticated]);

  const fetchLoyaltyData = async () => {
    try {
      const response = await apiClient.get("/users/loyalty/history");
      setAvailablePoints(response.data.availablePoints || 0);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error("Failed to fetch loyalty history", error);
      toast.error("Failed to load loyalty points data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading Loyalty Points...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-8 shadow-lg shadow-amber-200/50 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Star className="w-48 h-48" fill="currentColor" />
        </div>
        
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-3xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
            <Star className="w-8 h-8 fill-white" />
            GT Rewards
          </h2>
          <p className="text-amber-100 font-medium max-w-md">
            Earn points on every order. 10% of your order value is credited as points after the 15-day return period!
          </p>
        </div>
        
        <div className="relative z-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 text-center min-w-[200px]">
          <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-4xl font-black">{availablePoints}</p>
          <p className="text-xs text-amber-200 mt-2">1 Point = ₹1</p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-gray-400" />
            Points History
          </h3>
        </div>
        
        {history.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">No History Found</h4>
            <p className="text-gray-500 max-w-sm">You haven't earned or used any points yet. Start shopping to earn rewards!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-gray-100">Date</th>
                  <th className="p-4 font-bold border-b border-gray-100">Transaction</th>
                  <th className="p-4 font-bold border-b border-gray-100">Order Ref</th>
                  <th className="p-4 font-bold border-b border-gray-100">Status</th>
                  <th className="p-4 font-bold border-b border-gray-100 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          entry.transactionType === 'EARNED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {entry.transactionType === 'EARNED' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{entry.transactionType === 'EARNED' ? 'Points Earned' : 'Points Redeemed'}</p>
                          <p className="text-xs text-gray-500 max-w-[200px] truncate" title={entry.description}>{entry.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {entry.orderId ? (
                        <Link to={`/orders/${entry.orderId}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {entry.orderId}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {entry.status === 'PENDING' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                          {entry.availableAt && (
                            <p className="text-[10px] text-gray-500 mt-1 mt-1 font-medium">Unlocks on {new Date(entry.availableAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : entry.status === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-base font-black ${
                        entry.transactionType === 'EARNED' ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {entry.transactionType === 'EARNED' ? '+' : '-'}{entry.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
