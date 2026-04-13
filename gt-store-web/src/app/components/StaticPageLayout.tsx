import { Link, useLocation } from "react-router";
import { ChevronRight, FileText, Info, Truck, RotateCcw, HelpCircle, Shield, Lock, Briefcase, Newspaper, Building2 } from "lucide-react";

interface StaticPageLayoutProps {
  title: string;
  category: "ABOUT" | "HELP" | "POLICY";
  children: React.ReactNode;
}

const sidebarLinks = {
  ABOUT: [
    { label: "About Us", path: "/about", icon: Info },
    { label: "Careers", path: "/careers", icon: Briefcase },
    { label: "Press", path: "/press", icon: Newspaper },
    { label: "Corporate Information", path: "/corporate", icon: Building2 },
  ],
  HELP: [
    { label: "Customer Support", path: "/support", icon: HelpCircle },
    { label: "Shipping", path: "/shipping", icon: Truck },
    { label: "Returns", path: "/returns", icon: RotateCcw },
    { label: "FAQ", path: "/faq", icon: HelpCircle },
  ],
  POLICY: [
    { label: "Return Policy", path: "/returns-policy", icon: RotateCcw },
    { label: "Terms of Use", path: "/terms", icon: FileText },
    { label: "Security", path: "/security", icon: Shield },
    { label: "Privacy", path: "/privacy", icon: Lock },
  ],
};

export function StaticPageLayout({ title, category, children }: StaticPageLayoutProps) {
  const location = useLocation();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-indigo-600 transition">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="capitalize">{category.toLowerCase()}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{title}</span>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-[280px_1fr] gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-indigo-600 px-6 py-4">
                <h2 className="text-white font-bold tracking-wide uppercase text-xs">{category}</h2>
              </div>
              <nav className="p-2">
                {sidebarLinks[category].map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                        isActive 
                          ? "bg-indigo-50 text-indigo-700" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Other Categories Links */}
            {(Object.keys(sidebarLinks) as Array<keyof typeof sidebarLinks>).map(cat => {
                if (cat === category) return null;
                return (
                    <div key={cat} className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4">{cat}</h3>
                        <div className="space-y-1">
                            {sidebarLinks[cat].slice(0, 2).map(link => (
                                <Link key={link.path} to={link.path} className="block px-4 py-1.5 text-sm text-gray-500 hover:text-indigo-600 transition">
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )
            })}
          </aside>

          {/* Main Content */}
          <article className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-6">{title}</h1>
            <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed space-y-6">
              {children}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
