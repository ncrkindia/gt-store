export function AdminFooter() {
    return (
      <footer className="border-t border-slate-200 bg-white py-6 px-8 text-center text-slate-500 text-sm flex justify-between items-center mt-auto shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="font-medium">Cloud Infrastructure Operational</span>
          </div>
          <div className="font-medium">
              © {new Date().getFullYear()} GT Store Admin Engine
          </div>
      </footer>
    );
}
