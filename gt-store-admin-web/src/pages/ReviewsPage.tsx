import { useState, useEffect } from "react";
import apiClient from "../api/axios";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { 
  Check, X, ShieldAlert, ChevronDown, ChevronRight, Star, Package, 
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronLeft 
} from "lucide-react";

const API_BASE = "https://gts-api.slpro.in";
const resolveImg = (img?: string): string => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const cleanPath = img.startsWith('/') ? img : '/' + img;
  if (cleanPath.startsWith('/api/media/files/')) {
    return `${API_BASE}${cleanPath}`;
  }
  return `${API_BASE}/api/media/files/${img}`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  NEEDS_REVIEW: { label: "Needs Review", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertTriangle },
  PENDING: { label: "Processing", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  APPROVED: { label: "Approved", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

export default function ReviewsPage() {
  const { keycloak, initialized } = useKeycloak();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const fetchPendingReviews = async () => {
    if (!keycloak.authenticated) return;
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/products/reviews/pending');
      setProducts(data);
      // Auto-expand all products by default
      setExpandedProducts(new Set(data.map((p: any) => p.id)));
    } catch (e) {
      console.error("Failed to fetch pending reviews", e);
      toast.error("Failed to fetch pending reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      fetchPendingReviews();
    }
  }, [initialized, keycloak.authenticated]);

  const handleModeration = async (productId: string, reviewId: string, status: string) => {
    setActionLoading(reviewId);
    try {
      await apiClient.put(`/api/products/${productId}/reviews/${reviewId}/status?status=${status}`);
      toast.success(`Review ${status.toLowerCase()} successfully`);
      fetchPendingReviews();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update review status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (productId: string, reviewIds: string[], status: string) => {
    setActionLoading(productId + "-bulk");
    try {
      for (const reviewId of reviewIds) {
        await apiClient.put(`/api/products/${productId}/reviews/${reviewId}/status?status=${status}`);
      }
      toast.success(`${reviewIds.length} review(s) ${status.toLowerCase()} successfully`);
      fetchPendingReviews();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update reviews");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const openLightbox = (images: string[], idx: number) => {
      setLightboxImages(images);
      setLightboxIdx(idx);
      setLightboxOpen(true);
  };

  if (!initialized || loading) return (
    <div className="bg-white backdrop-blur rounded-2xl p-12 text-center max-w-screen-xl mx-auto mt-8 shadow-sm border border-gray-200 text-slate-800">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="opacity-60">Loading Review Queue...</p>
    </div>
  );

  // Group pending reviews by product
  const productReviewGroups = products
    .map(p => ({
      product: p,
      pendingReviews: (p.reviews || []).filter((r: any) => r.status === "NEEDS_REVIEW" || r.status === "PENDING"),
      approvedCount: (p.reviews || []).filter((r: any) => r.status === "APPROVED").length,
      rejectedCount: (p.reviews || []).filter((r: any) => r.status === "REJECTED").length,
      totalReviews: (p.reviews || []).length,
    }))
    .filter(g => g.pendingReviews.length > 0);

  const totalPending = productReviewGroups.reduce((sum, g) => sum + g.pendingReviews.length, 0);

  return (
    <div className="max-w-screen-xl mx-auto py-6 space-y-8 text-slate-900 selection:bg-indigo-100">
      
      {/* Header Module */}
      <div className="bg-white rounded-2xl shadow-lg shadow-indigo-900/5 border border-indigo-50 p-8 relative overflow-hidden">
        {/* Vector Glow Effect */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Review Moderation</h1>
              <p className="text-slate-500 mt-1 font-medium">Action center for items flagged by automated analysis.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-stretch md:self-auto bg-indigo-50/50 border border-indigo-100 rounded-2xl p-2">
            <div className="px-6 py-2 text-center">
              <p className="text-3xl font-extrabold text-indigo-600 tabular-nums leading-none">{totalPending}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-1.5">Pending</p>
            </div>
            <div className="w-px h-10 bg-indigo-200/60" />
            <div className="px-6 py-2 text-center">
              <p className="text-3xl font-extrabold text-slate-700 tabular-nums leading-none">{productReviewGroups.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue State Content */}
      {productReviewGroups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 text-center py-24">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Queue Cleared</h2>
          <p className="text-slate-500">System healthy. No pending user reviews await action.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {productReviewGroups.map(({ product, pendingReviews, approvedCount, rejectedCount }) => {
            const isExpanded = expandedProducts.has(product.id);
            const needsReviewReviews = pendingReviews.filter((r: any) => r.status === "NEEDS_REVIEW");

            return (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                
                {/* Collapsible Row Header */}
                <div
                  className={`flex flex-col lg:flex-row items-stretch lg:items-center gap-4 p-5 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}
                  onClick={() => toggleProduct(product.id)}
                >
                  {/* Product Info Left Cell */}
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <img
                      src={resolveImg(product.images?.[0]) || 'https://placehold.co/80x80/f1f5f9/94a3b8?text=IMG'}
                      alt=""
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg truncate leading-snug max-w-md">
                            {product.name}
                        </h3>
                        {product.brand && (
                            <span className="text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                                {product.brand}
                            </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="capitalize">{product.categoryIds?.[0] || 'Standard catalog'}</span>
                        </span>
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 text-xs">
                            <span>History:</span>
                            {approvedCount > 0 && <span className="text-green-600">✓ {approvedCount} passed</span>}
                            {rejectedCount > 0 && <span className="text-rose-600">✕ {rejectedCount} failed</span>}
                            {approvedCount === 0 && rejectedCount === 0 && <span className="italic opacity-60">No history</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Cell - Status Badge + Bulk Control */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {pendingReviews.length} Queue
                        </span>

                        {needsReviewReviews.length > 1 && (
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden shadow-sm ml-2">
                            <button
                                onClick={() => handleBulkAction(product.id, needsReviewReviews.map((r: any) => r.id), "APPROVED")}
                                disabled={actionLoading === product.id + "-bulk"}
                                className="bg-white hover:bg-green-50 text-green-700 font-bold text-xs py-2 px-3 border-r border-slate-200 transition disabled:opacity-50 disabled:hover:bg-white"
                            >
                            Approve All
                            </button>
                            <button
                                onClick={() => handleBulkAction(product.id, needsReviewReviews.map((r: any) => r.id), "REJECTED")}
                                disabled={actionLoading === product.id + "-bulk"}
                                className="bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs py-2 px-3 transition disabled:opacity-50 disabled:hover:bg-white"
                            >
                            Reject All
                            </button>
                        </div>
                        )}
                    </div>

                    <button className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 transition-colors" onClick={() => toggleProduct(product.id)}>
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Subcontent - List of Individual reviews */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {pendingReviews.map((review: any, idx: number) => {
                      const statusCfg = STATUS_CONFIG[review.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = statusCfg.icon;
                      const isProcessing = actionLoading === review.id;

                      return (
                        <div
                          key={review.id || idx}
                          className={`flex flex-col lg:flex-row gap-6 p-6 ${idx > 0 ? 'border-t border-slate-200/50' : ''} hover:bg-white transition-colors`}
                        >
                          {/* Main Body containing content & media */}
                          <div className="flex-1 min-w-0">
                            {/* Sub Row: Metadata Header */}
                            <div className="flex items-center gap-3 mb-3.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border shadow-sm ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusCfg.label.toUpperCase()}
                              </span>

                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm text-white ${review.rating > 3 ? 'bg-emerald-500' : review.rating === 3 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                {review.rating} <Star className="w-3 h-3 fill-current" />
                              </span>
                              
                              <div className="flex items-center gap-2 ml-1 font-semibold text-slate-800 text-sm">
                                {review.userName || 'System ID: Non-Auth'}
                              </div>
                              
                              <span className="text-xs font-medium text-slate-400 ml-auto flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(review.date).toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'})}
                              </span>
                            </div>

                            {/* The actual comment bubble */}
                            <div className={`rounded-xl p-4 text-[15px] font-normal text-slate-800 border leading-relaxed mb-4 relative ${review.status === 'NEEDS_REVIEW' ? 'bg-amber-50/30 border-amber-200/60' : 'bg-white border-slate-200'}`}>
                                {review.status === 'NEEDS_REVIEW' && (
                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-amber-400 border border-white" />
                                )}
                                <p>"{review.comment}"</p>
                            </div>

                            {/* Render Attached Thumbnails */}
                            {review.images && review.images.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {review.images.map((img: string, i: number) => (
                                  <div 
                                    key={i} 
                                    className="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer ring-2 ring-offset-1 ring-transparent hover:ring-indigo-400 transition-all"
                                    onClick={() => openLightbox(review.images, i)}
                                  >
                                    <img
                                      src={resolveImg(img)}
                                      alt=""
                                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Individual Action Bar Right Side */}
                          <div className="lg:border-l border-slate-200/60 lg:pl-6 flex lg:flex-col gap-3 min-w-[140px] justify-end">
                            <button
                              onClick={() => handleModeration(product.id, review.id, "APPROVED")}
                              disabled={isProcessing}
                              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition disabled:opacity-60"
                            >
                              {isProcessing ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-4.5 h-4.5" /> Approve</>}
                            </button>
                            
                            <button
                              onClick={() => handleModeration(product.id, review.id, "REJECTED")}
                              disabled={isProcessing}
                              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border-2 border-rose-100 hover:border-rose-200 text-rose-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-rose-50 transition disabled:opacity-60"
                            >
                              <X className="w-4.5 h-4.5" /> Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Module Layered On Top */}
      {lightboxOpen && lightboxImages.length > 0 && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setLightboxOpen(false)}>
              <button 
                  className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10 rounded-full p-3 transition-all"
                  onClick={() => setLightboxOpen(false)}
              >
                  <X className="w-6 h-6" />
              </button>

              <div className="relative w-full max-w-5xl flex items-center justify-center px-8" onClick={(e) => e.stopPropagation()}>
                  {lightboxImages.length > 1 && (
                      <button 
                          className="absolute left-0 bg-white hover:bg-white/10 text-white p-4 rounded-full transition-all backdrop-blur-sm border border-gray-100"
                          onClick={(e) => {
                              e.stopPropagation();
                              setLightboxIdx(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                          }}
                      >
                          <ChevronLeft className="w-8 h-8" />
                      </button>
                  )}

                  <img 
                      src={resolveImg(lightboxImages[lightboxIdx])} 
                      alt="High-resolution attachment" 
                      className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-300"
                  />

                  {lightboxImages.length > 1 && (
                      <button 
                          className="absolute right-0 bg-white hover:bg-white/10 text-white p-4 rounded-full transition-all backdrop-blur-sm border border-gray-100"
                          onClick={(e) => {
                              e.stopPropagation();
                              setLightboxIdx(prev => (prev + 1) % lightboxImages.length);
                          }}
                      >
                          <ChevronRight className="w-8 h-8" />
                      </button>
                  )}
              </div>

              {lightboxImages.length > 1 && (
                  <div className="mt-10 flex gap-3 overflow-x-auto px-6 py-2 max-w-full custom-scrollbar" onClick={e => e.stopPropagation()}>
                      {lightboxImages.map((thumb, idx) => (
                          <button
                              key={idx}
                              onClick={() => setLightboxIdx(idx)}
                              className={`w-16 h-16 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${idx === lightboxIdx ? 'border-indigo-500 scale-110 shadow-xl' : 'border-transparent opacity-40 hover:opacity-90'}`}
                          >
                              <img src={resolveImg(thumb)} className="w-full h-full object-cover" alt="" />
                          </button>
                      ))}
                  </div>
              )}
          </div>
      )}

    </div>
  );
}
