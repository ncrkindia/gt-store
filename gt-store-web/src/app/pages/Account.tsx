import { Outlet, Link, useLocation } from "react-router";
import { User, Package, Heart, MapPin, Settings } from "lucide-react";
import { useKeycloak } from "@react-keycloak/web";

export function Account() {
  const location = useLocation();
  const { keycloak } = useKeycloak();
  const userName = keycloak?.tokenParsed?.name || keycloak?.tokenParsed?.preferred_username || "User";

  const menuItems = [
    { path: "/account", label: "Profile", icon: User },
    { path: "/account/orders", label: "Orders", icon: Package },
    { path: "/account/wishlist", label: "Wishlist", icon: Heart },
    { path: "/account/addresses", label: "Addresses", icon: MapPin },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6">My Account</h1>

        <div className="grid md:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="bg-white rounded-lg p-4 h-fit">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Hello,</p>
                <p>{userName}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
                        ? "bg-[#2874f0] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
