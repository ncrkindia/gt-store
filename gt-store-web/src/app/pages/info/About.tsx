import { StaticPageLayout } from "../../components/StaticPageLayout";

export function About() {
  return (
    <StaticPageLayout title="About Us" category="ABOUT">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
        <p>
          At <strong>GT Store</strong>, we believe that shopping should be an inspiring and effortless experience. Our mission is to provide a curated selection of premium products that blend style with functionality, delivered with the convenience of modern technology.
        </p>
      </section>

      <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 my-8">
        <h2 className="text-xl font-bold text-indigo-900 mb-2">The GT Store Story</h2>
        <p className="text-indigo-800/80 italic">
          Founded in 2026, GT Store started with a simple idea: that "quality shouldn't be a luxury". What began as a small collection of essential gadgets has grown into a global marketplace for those who appreciate the finer details.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose GT Store?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-100 p-5 rounded-xl hover:shadow-md transition">
            <h3 className="font-bold text-gray-900 mb-2">Curated Quality</h3>
            <p className="text-sm">We handpick every item on our store, ensuring it meets our rigorous standards for durability and design.</p>
          </div>
          <div className="border border-gray-100 p-5 rounded-xl hover:shadow-md transition">
            <h3 className="font-bold text-gray-900 mb-2">Customer First</h3>
            <p className="text-sm">Our support team is available 24/7 to ensure your experience is nothing short of perfect.</p>
          </div>
          <div className="border border-gray-100 p-5 rounded-xl hover:shadow-md transition">
            <h3 className="font-bold text-gray-900 mb-2">Fast Logistics</h3>
            <p className="text-sm">With our global warehouse network, we deliver your favorite products faster than ever.</p>
          </div>
          <div className="border border-gray-100 p-5 rounded-xl hover:shadow-md transition">
            <h3 className="font-bold text-gray-900 mb-2">Secure Shopping</h3>
            <p className="text-sm">Your privacy and security are our top priorities, using industry-leading encryption.</p>
          </div>
        </div>
      </section>

      <section className="mt-10 pt-8 border-t border-gray-100 text-center">
        <p className="text-lg font-medium text-gray-900 mb-4">Ready to explore our collection?</p>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition font-semibold">
          Shop Now
        </button>
      </section>
    </StaticPageLayout>
  );
}
