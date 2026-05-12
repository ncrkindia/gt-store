import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { 
  Package, Truck, CheckCircle2, XCircle, 
  ChevronLeft, Calendar, CreditCard, MapPin, 
  ArrowRight, Clock, Tag, Info, FileDown, Loader2
} from "lucide-react";
import apiClient from "../../../api/axios";
import { useKeycloak } from "@react-keycloak/web";
import { formatPrice } from "../../../lib/formatPrice";

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

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { keycloak, initialized } = useKeycloak();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<any>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
     setDownloading(true);
     try {
        const response = await apiClient.get(`/invoices/order/${id}`, {
           responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice-${id?.substring(0,8).toUpperCase()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
     } catch (error) {
        console.error("Failed to download invoice", error);
        alert("Failed to generate invoice PDF. Please try again later.");
     } finally {
        setDownloading(false);
     }
  };

  useEffect(() => {
    if (!initialized) return;
    if (!keycloak.authenticated) {
      keycloak.login();
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Order
        const { data: orderData } = await apiClient.get(`/orders/${id}`);
        
        // 2. Fetch Item details
        const productIds = orderData.items?.map((i: any) => i.productId) || [];
        if (productIds.length > 0) {
          const pMapResp = await apiClient.post('/products/bulk', productIds);
          const map = new Map(pMapResp.data.map((p: any) => [p.id, p]));
          orderData.items.forEach((i: any) => {
            i.productData = map.get(i.productId);
          });
        }
        setOrder(orderData);

        // 3. Fetch optional Shipment data
        try {
           const { data: shipData } = await apiClient.get(`/shipping/order/${id}`);
           setShipment(shipData);
        } catch (e) {
           // Shipment might not exist yet, ignore fail silently
           setShipment(null);
        }

      } catch (err) {
        console.error("Failed to load order details", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, initialized, keycloak.authenticated]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 font-medium">Gathering order trace data...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
           <Info className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">We couldn't find details for that order identifier.</p>
        <button onClick={() => navigate('/account/orders')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl">Go Back</button>
      </div>
    );
  }

  // Logic derived milestones mapping
  const status = order.status?.toUpperCase();
  
  const isConfirmed = ["PAID", "ORDER_CONFIRMED", "SHIPPED", "READY_TO_BE_SHIPPED", "DELIVERED"].includes(status);
  const isShipped = ["SHIPPED", "READY_TO_BE_SHIPPED", "DELIVERED"].includes(status);
  const isDelivered = status === "DELIVERED";
  const isCancelled = status.includes("CANCELLED");

  const steps = [
    { label: "Order Placed", date: new Date(order.createdAt).toLocaleString(), active: true, icon: <Clock /> },
    { label: "Payment Approved", date: isConfirmed ? new Date(order.createdAt).toLocaleDateString() : null, active: isConfirmed, icon: <CreditCard /> },
    { label: "Packed & Ready", date: isShipped ? new Date(order.updatedAt).toLocaleDateString() : null, active: isShipped, icon: <Package /> },
    { label: "Delivered", date: isDelivered ? new Date(order.updatedAt).toLocaleString() : null, active: isDelivered, icon: <CheckCircle2 /> }
  ];

  if (isCancelled) {
     steps[1] = { label: "Cancelled", date: new Date(order.updatedAt).toLocaleString(), active: true, icon: <XCircle className="text-red-500"/> };
     steps.length = 2;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center text-sm text-gray-500 gap-2">
        <Link to="/account/orders" className="hover:text-indigo-600 transition flex items-center gap-1">
           <ChevronLeft size={16}/> My Orders
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Details</span>
      </div>

      {/* Order Header Banner */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
         
         <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-extrabold tracking-wider text-indigo-600 uppercase">Order Reference</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isCancelled ? 'bg-red-100 text-red-700' : isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                 {status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 break-all">{order.id}</h1>
            <div className="flex items-center gap-4 mt-3 text-gray-500 text-sm">
               <div className="flex items-center gap-1"><Calendar size={16}/> {new Date(order.createdAt).toLocaleDateString()}</div>
               <div className="flex items-center gap-1"><Tag size={16}/> {order.items?.length || 0} Item{(order.items?.length !== 1) ? 's' : ''}</div>
            </div>

            {isDelivered && (
               <button 
                 onClick={handleDownloadInvoice}
                 disabled={downloading}
                 className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-sm hover:shadow disabled:opacity-70"
               >
                  {downloading ? <Loader2 className="animate-spin" size={16}/> : <FileDown size={16}/>}
                  {downloading ? 'Preparing Invoice...' : 'Download Invoice'}
               </button>
            )}
         </div>

         <div className="bg-gray-50 rounded-2xl p-4 md:px-6 border border-gray-100 text-center md:text-right flex-shrink-0">
            <p className="text-sm text-gray-500 font-medium">Grand Total</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">{formatPrice(order.totalAmount)}</h2>
            <span className="text-xs text-gray-500 capitalize">{order.paymentMethod}</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Progress Timeline */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2"><Truck className="text-indigo-600"/> Order Progress</h3>
             
             <div className="relative flex flex-col gap-8">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-4 relative">
                    
                    {/* Line connection */}
                    {index !== steps.length - 1 && (
                      <div className={`absolute left-6 top-12 bottom-[-32px] w-0.5 ${steps[index+1].active ? 'bg-indigo-600' : 'bg-gray-100 border-l-2 border-dashed border-gray-200'}`} />
                    )}

                    {/* Icon Ring */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-colors duration-500 ${step.active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}>
                       {step.active && !isCancelled && index !== steps.length - 1 ? <CheckCircle2 size={20}/> : step.icon}
                    </div>

                    <div className="pt-1">
                       <h4 className={`font-bold text-base transition-colors ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</h4>
                       {step.date ? (
                         <p className="text-sm text-gray-500 mt-1">{step.date}</p>
                       ) : (
                         <p className="text-xs italic text-gray-400 mt-1">Pending update...</p>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Products List */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-900 mb-6">Items in Order</h3>
             <div className="divide-y divide-gray-100">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                    <img 
                      src={resolveImg(item.productData?.images?.[0]) || 'https://placehold.co/80x80?text=IMG'} 
                      alt="Product"
                      className="w-20 h-20 object-cover rounded-2xl bg-gray-50 border border-gray-100"
                    />
                    <div className="flex-1">
                      <Link to={item.productData?.slug ? `/p/${item.productData.slug}` : `/product/${item.productId}`} className="font-bold text-gray-900 hover:text-indigo-600 line-clamp-1 text-sm md:text-base transition">
                        {item.productData?.name || "Loading name..."}
                      </Link>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                         <span>Qty: <b className="text-gray-700">{item.quantity}</b></span>
                         <span>×</span>
                         <span>{formatPrice(item.price)}</span>
                      </div>
                    </div>
                    <div className="text-right font-black text-gray-900 whitespace-nowrap">
                       {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

        {/* Sidebar with meta data */}
        <div className="space-y-6">
           {/* Shipping Info */}
           <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2 mb-4"><MapPin size={18} className="text-gray-400"/> Shipping Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                 {order.customerName && <p className="font-bold text-gray-900 text-base mb-1">{order.customerName}</p>}
                 <p>{order.shippingLine1}</p>
                 {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                 <p>{order.shippingCity}, {order.shippingState} - {order.shippingPincode}</p>
                 <p className="font-medium text-gray-800 mt-3 flex items-center gap-2">
                    <span className="text-gray-400 font-normal">Tel:</span> {order.customerPhone || 'Not provided'}
                 </p>
              </div>
           </div>

           {/* Courier / Tracking Widget if Shipment exists */}
           {shipment && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-lg shadow-indigo-200">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold tracking-wide uppercase text-xs opacity-90">Shiprocket Tracking</h3>
                    <img src="https://www.shiprocket.in/wp-content/themes/twentytwentyone/assets/images/logo.svg" className="h-4 opacity-80 invert" alt="Shiprocket"/>
                 </div>
                 <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-xs opacity-70 mb-1">AWB Tracking Code</p>
                    <p className="font-black font-mono text-lg tracking-widest">{shipment.awbCode || 'Processing'}</p>
                 </div>
                 <div className="mt-4 text-xs opacity-80 flex justify-between items-center">
                    <span>Ref: SR-{shipment.shiprocketOrderId || 'N/A'}</span>
                    <span className="bg-white/20 px-2 py-1 rounded-lg font-bold">{shipment.status}</span>
                 </div>
                 
                 <button className="w-full mt-4 bg-white text-indigo-700 font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition text-sm">
                    Track Live <ArrowRight size={14}/>
                 </button>
              </div>
           )}

           {/* Action Box */}
           <div className="bg-gray-50 rounded-3xl p-6 border border-dashed border-gray-300 text-center">
              <p className="text-sm text-gray-500 font-medium mb-3">Need help with this order?</p>
              <Link to="/support" className="inline-block text-indigo-600 hover:text-indigo-800 font-bold text-sm underline underline-offset-4">Contact Support</Link>
           </div>
        </div>
      </div>
    </div>
  );
}
