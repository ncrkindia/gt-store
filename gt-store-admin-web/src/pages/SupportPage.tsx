import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/axios";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { 
  MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Lock, 
  User, Mail, Phone, HelpCircle, RefreshCcw, Calendar, FileText, ShieldAlert,
  Link2, Link2Off, ShoppingBag, ArrowUpRight
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OPEN: { label: "Open", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertCircle },
  IN_PROGRESS: { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Clock },
  RESOLVED: { label: "Resolved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  CLOSED: { label: "Closed", color: "text-slate-700", bg: "bg-slate-50 border-slate-200", icon: CheckCircle2 },
};

export default function SupportPage() {
  const { ticketNumber } = useParams<{ ticketNumber?: string }>();
  const navigate = useNavigate();

  const { keycloak, initialized } = useKeycloak();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "audit" | "orders">("conversation");

  // Order linking states
  const [newOrderIdInput, setNewOrderIdInput] = useState("");
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [linkedOrdersCache, setLinkedOrdersCache] = useState<Record<string, any>>({});

  const fetchTickets = async (selectId?: number) => {
    if (!keycloak.authenticated) return;
    try {
      setLoading(true);
      const { data } = await apiClient.get("/api/users/admin/support/tickets");
      setTickets(data);
      
      // Re-select updated ticket details if active
      if (selectId) {
        const updated = data.find((t: any) => t.id === selectId);
        if (updated) setSelectedTicket(updated);
      } else if (data.length > 0) {
        // Priority: Read ticket number from URL param
        if (ticketNumber) {
          const matched = data.find((t: any) => t.ticketNumber === ticketNumber);
          if (matched) {
            setSelectedTicket(matched);
          } else {
            // Fallback if parameter is invalid
            setSelectedTicket(data[0]);
            navigate(`/support/${data[0].ticketNumber}`, { replace: true });
          }
        } else {
          // Set first ticket and redirect URL so user can bookmark it
          setSelectedTicket(data[0]);
          navigate(`/support/${data[0].ticketNumber}`, { replace: true });
        }
      }
    } catch (e) {
      console.error("Failed to fetch support tickets", e);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      fetchTickets();
    }
  }, [initialized, keycloak.authenticated]);

  useEffect(() => {
    if (tickets.length > 0 && ticketNumber) {
      const matched = tickets.find((t: any) => t.ticketNumber === ticketNumber);
      if (matched && matched.id !== selectedTicket?.id) {
        setSelectedTicket(matched);
        setActiveTab("conversation"); // Reset tab context when switching ticket via URL
      }
    }
  }, [ticketNumber, tickets]);

  const fetchLinkedOrderDetails = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    
    const newCache: Record<string, any> = { ...linkedOrdersCache };
    let updated = false;

    await Promise.all(
      orderIds.map(async (oid) => {
        // Avoid refetching if already cached
        if (newCache[oid]) return;
        try {
          const res = await apiClient.get(`/api/orders/all/${oid}`);
          newCache[oid] = res.data;
          updated = true;
        } catch (err) {
          newCache[oid] = { id: oid, error: true, status: "UNKNOWN" };
          updated = true;
        }
      })
    );

    if (updated) {
      setLinkedOrdersCache(newCache);
    }
  };

  useEffect(() => {
    if (selectedTicket && selectedTicket.linkedOrderIds) {
      fetchLinkedOrderDetails(selectedTicket.linkedOrderIds);
    }
  }, [selectedTicket]);

  const handleLinkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newOrderIdInput.trim()) return;

    const orderId = newOrderIdInput.trim();
    // UUID or 10-character alphanumeric Order Number validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const orderNumRegex = /^[A-Z0-9]{10}$/i;
    if (!uuidRegex.test(orderId) && !orderNumRegex.test(orderId)) {
      toast.error("Please enter a valid Order ID or 10-character Order #");
      return;
    }

    const currentLinks = selectedTicket.linkedOrderIds || [];
    if (currentLinks.includes(orderId)) {
      toast.error("This order is already linked to this ticket");
      return;
    }

    setLinkingLoading(true);
    try {
      const updatedList = [...currentLinks, orderId];
      await apiClient.put(`/api/users/admin/support/tickets/${selectedTicket.id}/link-orders`, updatedList);
      toast.success("Order successfully linked!");
      setNewOrderIdInput("");
      fetchTickets(selectedTicket.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to link order to ticket");
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUnlinkOrder = async (orderId: string) => {
    if (!selectedTicket) return;
    
    try {
      const currentLinks = selectedTicket.linkedOrderIds || [];
      const updatedList = currentLinks.filter((oid: string) => oid !== orderId);
      
      await apiClient.put(`/api/users/admin/support/tickets/${selectedTicket.id}/link-orders`, updatedList);
      toast.success("Order unlinked successfully");
      fetchTickets(selectedTicket.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to unlink order");
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      await apiClient.put(`/api/users/admin/support/tickets/${ticketId}/status?status=${newStatus}`);
      toast.success(`Ticket status changed to ${newStatus}`);
      fetchTickets(ticketId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update ticket status");
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSubmitting(true);
    try {
      await apiClient.post(`/api/users/admin/support/tickets/${selectedTicket.id}/messages`, {
        message: replyText,
        isInternal: isInternal,
        sendEmail: isInternal ? false : sendEmail,
      });
      
      toast.success(isInternal ? "Internal note saved" : "Reply published successfully");
      setReplyText("");
      // Maintain the "Send Email" setting but reset internal note flag
      setIsInternal(false);
      fetchTickets(selectedTicket.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to publish reply");
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialized || loading && tickets.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-screen-xl mx-auto mt-8 shadow-sm border border-gray-200">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading GT Support Center...</p>
      </div>
    );
  }

  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;

  return (
    <div className="max-w-screen-2xl mx-auto py-6 space-y-8 text-slate-900 selection:bg-indigo-100 flex flex-col h-[calc(100vh-140px)]">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-md border border-indigo-50 p-6 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg text-white">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
              <p className="text-slate-500 text-sm font-medium">Review customer inquiries and handle ticket lifecycle.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-xl px-4 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-bold">{openCount} Open</span>
            </div>
            <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl px-4 py-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">{inProgressCount} In Progress</span>
            </div>
            <button 
              onClick={() => fetchTickets(selectedTicket?.id)}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition shadow-sm flex items-center justify-center"
              title="Refresh Tickets"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid Workspace */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col items-center justify-center py-24">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Inbox Fully Cleared</h2>
          <p className="text-slate-500">No customer support inquiries received yet!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar: Ticket List Drawer */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                All Submissions ({tickets.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {tickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                
                return (
                  <button
                    key={ticket.id}
                    onClick={() => navigate(`/support/${ticket.ticketNumber}`)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition duration-200 flex flex-col gap-2 relative ${isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600 hover:bg-indigo-50/70 pl-3' : ''}`}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">{ticket.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border tracking-wider uppercase flex items-center gap-1 ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{ticket.subject}</h4>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-1">
                      <span className="truncate max-w-[150px]">{ticket.name}</span>
                      <span className="shrink-0">{new Date(ticket.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Screen: Active Ticket Thread Container */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/20 rounded-2xl border border-slate-200 overflow-hidden">
            {selectedTicket ? (
              <div className="flex flex-col h-full bg-white">
                
                {/* Active Ticket Subheader Context */}
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col gap-4 shrink-0">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                        <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{selectedTicket.ticketNumber}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900">{selectedTicket.subject}</h2>
                    </div>
                    
                    {/* Quick Actions Controls */}
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                        className="text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>

                  {/* User Details Strip */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-800">{selectedTicket.name}</span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${selectedTicket.email}`} className="hover:text-indigo-600 transition hover:underline">{selectedTicket.email}</a>
                    </div>
                    {selectedTicket.mobile && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${selectedTicket.mobile}`} className="hover:text-indigo-600 transition hover:underline">{selectedTicket.mobile}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Bar: Discussion vs Audit vs Orders */}
                <div className="border-b border-slate-100 bg-slate-50/40 flex px-6 shrink-0 gap-2">
                  <button
                    onClick={() => setActiveTab("conversation")}
                    className={`py-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'conversation' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Conversation Thread
                  </button>
                  <button
                    onClick={() => setActiveTab("audit")}
                    className={`py-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Audit History Logs
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`py-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    Linked Orders 
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${selectedTicket.linkedOrderIds?.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                      {selectedTicket.linkedOrderIds?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Main Chat Content Pane */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                  
                  {activeTab === "conversation" && (
                    <div className="flex flex-col gap-6">
                      {/* Original Query Post (Initial Ticket Body) */}
                      <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm relative ring-1 ring-indigo-600/5">
                        <div className="absolute top-0 left-0 -translate-x-1/3 translate-y-4 w-2 h-2 rounded-full bg-indigo-500" />
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">US</div>
                            <span className="font-bold text-sm text-slate-800">{selectedTicket.name} <span className="text-slate-400 text-xs font-medium">(Original Request)</span></span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(selectedTicket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="text-slate-700 text-sm whitespace-pre-wrap font-normal leading-relaxed pl-9">
                          {selectedTicket.description}
                        </div>
                      </div>

                      {/* Follow-up Conversation Messages */}
                      {selectedTicket.messages?.map((msg: any, idx: number) => {
                        const isStaff = msg.sender !== 'CUSTOMER' && msg.sender !== selectedTicket.email;
                        
                        return (
                          <div 
                            key={msg.id || idx} 
                            className={`rounded-2xl p-5 shadow-sm max-w-[90%] relative ${
                              isStaff 
                                ? msg.internal 
                                  ? 'bg-amber-50 border-2 border-amber-200/70 self-end text-right ml-auto ring-1 ring-amber-400/5' 
                                  : 'bg-indigo-50 border border-indigo-100 self-end text-right ml-auto'
                                : 'bg-white border border-slate-200 self-start text-left mr-auto'
                            }`}
                          >
                            <div className={`flex items-center gap-2 mb-2 flex-wrap ${isStaff ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isStaff ? (msg.internal ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700') : 'bg-slate-100 text-slate-700'}`}>
                                {isStaff ? (msg.internal ? <Lock className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />) : 'US'}
                              </div>
                              <span className="font-bold text-sm text-slate-800">
                                {msg.internal && <span className="text-amber-700 font-extrabold mr-1">[INTERNAL NOTE]</span>}
                                {isStaff ? 'Support Staff' : selectedTicket.name}
                                <span className="text-slate-400 text-xs font-medium ml-1">({msg.sender})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 mx-1">•</span>
                              <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            
                            <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isStaff ? 'pr-9 text-slate-800' : 'pl-9 text-slate-700'}`}>
                              {msg.message}
                            </div>

                            {msg.emailSent && (
                              <div className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center justify-end gap-1 pl-9">
                                <Mail className="w-3 h-3" /> Dispatched via Email to User
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === "audit" && (
                    <div className="space-y-6 pl-4 border-l-2 border-slate-200 ml-2">
                      {selectedTicket.audits?.map((audit: any, idx: number) => (
                        <div key={audit.id || idx} className="relative">
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="flex justify-between flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-extrabold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {audit.action.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">{new Date(audit.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-800 mt-1.5 font-medium">{audit.description}</p>
                            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                              <User className="w-3 h-3" /> Performed By: <span className="font-bold text-slate-500">{audit.performedBy}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "orders" && (
                    <div className="space-y-6 max-w-screen-md">
                      {/* Add Order Mapping Section */}
                      <div className="bg-white border border-indigo-50 rounded-2xl p-5 shadow-xs ring-1 ring-indigo-600/5">
                        <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-indigo-600" /> Associate Reference Order
                        </h3>
                        <form onSubmit={handleLinkOrder} className="flex gap-2">
                          <input 
                            type="text"
                            value={newOrderIdInput}
                            onChange={(e) => setNewOrderIdInput(e.target.value)}
                            placeholder="Paste GT Order UUID here..."
                            className="flex-1 bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            type="submit"
                            disabled={linkingLoading || !newOrderIdInput.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-6 rounded-xl shadow-md hover:shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {linkingLoading ? "Mapping..." : "Map ID"}
                          </button>
                        </form>
                      </div>

                      {/* Grid Ledger Items */}
                      <div className="flex flex-col gap-3">
                        <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider flex items-center gap-2 px-1 mb-1">
                          <ShoppingBag className="w-3.5 h-3.5" /> Linked Platform Orders
                        </h3>
                        
                        {(!selectedTicket.linkedOrderIds || selectedTicket.linkedOrderIds.length === 0) ? (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                            <Link2Off className="w-10 h-10 text-slate-300 mb-3 animate-bounce duration-1000" />
                            <p className="text-sm text-slate-700 font-black">No order mappings found.</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">Paste a valid GT transaction ID to construct an analytical bridge.</p>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {selectedTicket.linkedOrderIds.map((orderId: string) => {
                              const ord = linkedOrdersCache[orderId];
                              
                              return (
                                <div key={orderId} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition group flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[9px] uppercase font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200/50 tracking-wider">GT ORDER</span>
                                      {ord && !ord.error && (
                                        <span className="text-[9px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {ord.status}
                                        </span>
                                      )}
                                      {ord?.error && (
                                        <span className="text-[9px] font-black tracking-wider uppercase bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                                          UNREACHABLE
                                        </span>
                                      )}
                                    </div>
                                    
                                    <Link 
                                      to={`/orders/${orderId}`} 
                                      className="text-xs font-black text-indigo-600 font-mono flex items-center gap-1 hover:underline break-all"
                                    >
                                      {orderId} <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-200" />
                                    </Link>
                                    
                                    {ord && !ord.error && ord.updatedAt && (
                                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-300" /> Last Update: {new Date(ord.updatedAt).toLocaleString()}
                                      </p>
                                    )}
                                    {!ord && (
                                      <p className="text-[10px] font-black text-amber-500 flex items-center gap-1 animate-pulse">
                                        <RefreshCcw className="w-3 h-3 animate-spin" /> Synchronizing telemetry...
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
                                    <Link 
                                      to={`/orders/${orderId}`}
                                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-black text-[11px] px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-3xs"
                                    >
                                      View Tracker
                                    </Link>
                                    <button 
                                      onClick={() => handleUnlinkOrder(orderId)}
                                      className="hover:bg-rose-50 border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-500 p-2 rounded-xl transition"
                                      title="Unlink ID Reference"
                                    >
                                      <Link2Off className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Dock Footer */}
                {activeTab === "conversation" && (
                  <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                    <form onSubmit={submitReply} className="flex flex-col gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={isInternal ? "Type a private team comment (invisible to customer)..." : "Draft a official response to the customer..."}
                        rows={3}
                        className={`w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 resize-none shadow-inner placeholder:text-slate-400 ${isInternal ? 'focus:ring-amber-400 focus:border-amber-300 bg-amber-50/10' : 'focus:ring-indigo-500'}`}
                        required
                      />
                      
                      <div className="flex flex-wrap items-center justify-between gap-4 select-none">
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900 transition">
                            <input 
                              type="checkbox"
                              checked={isInternal}
                              onChange={(e) => setIsInternal(e.target.checked)}
                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                            />
                            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-amber-500" /> Team Internal Note</span>
                          </label>

                          {!isInternal && (
                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-700 cursor-pointer hover:text-indigo-900 transition">
                              <input 
                                type="checkbox"
                                checked={sendEmail}
                                onChange={(e) => setSendEmail(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> CC Copy to Customer Email</span>
                            </label>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !replyText.trim()}
                          className={`flex items-center justify-center gap-2 font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 text-white ${isInternal ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}
                        >
                          {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              {isInternal ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                              {isInternal ? 'Add Note' : 'Send Reply'}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400 p-8 text-center">
                <HelpCircle className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-medium">Select a ticket from the column to inspect conversations.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
