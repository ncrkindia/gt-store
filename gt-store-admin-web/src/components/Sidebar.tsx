import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, Package, Tags, Bookmark, 
    Image, ClipboardList, Boxes, FileText, AlertCircle, Truck, MessageSquare, Percent, Award
} from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { divider: true },
        { to: "/products", label: "Manage Products", icon: Package },
        { to: "/categories", label: "Categories", icon: Tags },
        { to: "/brands", label: "Brands", icon: Bookmark },
        { to: "/banners", label: "Banners", icon: Image },
        { divider: true },
        { to: "/inventory", label: "Inventory Management", icon: Boxes },
        { to: "/orders", label: "Sales Orders", icon: ClipboardList },
        { to: "/shipping", label: "Shipping & COD Settings", icon: Truck },
        { to: "/coupons", label: "Coupons & Promos", icon: Percent },
        { to: "/loyalty", label: "Loyalty Program", icon: Award },
        { divider: true },
        { to: "/reviews", label: "Review Moderation", icon: AlertCircle },
        { to: "/support", label: "Support Tickets", icon: MessageSquare },
        { to: "/documentation", label: "API Documentation", icon: FileText },
    ];

    return (
        <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 h-[calc(100vh-73px)] sticky top-[73px]">
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {navItems.map((item, idx) => {
                    if (item.divider) {
                        return <div key={`div-${idx}`} className="h-px bg-slate-100 my-4 mx-3" />;
                    }

                    const Icon = item.icon as any;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to || ''}
                            className={({ isActive }) => 
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                }`
                            }
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 justify-center">
                    <span>GT Store Ecosystem v1.2</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
