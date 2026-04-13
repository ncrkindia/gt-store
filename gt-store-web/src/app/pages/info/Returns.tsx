import { StaticPageLayout } from "../../components/StaticPageLayout";
import { ClipboardCheck, Package, Send, RefreshCw } from "lucide-react";

export function Returns() {
  return (
    <StaticPageLayout title="How to Return" category="HELP">
      <section>
        <p>
          Need to return something? No problem! At GT Store, we strive for 100% satisfaction. If you're not happy with your purchase, follow our simple 4-step return process within 30 days of receipt.
        </p>
      </section>

      <section className="my-10 space-y-12 relative">
        <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-dashed bg-indigo-100 hidden md:block" />

        <div className="flex gap-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold shadow-lg">1</div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request Return</h3>
                <p className="text-sm">Head over to your <span className="font-semibold text-indigo-600">Orders</span> page, select the items you wish to return, and click "Initiate Return". Briefly tell us why so we can improve!</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                    <ClipboardCheck className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Have your Order ID and Email ready.</span>
                </div>
            </div>
        </div>

        <div className="flex gap-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold shadow-lg">2</div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pack the Items</h3>
                <p className="text-sm">Place the items securely in their original packaging, including all tags, manuals, and accessories. Unpacked or damaged tags may delay your refund.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Reusable packaging is encouraged.</span>
                </div>
            </div>
        </div>

        <div className="flex gap-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold shadow-lg">3</div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ship Back</h3>
                <p className="text-sm">Print the pre-paid label we provided and drop off the package at any authorized courier location. Shipping is free for Domestic returns!</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                    <Send className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Keep your drop-off receipt.</span>
                </div>
            </div>
        </div>

        <div className="flex gap-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold shadow-lg">4</div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Receive Refund</h3>
                <p className="text-sm">Once we receive and inspect your items (usually within 3 days), we’ll issue your refund to the original payment method.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Funds appear in 5-10 business days.</span>
                </div>
            </div>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-sm italic text-amber-900">
        <strong>Exceptions:</strong> Personalized items, underwear, and final sale clearance items are not eligible for return unless defective. See our <span className="underline font-bold">Return Policy</span> for full legal terms.
      </section>
    </StaticPageLayout>
  );
}
