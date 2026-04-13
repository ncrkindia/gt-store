import { Outlet } from "react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Toaster } from "sonner";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-indigo-50/20">
      <Toaster position="top-right" richColors closeButton />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
