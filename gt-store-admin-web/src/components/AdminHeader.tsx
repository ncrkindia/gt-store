import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { User, LogOut } from 'lucide-react';

export function AdminHeader() {
  const { keycloak } = useKeycloak();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 w-full shrink-0 shadow-sm">
      {/* Top Bar Gradient matching main store theme exactly */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo Section mapped similarly to gt-store-web */}
          <div className="flex items-center gap-2 select-none">
             <Link to="/dashboard" className="flex items-center gap-2 group">
                <div className="text-white">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight group-hover:opacity-90 transition">GT Store</span>
                        <span className="bg-white/20 backdrop-blur text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white border border-white/20 shadow-sm">
                            Admin Portal
                        </span>
                    </div>
                </div>
             </Link>
          </div>

          {/* Top Actions System Info / Admin Identity */}
          <div className="flex items-center gap-4 text-white">
            <div className="hidden sm:flex flex-col text-right leading-tight mr-2">
                <span className="text-sm font-bold tracking-wide">{keycloak.tokenParsed?.given_name || 'Administrator'}</span>
                <span className="text-[10px] opacity-70 uppercase tracking-widest">Access Authenticated</span>
            </div>
            
            <div className="w-px h-8 bg-white/20 mx-1 hidden sm:block" />

            {/* User Quick Actions */}
            <div className="flex items-center gap-2">
                <div className="bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm cursor-default">
                    <User className="w-4 h-4 text-indigo-200" />
                    <span className="text-xs font-medium hidden md:inline">Active Profile</span>
                </div>
                <button 
                    onClick={() => keycloak.logout({ redirectUri: window.location.origin })} 
                    className="bg-white/10 hover:bg-red-500 hover:text-white transition px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-sm cursor-pointer"
                    title="Secure Logout"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">Logout</span>
                </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
