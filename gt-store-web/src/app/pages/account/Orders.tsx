import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Package, Truck, CheckCircle, XCircle, Star } from "lucide-react";
import apiClient from "../../../api/axios";
import { useKeycloak } from "@react-keycloak/web";
import { formatPrice } from "../../../lib/formatPrice";
import { toast } from "sonner";

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

export function Orders() {
  const { keycloak, initialized } = useKeycloak();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewOrderVisible, setReviewOrderVisible] = useState<string | null>(null);
  const [reviewProductId, setReviewProductId] = useState<string>("");
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data } = await apiClient.get('/orders');
      
      // we need to fetch product metadata for order items since OrderItem only stores productId, variantId, quantity, price.
      // Gather unique products
      const productIds = Array.from(new Set(data.flatMap((o:any) => o.items?.map((i:any) => i.productId))));
      if (productIds.length > 0) {
        const pMapResp = await apiClient.post('/products/bulk', productIds);
        const map = new Map(pMapResp.data.map((p:any) => [p.id, p]));
        
        data.forEach((o:any) => {
            o.items.forEach((item:any) => {
                item.productData = map.get(item.productId);
            });
        });
      }
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    if (!keycloak.authenticated) { keycloak.login(); return; }
    fetchOrders();
  }, [initialized, keycloak.authenticated]);

  const handleCancelOrder = async (orderId: string) => {
    if(!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (e) {
      console.error(e);
      toast.error("Unable to cancel the order.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (reviewImages.length >= 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    setUploadingImage(true);
    try {
      const { data } = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setReviewImages(prev => [...prev, data.fileName || data.url]);
      toast.success("Image uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image.");
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // clear input
    }
  };

  const submitReview = async () => {
    try {
        await apiClient.post(`/products/${reviewProductId}/reviews`, {
            rating: reviewRating,
            comment: reviewComment,
            images: reviewImages,
            orderId: reviewOrderVisible
        });
        toast.success("Review submitted successfully!");
        setReviewOrderVisible(null);
        setReviewComment("");
        setReviewRating(5);
        setReviewImages([]);
        fetchOrders();
    } catch (e) {
        console.error(e);
        toast.error("Failed to submit review.");
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING_PAYMENT": return "Waiting for Payment";
      case "PAID": return "Payment Received";
      case "AWAITING_FULFILLMENT": return "Processing Order";
      case "ORDER_CONFIRMED": return "Confirmed";
      case "SHIPPED": return "Out for Delivery";
      case "DELIVERED": return "Delivered";
      case "CANCELLED":
      case "CANCELLED_BY_CUSTOMER": return "Cancelled";
      case "PAYMENT_FAILED": return "Payment Failed";
      case "FULFILLMENT_FAILED": return "Processing Error";
      case "LOCATION_NOT_SERVICABLE": return "Unservicable Area";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "DELIVERED": return "text-emerald-600 bg-emerald-50";
      case "SHIPPED": return "text-blue-600 bg-blue-50";
      case "ORDER_CONFIRMED":
      case "PAID": return "text-indigo-600 bg-indigo-50";
      case "AWAITING_FULFILLMENT":
      case "PENDING_PAYMENT": return "text-amber-600 bg-amber-50";
      case "CANCELLED":
      case "CANCELLED_BY_CUSTOMER":
      case "PAYMENT_FAILED":
      case "FULFILLMENT_FAILED":
      case "LOCATION_NOT_SERVICABLE": return "text-rose-600 bg-rose-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "DELIVERED": return <CheckCircle className="w-5 h-5" />;
      case "SHIPPED": return <Truck className="w-5 h-5" />;
      case "ORDER_CONFIRMED":
      case "PAID":
      case "AWAITING_FULFILLMENT":
      case "PENDING_PAYMENT": return <Package className="w-5 h-5" />;
      case "CANCELLED":
      case "CANCELLED_BY_CUSTOMER":
      case "PAYMENT_FAILED":
      case "FULFILLMENT_FAILED":
      case "LOCATION_NOT_SERVICABLE": return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  if (!initialized || loading) return (
    <div className="bg-white rounded-lg p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#2874f0] border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">Loading Orders...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl mb-6">My Orders</h2>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
            <Link
              to="/"
              className="inline-block bg-[#2874f0] text-white px-6 py-2 rounded hover:bg-[#1c5ccc] transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
              >
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Order ID</p>
                      <Link to={`/orders/${order.orderNumber || order.id}`} className="font-bold text-[#2874f0] hover:underline">
                        {order.orderNumber || order.id}
                      </Link>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full capitalize ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusIcon(order.status)}
                    <span>{getStatusLabel(order.status)}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items?.map((item:any, index:number) => (
                      <div key={index} className="flex gap-4">
                        <img
                          src={resolveImg(item.productData?.images?.[0])  || 'https://placehold.co/80x80?text=IMG'}
                          alt={item.productData?.name || 'Product'}
                          className="w-20 h-20 object-cover rounded border border-gray-200"
                        />
                        <div className="flex-1">
                          <Link
                            to={`/p/${item.productData?.slug || item.productData?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'view'}`}
                            className="hover:text-[#2874f0] transition"
                          >
                            <h4 className="mb-1">{item.productData?.name || 'Loading Product Name...'}</h4>
                          </Link>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          <p className="text-sm mt-1">{formatPrice(item.price)}</p>
                        </div>
                         {order.status.toUpperCase() === "DELIVERED" && (
                           <div>
                             {(() => {
                               const existingReview = item.productData?.reviews?.find(
                                 (r: any) => r.orderId === order.id
                               );
                               if (existingReview) {
                                 return (
                                   <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-flex items-center gap-1">
                                     <CheckCircle className="w-4 h-4" /> Reviewed
                                   </span>
                                 );
                               }
                               return (
                                 <button
                                   onClick={() => {
                                     setReviewOrderVisible(order.id);
                                     setReviewProductId(item.productId);
                                     setReviewRating(5);
                                     setHoverRating(0);
                                     setReviewComment("");
                                     setReviewImages([]);
                                   }}
                                   className="px-3 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-600 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow"
                                 >
                                   Review Product
                                 </button>
                               );
                             })()}
                           </div>
                         )}
                      </div>
                    ))}
                  </div>

                  {/* Shipping Info Snapshot */}
                  <div className="mt-6 pt-6 border-t border-gray-100 flex gap-8 flex-wrap">
                    <div className="min-w-[200px]">
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Address</h5>
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold">{order.shippingLine1}</p>
                        {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                        <p>{order.shippingCity}, {order.shippingState}</p>
                        <p>{order.shippingPincode}, {order.shippingCountry}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Details</h5>
                      <p className="text-sm text-gray-700 font-semibold">{order.customerPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment</h5>
                      <p className="text-sm text-gray-700 font-semibold">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                    {!(["SHIPPED", "DELIVERED", "CANCELLED", "CANCELLED_BY_CUSTOMER"].includes(order.status.toUpperCase())) && (
                      <button onClick={() => handleCancelOrder(order.orderNumber || order.id)} className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition text-sm">
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

       {/* Review Modal */}
       {reviewOrderVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Rating</label>
                <div className="flex gap-2 my-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none transition-all duration-150 transform hover:scale-110"
                        >
                            <Star
                                className={`w-8 h-8 ${
                                    star <= (hoverRating || reviewRating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300 hover:text-amber-300"
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Comment</label>
                <textarea rows={4} value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="What did you think of this product?"></textarea>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Add Images (Up to 5)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {reviewImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 border rounded overflow-hidden">
                           <img src={resolveImg(img)} className="w-full h-full object-cover" alt="Review upload" />
                           <button onClick={() => setReviewImages(reviewImages.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-xs">x</button>
                        </div>
                    ))}
                    {reviewImages.length < 5 && (
                        <div className="w-16 h-16 border border-dashed border-gray-400 rounded flex items-center justify-center relative bg-gray-50">
                            {uploadingImage ? <span className="text-xs">...</span> : <span className="text-2xl text-gray-400">+</span>}
                            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button onClick={() => { setReviewOrderVisible(null); setReviewImages([]); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button onClick={submitReview} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
