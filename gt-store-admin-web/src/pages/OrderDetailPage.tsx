import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { formatPrice } from '../lib/formatPrice';
import { toast } from 'sonner';
import { 
  ArrowLeft, Package, MapPin, Calendar, CreditCard, 
  Phone, Mail, User, Truck, CheckCircle, Clock, 
  History, UserCheck, AlertCircle, ExternalLink,
  MessageSquare, Tag, ArrowUpRight, Loader2, FileDown
} from 'lucide-react';

interface SupportTicket {
    id: number;
    ticketNumber: string;
    subject: string;
    status: string;
    createdAt: string;
}

interface OrderItem {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
}

interface OrderAudit {
    id: number;
    action: string;
    description: string;
    performedBy: string;
    performedByName?: string;
    performedByEmail?: string;
    createdAt: string;
}

interface Order {
    id: string;
    orderNumber?: string;
    userId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    paymentMethod: string;
    paymentId?: string;
    shippingLine1: string;
    shippingLine2?: string;
    shippingCity: string;
    shippingState: string;
    shippingPincode: string;
    shippingCountry: string;
    customerPhone?: string;
    customerName?: string;
    items: OrderItem[];
    audits: OrderAudit[];
}

interface Shipment {
    id: number;
    status: string;
    awbCode?: string;
    shiprocketShipmentId?: string;
    createdAt: string;
    updatedAt: string;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
    'PENDING': 'bg-amber-50 text-amber-700 border border-amber-200',
    'PENDING_PAYMENT': 'bg-amber-50 text-amber-700 border border-amber-200',
    'PAID': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'AWAITING_FULFILLMENT': 'bg-sky-50 text-sky-700 border border-sky-200',
    'READY_TO_BE_SHIPPED': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'SHIPPED': 'bg-blue-50 text-blue-700 border border-blue-200',
    'DELIVERED': 'bg-green-50 text-green-700 border border-green-200',
    'CANCELLED': 'bg-rose-50 text-rose-700 border border-rose-200',
    'CANCELLED_BY_CUSTOMER': 'bg-rose-50 text-rose-700 border border-rose-200',
};

