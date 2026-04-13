import { Link } from "react-router";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-gray-300 mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">ABOUT</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-white transition">Careers</Link></li>
              <li><Link to="/press" className="hover:text-white transition">Press</Link></li>
              <li><Link to="/corporate" className="hover:text-white transition">Corporate Information</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">HELP</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/support" className="hover:text-white transition">Customer Support</Link></li>
              <li><Link to="/shipping" className="hover:text-white transition">Shipping</Link></li>
              <li><Link to="/returns" className="hover:text-white transition">Returns</Link></li>
              <li><Link to="/faq" className="hover:text-white transition">FAQ</Link></li>
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">POLICY</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/returns-policy" className="hover:text-white transition">Return Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Terms of Use</Link></li>
              <li><Link to="/security" className="hover:text-white transition">Security</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition">Privacy</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">SOCIAL</h3>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition">
                <Facebook className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition">
                <Twitter className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition">
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition">
                <Youtube className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span>© 2026 GTStore.slpro.in</span>
          </div>
          <div className="flex gap-4">
            <img src="/images/paypal.png" alt="PayPal" className="h-8 rounded shadow-sm opacity-90 hover:opacity-100 transition" />
            <img src="/images/cod.png" alt="Cash on Delivery" className="h-8 rounded shadow-sm opacity-90 hover:opacity-100 transition" />
          </div>
        </div>
      </div>
    </footer>
  );
}
