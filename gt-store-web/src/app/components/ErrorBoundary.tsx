import { useRouteError, Link } from "react-router";
import { AlertTriangle, RotateCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function RouteErrorBoundary() {
  const error = useRouteError() as any;
  const [showDetails, setShowDetails] = useState(false);

  console.error("ErrorBoundary caught an exception:", error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-indigo-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-white/85 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
        {/* Decorative Background Blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />

        {/* Dynamic Warning Icon */}
        <div className="inline-flex p-5 bg-rose-50 rounded-2xl text-rose-500 mb-6 shadow-inner border border-rose-100 animate-pulse">
          <AlertTriangle className="w-12 h-12" />
        </div>

        {/* Error Headers */}
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
          Unexpected Application Error
        </h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We apologize, but something went wrong while loading this page. Our technical team has been notified.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <RotateCw className="w-4 h-4 animate-spin-slow" />
            Reload this Page
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-2xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <Home className="w-4 h-4 text-gray-500" />
            Back to Homepage
          </Link>
        </div>

        {/* Collapsible Technical Details for Debugging */}
        {error && (
          <div className="border-t border-gray-200 pt-6 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition mx-auto focus:outline-none cursor-pointer"
            >
              {showDetails ? (
                <>
                  Hide technical specifications
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Show technical specifications
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-4 bg-slate-900 rounded-2xl p-5 text-left border border-slate-800 shadow-inner overflow-x-auto max-h-60 animate-in fade-in slide-in-from-top-4 duration-300">
                <p className="text-rose-400 font-mono text-xs font-semibold mb-2">
                  {error.message || error.statusText || String(error)}
                </p>
                {error.stack && (
                  <pre className="text-[10px] font-mono text-slate-400 leading-relaxed whitespace-pre">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