const getStorefrontUrl = () => {
    const { hostname, port, protocol } = window.location;
    
    // 1. Direct development execution (admin 4002 -> storefront 4000)
    if (port === '4002') {
        return `${protocol}//${hostname}:4000`;
    }
    
    // 2. Cloud deployment (slpro.in) canonical mappings
    if (hostname.includes('slpro.in')) {
        return 'https://gtstore.slpro.in';
    }
    
    // 3. Unified Gateway Routing (default server instance origin)
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { keycloak, initialized } = useKeycloak();
    
    const [order, setOrder] = useState<Order | null>(null);
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [productsMap, setProductsMap] = useState<Record<string, { name: string; slug?: string; variants?: any[] }>>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [downloading, setDownloading] = useState(false);

    // Status confirmation modal states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const [statusDetails, setStatusDetails] = useState('');

    const fetchProductDetails = async (items: OrderItem[]) => {
        const uniqueIds = Array.from(new Set(items.map(i => i.productId)));
        const map: Record<string, { name: string; slug?: string; variants?: any[] }> = {};
        
        await Promise.all(
            uniqueIds.map(async (pid) => {
                try {
                    const res = await apiClient.get(`/api/products/${pid}`);
                    map[pid] = { name: res.data.name, slug: res.data.slug, variants: res.data.variants };
                } catch (err) {
                    map[pid] = { name: 'Unknown GT Product' };
                }
            })
        );
        
        setProductsMap(prev => ({ ...prev, ...map }));
    };

    const fetchOrderDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fetch full order details and audits from Admin Order Endpoint
            const orderRes = await apiClient.get<Order>(`/api/orders/all/${id}`);
            const orderData = orderRes.data;
            setOrder(orderData);

            // Fire async product resolution
            fetchProductDetails(orderData.items);

            // 2. Fetch optional shipping tracking details from Shipping Service via Gateway
            try {
                const shipmentRes = await apiClient.get<Shipment>(`/api/shipping/order/${orderData.id}`);
                setShipment(shipmentRes.data);
            } catch (err) {
                setShipment(null);
            }

            // 3. Fetch linked support tickets
            try {
                const ticketsRes = await apiClient.get<SupportTicket[]>(`/api/users/admin/support/tickets/by-order/${orderData.id}`);
                setSupportTickets(ticketsRes.data || []);
            } catch (err) {
                console.error("Failed to load linked support tickets", err);
                setSupportTickets([]);
            }
        } catch (error) {
            console.error("Failed to load order details", error);
            toast.error("Order not found or API failure");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized && keycloak.authenticated) {
            fetchOrderDetails();
        }
    }, [id, initialized, keycloak.authenticated]);

    const triggerStatusChange = (newStatus: string) => {
        setPendingStatus(newStatus);
        setStatusDetails('');
        setShowStatusModal(true);
    };

    const submitStatusChange = async () => {
        if (!order || !id || !pendingStatus) return;
        setUpdating(true);
        try {
            const params = new URLSearchParams({
                status: pendingStatus,
                details: statusDetails.trim()
            });
            
            await apiClient.put(`/api/orders/${id}/status?${params.toString()}`);
            toast.success(`Order status updated to ${pendingStatus}`);
            setShowStatusModal(false);
            // Reload data to pull new audit trails
            await fetchOrderDetails();
        } catch (error) {
            console.error("Failed status update", error);
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order) return;
        setDownloading(true);
        try {
            const response = await apiClient.get(`/api/invoices/order/${order.id}`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            const invoiceId = order.orderNumber || order.id.substring(0, 8).toUpperCase();
            link.setAttribute('download', `Invoice-${invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Invoice PDF generated and downloaded!");
        } catch (error) {
            console.error("Failed to download invoice", error);
            toast.error("Failed to generate invoice PDF");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100 my-8 min-h-[400px]">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
                <p className="text-slate-500 font-bold">Fetching full order profile and ledger...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center my-8">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h3>
                <p className="text-slate-500 mb-6">We couldn't find any record matching order identifier "{id}".</p>
                <Link to="/orders" className="btn-primary inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to global orders
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 relative">
            {/* Header Top Strip */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/orders')} 
                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to all orders
                </button>
                <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    System ID: {order.id}
                </div>
            </div>

            {/* Top Summary Banner Card */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                {/* Decorative color banner */}
                <div className="absolute left-0 inset-y-0 w-2 bg-indigo-600" />

                <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
                            Order #{order.orderNumber || order.id}
                        </h1>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider shadow-sm ${STATUS_BADGE_CLASSES[order.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {order.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Placed {new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} at {new Date(order.createdAt).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                        </span>
                    </div>
                </div>

                {/* Quick actions dropdown */}
                <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-slate-700 hidden lg:block">Update Lifecycle:</div>
                    <select 
                        disabled={updating}
                        value={order.status}
                        onChange={(e) => triggerStatusChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-60"
                    >
                        <option value="PENDING">PENDING</option>
                        <option value="PENDING_PAYMENT">PENDING PAYMENT</option>
                        <option value="PAID">PAID</option>
                        <option value="AWAITING_FULFILLMENT">AWAITING FULFILLMENT</option>
                        <option value="READY_TO_BE_SHIPPED">READY TO SHIP</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>

                    <button
                        onClick={handleDownloadInvoice}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold shadow-md shadow-indigo-600/10 hover:shadow-lg transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {downloading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <FileDown className="w-4 h-4" />
                                <span>Download Invoice</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Split Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Left / Middle Side (2 Cols): Order details + Shipping */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Order Breakdown Card */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <Package className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-extrabold text-slate-900">Consignment Breakdown</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-6 py-4">Product Description & SKU</th>
                                        <th className="px-6 py-4 text-center">Qty</th>
                                        <th className="px-6 py-4 text-right">Price</th>
                                        <th className="px-6 py-4 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {order.items.map((item) => {
                                        const pDetails = productsMap[item.productId];
                                        const baseUrl = getStorefrontUrl();
                                        const path = pDetails?.slug ? `/p/${pDetails.slug}` : `/product/${item.productId}`;
                                        const webLink = `${baseUrl}${path}`;
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/30 transition">
                                                <td className="px-6 py-4 max-w-md">
                                                    <div className="text-slate-900 font-extrabold text-sm line-clamp-2 mb-1 leading-snug">
                                                        {pDetails ? pDetails.name : 'Resolving Product Catalog...'}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a 
                                                            href={webLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-mono font-black text-indigo-600 hover:text-indigo-800 hover:underline text-xs flex items-center gap-1 tracking-wide cursor-pointer"
                                                        >
                                                            SKU: {item.productId}
                                                            <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                                                        </a>
                                                    </div>
                                                    {(() => {
                                                        const varIdStr = String(item.variantId || '').trim();
                                                        if (!varIdStr || varIdStr === 'std') {
                                                            return (
                                                                <div className="text-xs text-slate-400 mt-1 font-bold flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                    Variant: Standard / Base
                                                                </div>
                                                            );
                                                        }
                                                        const foundVar = pDetails?.variants?.find((v: any) => String(v.variantId) === varIdStr);
                                                        if (foundVar) {
                                                            return (
                                                                <div className="text-xs text-purple-600 mt-1 font-bold flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                                    Variant: {foundVar.name} ({foundVar.grouping})
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="text-xs text-slate-400 mt-1 font-bold flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                    Variant ID: {item.variantId}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-center font-extrabold text-slate-600 text-sm">
                                                    x{item.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                    {formatPrice(item.price)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    {formatPrice(item.price * item.quantity)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Summary Bar */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 ml-auto max-w-sm w-full">
                            <div className="flex justify-between text-sm font-medium text-slate-500">
                                <span>Subtotal Items:</span>
                                <span>{formatPrice(order.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-slate-500">
                                <span>Tax & Charges:</span>
                                <span className="text-slate-400 font-bold">INCL.</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                                <span className="text-base font-extrabold text-slate-900">Total Remittance:</span>
                                <span className="text-xl font-black text-indigo-600">{formatPrice(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Shipping and Tracking Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Recipient & Address Details */}
                        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-extrabold text-slate-900">Delivery Node</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Consignee</p>
                                    <p className="text-slate-800 font-extrabold mt-0.5">{order.customerName || "Guest Recipient"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-3">Destination Layout</p>
                                    <div className="text-slate-600 font-medium text-sm mt-1 space-y-0.5">
                                        <p>{order.shippingLine1}</p>
                                        {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                                        <p className="text-slate-800 font-bold mt-1">{order.shippingCity}, {order.shippingState} - {order.shippingPincode}</p>
                                        <p className="uppercase text-xs font-black tracking-widest text-indigo-600 pt-1">{order.shippingCountry}</p>
                                    </div>
                                </div>
                                {order.customerPhone && (
                                    <div className="pt-3 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <a href={`tel:${order.customerPhone}`} className="text-sm font-bold text-indigo-600 hover:underline">{order.customerPhone}</a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Logistical Consignment Tracking */}
                        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-extrabold text-slate-900">Tracking & Courier</h2>
                            </div>

                            {shipment ? (
                                <div className="space-y-5">
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Consignment Waybill</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-slate-800 font-mono font-black text-base mt-0.5 uppercase tracking-widest">
                                                    {shipment.awbCode || 'ASSIGNING...'}
                                                </p>
                                                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded uppercase shadow-xs">Shiprocket</span>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Logistics Node Status</p>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                {shipment.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs font-medium text-slate-500 flex flex-col gap-1 px-1">
                                        <div className="flex justify-between">
                                            <span>Shipment Register:</span>
                                            <span className="font-bold text-slate-600">{new Date(shipment.createdAt).toLocaleString()}</span>
                                        </div>
                                        {shipment.updatedAt && (
                                            <div className="flex justify-between border-t border-slate-50 pt-1 mt-1">
                                                <span>Last Scanned:</span>
                                                <span className="font-bold text-slate-600">{new Date(shipment.updatedAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {shipment.shiprocketShipmentId && (
                                        <a 
                                            href={`https://shiprocket.co/tracking/${shipment.awbCode}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-extrabold shadow-md shadow-emerald-100 mt-2 cursor-pointer"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> Trace Consignment Link
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 text-center h-[calc(100%-70px)] flex flex-col justify-center items-center">
                                    <Clock className="w-8 h-8 text-slate-300 mb-3" />
                                    <p className="text-slate-600 font-bold text-sm">No active consignment found.</p>
                                    <p className="text-[11px] text-slate-400 mt-1">A shipment entry will appear once courier manifests are emitted.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Right Sidebar (1 Col): Account + Dynamic Audit Logs */}
                <div className="space-y-8">
                    
                    {/* Customer Context Node */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-extrabold text-slate-900">Account Profile</h2>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black uppercase shadow-md">
                                {(order.customerName || order.userId).substring(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-slate-900 font-extrabold truncate">{order.customerName || "Authorized Customer"}</h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate font-medium mt-0.5">
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{order.userId}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 border-t border-slate-50 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <CreditCard className="w-4 h-4 text-slate-400" /> Method
                                </div>
                                <span className="text-sm font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded tracking-wider uppercase">{order.paymentMethod}</span>
                            </div>

                            {order.paymentId && (
                                <div>
                                    <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1">Gateway Transaction ID</div>
                                    <div className="font-mono text-xs font-bold text-slate-700 bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 break-all">
                                        {order.paymentId}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linked Support Tickets Node */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-extrabold text-slate-900">Linked Support</h2>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">RELATIONAL CRM TELEMETRY</p>
                            </div>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                                {supportTickets.length}
                            </span>
                        </div>

                        {supportTickets.length === 0 ? (
                            <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                                <Tag className="w-6 h-6 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-500 font-extrabold">No associated support tickets.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {supportTickets.map((t) => (
                                    <Link 
                                        key={t.id}
                                        to={`/support/${t.ticketNumber}`}
                                        className="block group bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-3.5 transition"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="text-[10px] font-mono font-black text-indigo-600 uppercase bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/30 shadow-3xs">
                                                {t.ticketNumber}
                                            </span>
                                            <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md border ${
                                                t.status === 'OPEN' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition">
                                            {t.subject}
                                        </h4>
                                        <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                                            <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-0.5 text-indigo-500 font-black group-hover:translate-x-0.5 transition">
                                                Open Desk <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Audit & History Trail */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
                                <History className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-extrabold text-slate-900">Lifecycle Ledger</h2>
                        </div>

                        <div className="flow-root">
                            <ul className="-mb-8">
                                {order.audits && order.audits.length > 0 ? (
                                    order.audits.map((audit, index) => (
                                        <li key={audit.id}>
                                            <div className="relative pb-8">
                                                {index !== order.audits.length - 1 ? (
                                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                                                ) : null}
                                                <div className="relative flex space-x-3">
                                                    <div>
                                                        <span className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center ring-8 ring-white text-slate-600 shadow-sm">
                                                            {audit.action === 'ORDER_CREATED' ? (
                                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            ) : audit.action === 'ORDER_CANCELLED' ? (
                                                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                                            ) : (
                                                                <Clock className="w-4 h-4 text-indigo-500" />
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1.5 flex flex-col bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 ml-2 shadow-xs">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                                                {audit.action.replace(/_/g, ' ')}
                                                            </p>
                                                            <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-3xs whitespace-nowrap">
                                                                {new Date(audit.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-600 mt-1 break-words leading-relaxed">
                                                            {audit.description}
                                                        </p>
                                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                                                <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span className="text-slate-900 font-black">{audit.performedByName || 'System Agent'}</span>
                                                            </div>
                                                            {(audit.performedByEmail || audit.performedBy) && (
                                                                <div className="pl-5 text-[9px] font-bold text-slate-400 flex items-center gap-1 truncate">
                                                                    <Mail className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                                                                    <span className="truncate">{audit.performedByEmail || audit.performedBy}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between mt-1.5">
                                                                <div className="text-[9px] font-black text-indigo-500 bg-indigo-50/80 px-1.5 py-0.5 rounded-md border border-indigo-100/30 shadow-3xs">
                                                                    {new Date(audit.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-center py-6 text-slate-400 text-xs font-medium">
                                        No ledger operations recorded yet.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* Action Detail / Status Update Confirmation Modal */}
            {showStatusModal && (
                <div className="modal-overlay">
                    <div className="modal max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Register Lifecycle State</h3>
                                <p className="text-xs font-semibold text-slate-400">Append detailed telemetry to audit ledger</p>
                            </div>
                        </div>

                        <p className="text-slate-600 text-sm mb-5 leading-relaxed font-medium">
                            Confirming transition of active status to <strong className="text-indigo-600 font-black uppercase tracking-wide">"{pendingStatus}"</strong>.
                        </p>
                        
                        <div className="space-y-2 mb-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Action Details / External Note (Optional)</label>
                            <textarea
                                rows={3}
                                value={statusDetails}
                                onChange={(e) => setStatusDetails(e.target.value)}
                                placeholder="e.g., Stock confirmed, handed over to Bluedart courier agent, payment verified manually..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-medium text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition leading-relaxed placeholder:text-slate-300"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-50">
                            <button 
                                type="button"
                                onClick={() => setShowStatusModal(false)}
                                className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            >
                                Abort
                            </button>
                            <button 
                                type="button"
                                onClick={submitStatusChange}
                                disabled={updating}
                                className="btn-primary text-sm py-2.5 disabled:opacity-60 font-bold flex items-center gap-2 cursor-pointer"
                            >
                                {updating ? 'Writing...' : 'Commit Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
