import { StaticPageLayout } from "../../components/StaticPageLayout";

export function Press() {
  return (
    <StaticPageLayout title="Press" category="ABOUT">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest News & Media</h2>
        <p>
          Welcome to the GT Store Press Room. Here you’ll find our latest announcements, media assets, and company updates as we continue to grow.
        </p>
      </section>

      <section className="my-10 space-y-6">
        <div className="border-l-4 border-indigo-600 pl-6 py-2">
            <span className="text-sm font-semibold text-gray-400">APR 10, 2026</span>
            <h3 className="text-xl font-bold text-gray-900 mt-1">GT Store Announces New Phase</h3>
            <p className="mt-2 text-sm">Today we announce our focus on an integrated, seamless shopping experience worldwide under the GT Store brand.</p>
        </div>
        <div className="border-l-4 border-gray-200 pl-6 py-2">
            <span className="text-sm font-semibold text-gray-400">MAR 15, 2026</span>
            <h3 className="text-xl font-bold text-gray-900 mt-1">GT Store Expands Direct-to-Consumer Logistics</h3>
            <p className="mt-2 text-sm">Our new automated fulfillment center in Singapore is now live, reducing shipping times by 40% across Southeast Asia.</p>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8 mt-12">
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Media Assets</h3>
            <p className="text-sm mb-4">Download official logos, brand guidelines, and high-resolution product imagery for editorial use.</p>
            <button className="text-indigo-600 font-semibold text-sm hover:underline">Download Press Kit (ZIP)</button>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Contact Us</h3>
            <p className="text-sm mb-4">For all media inquiries, interview requests, and press-related information, please reach out to our team.</p>
            <p className="text-indigo-600 font-semibold text-sm underline">support@slpro.in</p>
        </div>
      </section>

      <section className="mt-12 text-gray-400 text-sm italic">
        * Please note: The Press contact email is for media inquiries only. Customer support requests will not receive a response here.
      </section>
    </StaticPageLayout>
  );
}
