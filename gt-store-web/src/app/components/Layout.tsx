import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Toaster } from "sonner";

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = "GT Store | Next-Gen Premium Commerce";

    if (path === "/" || path === "") {
      title = "GT Store | Premium Technology & Electronics";
    } else if (path.startsWith("/about")) {
      title = "Our Story & Vision | GT Store";
    } else if (path.startsWith("/careers")) {
      title = "Join Our Engineering Team | GT Store";
    } else if (path.startsWith("/press")) {
      title = "Media Room & News | GT Store";
    } else if (path.startsWith("/corporate")) {
      title = "Corporate Overview | GT Store";
    } else if (path.startsWith("/faq")) {
      title = "Help & FAQs Desk | GT Store";
    } else if (path.startsWith("/shipping")) {
      title = "Logistics & Shipping | GT Store";
    } else if (path.startsWith("/returns")) {
      title = "Simple Exchange Policy | GT Store";
    } else if (path.startsWith("/terms")) {
      title = "Website Agreements & Terms | GT Store";
    } else if (path.startsWith("/privacy")) {
      title = "Privacy Vault Standards | GT Store";
    } else if (path.startsWith("/security")) {
      title = "Cyber Trust & Safety | GT Store";
    } else if (path.startsWith("/product/") || path.startsWith("/p/")) {
      const parts = path.split("/");
      const slug = parts[parts.length - 1] || "";
      // Formulate a pretty title from slug if present
      const formattedSlug = slug
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      title = formattedSlug ? `${formattedSlug} | GT Store` : "Premium Hardware | GT Store";
    } else if (path.startsWith("/category/")) {
      const parts = path.split("/category/");
      const cat = parts[1] ? decodeURIComponent(parts[1]).replace(/-/g, ' ') : "COLLECTION";
      const capitalized = cat.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      title = `${capitalized} Collection | GT Store`;
    } else if (path.startsWith("/brand/")) {
      const parts = path.split("/brand/");
      const brnd = parts[1] ? decodeURIComponent(parts[1]).replace(/-/g, ' ') : "BRAND";
      const capitalized = brnd.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      title = `Explore ${capitalized} | GT Store`;
    } else if (path.startsWith("/search")) {
      title = "Live Search Results | GT Store";
    } else if (path.startsWith("/cart")) {
      title = "Checkout Cart | GT Store";
    } else if (path.startsWith("/account/orders")) {
      title = "My Order Ledger | GT Account";
    } else if (path.startsWith("/account/wishlist")) {
      title = "Saved Gear Wishlist | GT Account";
    } else if (path.startsWith("/account/addresses")) {
      title = "Delivery Safe Houses | GT Account";
    } else if (path.startsWith("/account")) {
      title = "My Personal Dashboard | GT Account";
    } else if (path.startsWith("/orders/")) {
      const parts = path.split("/orders/");
      const ordId = parts[1] ? parts[1].substring(0, 8).toUpperCase() : "";
      title = `Fulfillment Tracking #${ordId} | GT Store`;
    } else if (path.startsWith("/support")) {
      title = "Interactive Customer Care | Support Desk";
    }

    document.title = title;
  }, [location]);
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
