import { StaticPageLayout } from "../../components/StaticPageLayout";
import { Truck, Clock, Globe, ShieldCheck } from "lucide-react";

export function Shipping() {
  return (
    <StaticPageLayout title="Shipping Information" category="HELP">
      <section>
        <p>
          We know you’re excited to receive your order, which is why we’ve partnered with the world’s most reliable carriers to ensure fast and safe delivery. Explore our shipping methods and timelines below.
        </p>
      </section>

      <section className="my-10 space-y-8">
        <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Domestic Shipping (India)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Method</th>
                                <th className="px-4 py-2 text-left">Timeline</th>
                                <th className="px-4 py-2 text-left">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr>
                                <td className="px-4 py-3">Standard</td>
                                <td className="px-4 py-3">5-7 Business Days</td>
                                <td className="px-4 py-3">Free on orders ₹499+</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">Express</td>
                                <td className="px-4 py-3">2-3 Business Days</td>
                                <td className="px-4 py-3">₹99</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">Next Day</td>
                                <td className="px-4 py-3">1 Business Day</td>
                                <td className="px-4 py-3">₹199</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-green-600" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">International Shipping</h3>
                <p className="text-sm mb-4">We ship to over 100 countries. International delivery typically takes <strong>7-14 business days</strong>. Note that customs duties and taxes may apply depending on your location.</p>
                <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
                    <li>Major Cities: 7-9 days</li>
                    <li>Regional Areas: 10-14 days</li>
                </ul>
            </div>
        </div>
      </section>

      <section className="bg-indigo-900 text-white p-8 rounded-3xl">
        <div className="flex items-center gap-4 mb-4">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
            <h3 className="text-xl font-bold">Safe Passage Guarantee</h3>
        </div>
        <p className="text-indigo-100/80 mb-6">Every GT Store package is fully insured from the moment it leaves our warehouse until it reaches your door. If your item is lost or damaged during transit, we’ll replace it at no extra cost.</p>
        <div className="flex flex-wrap gap-4">
            <span className="bg-white/10 px-4 py-2 rounded-lg text-xs">Real-time Tracking</span>
            <span className="bg-white/10 px-4 py-2 rounded-lg text-xs">Signature on Delivery</span>
            <span className="bg-white/10 px-4 py-2 rounded-lg text-xs">Sustainability Packaged</span>
        </div>
      </section>

      <section className="mt-10">
        <h3 className="font-bold text-gray-900 mb-4">Tracking Your Order</h3>
        <p className="text-sm">
            Once your order ships, you’ll receive an email with a unique tracking number. You can also track your status directly in your <span className="text-indigo-600 font-semibold cursor-pointer">Account Dashboard</span> under "Orders".
        </p>
      </section>
    </StaticPageLayout>
  );
}
