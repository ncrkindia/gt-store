import { useState } from "react";
import { MessageCircle, Mail, Phone, Send, HelpCircle, FileText, Package } from "lucide-react";

export function Support() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic here
    alert("Your message has been sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl mb-4">Customer Support</h1>
          <p className="text-gray-600">
            We're here to help! Get in touch with our support team.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-lg p-8">
            <h2 className="text-xl mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
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
                <label className="block text-sm text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2874f0] resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#2874f0] text-white py-3 rounded-lg hover:bg-[#1c5ccc] transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info & Quick Links */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg mb-4">Get in Touch</h3>
              <div className="space-y-4">
                <a
                  href="mailto:support@shopkart.com"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <Mail className="w-5 h-5 text-[#2874f0] mt-0.5" />
                  <div>
                    <p className="text-sm">Email us</p>
                    <p className="text-xs text-gray-600">support@shopkart.com</p>
                  </div>
                </a>

                <a
                  href="tel:+15551234567"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <Phone className="w-5 h-5 text-[#2874f0] mt-0.5" />
                  <div>
                    <p className="text-sm">Call us</p>
                    <p className="text-xs text-gray-600">+1 (555) 123-4567</p>
                    <p className="text-xs text-gray-500">Mon-Fri, 9am-6pm EST</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                  <MessageCircle className="w-5 h-5 text-[#2874f0] mt-0.5" />
                  <div>
                    <p className="text-sm">Live Chat</p>
                    <p className="text-xs text-gray-600">Available 24/7</p>
                    <button className="text-xs text-[#2874f0] hover:underline mt-1">
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Help */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg mb-4">Quick Help</h3>
              <div className="space-y-2">
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">FAQs</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <Package className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">Track Order</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">Return Policy</span>
                </a>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="mb-2">Average Response Time</h4>
              <p className="text-2xl text-[#2874f0] mb-2">2-4 hours</p>
              <p className="text-xs text-gray-600">
                Our team typically responds within 2-4 hours during business hours.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-lg p-8">
          <h2 className="text-2xl mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2">How do I track my order?</h3>
              <p className="text-sm text-gray-600">
                You can track your order by going to the Orders section in your account. Click
                on the order you want to track and you'll see the current status and tracking
                information.
              </p>
            </div>

            <div>
              <h3 className="mb-2">What is your return policy?</h3>
              <p className="text-sm text-gray-600">
                We offer a 30-day return policy for most items. Products must be unused and in
                their original packaging. Visit our Returns page for more details.
              </p>
            </div>

            <div>
              <h3 className="mb-2">How long does shipping take?</h3>
              <p className="text-sm text-gray-600">
                Standard shipping typically takes 5-7 business days. Express shipping is
                available for 2-3 business days. Free shipping is available on orders over $50.
              </p>
            </div>

            <div>
              <h3 className="mb-2">Do you ship internationally?</h3>
              <p className="text-sm text-gray-600">
                Yes, we ship to over 100 countries worldwide. International shipping times and
                costs vary by location. Check our shipping page for specific details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
