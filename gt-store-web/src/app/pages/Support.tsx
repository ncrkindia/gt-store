import { useState, useEffect } from "react";
import apiClient from "../../api/axios";
import { MessageCircle, Mail, Phone, Send, Loader2 } from "lucide-react";
import { StaticPageLayout } from "../components/StaticPageLayout";
import { toast } from "sonner";
import { useKeycloak } from "@react-keycloak/web";

export function Support() {
  const { keycloak, initialized } = useKeycloak();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    const loadProfileDetails = async () => {
      if (initialized && keycloak.authenticated && keycloak.tokenParsed) {
        setFormData(prev => ({
          ...prev,
          name: keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "",
          email: keycloak.tokenParsed?.email || "",
        }));

        try {
          const { data } = await apiClient.get("/users/me");
          if (data?.user?.phone) {
            setFormData(prev => ({ ...prev, mobile: data.user.phone }));
          }
        } catch (err) {
          console.warn("Optional pre-fill fetch failed", err);
        }
      }
    };
    
    loadProfileDetails();
  }, [initialized, keycloak.authenticated, keycloak.tokenParsed]);

  const isAutofilled = !!(keycloak.authenticated && keycloak.tokenParsed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/users/support", formData);
      toast.success("Your message has been sent! We'll get back to you soon.");
      setFormData(prev => ({
        ...prev,
        subject: "",
        message: ""
      }));
    } catch (error) {
      console.error("Support submission error:", error);
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaticPageLayout title="Customer Support" category="HELP">
      <div className="space-y-12">
        <section>
          <div className="grid lg:grid-cols-[1fr_350px] gap-8">
            {/* Contact Form */}
            <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isAutofilled}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isAutofilled}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Issue</option>
                    <option value="product">Product Question</option>
                    <option value="payment">Payment Issue</option>
                    <option value="return">Return/Refund</option>
                    <option value="technical">Technical Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-semibold shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Direct Contact</h3>
                <div className="space-y-4">
                  <a
                    href="mailto:support@slpro.in"
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-indigo-50 transition group"
                  >
                    <Mail className="w-6 h-6 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">Email Us</p>
                      <p className="text-sm text-gray-500 group-hover:text-indigo-600 transition">support@slpro.in</p>
                    </div>
                  </a>

                  <a
                    href="tel:+91-86840-5832-0"
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-indigo-50 transition group"
                  >
                    <Phone className="w-6 h-6 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">Call Us</p>
                      <p className="text-sm text-gray-500 group-hover:text-indigo-600 transition">+91-86840-5832-0</p>
                      <p className="text-xs text-gray-400">Mon-Fri, 9am-6pm IST</p>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                    <MessageCircle className="w-6 h-6 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-900">Live Chat</p>
                      <p className="text-xs text-indigo-700/70 mb-2">Available 24/7 for urgent issues</p>
                      <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition">
                        Start Chat Now →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100">
                <h4 className="font-bold mb-2">Average Response Time</h4>
                <p className="text-3xl font-bold mb-2">2-4 Hours</p>
                <p className="text-sm text-indigo-100 leading-relaxed">
                  Our dedicated team works around the clock to ensure you get the help you need quickly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pt-10 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">How do I track my order?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Log in to your account and navigate to the "Orders" section. Click on any active order to view its real-time tracking status and carrier information.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">What is your return policy?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We offer a hassle-free 30-day return policy for most unused items in original packaging. Some exceptions apply for perishables and hygiene products.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">How long does shipping take?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Standard delivery typically takes 3-5 business days. Express options are available at checkout for 1-2 day delivery in select regions.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">Do you ship internationally?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes! We ship to over 50 countries worldwide. International shipping rates and delivery times are calculated automatically at checkout.
              </p>
            </div>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  );
}
