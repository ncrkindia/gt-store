import { StaticPageLayout } from "../../components/StaticPageLayout";

export function Careers() {
  return (
    <StaticPageLayout title="Careers" category="ABOUT">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Join the GT Store Team</h2>
        <p>
          We are builders, dreamers, and doers. At GT Store, we’re shaping the future of global e-commerce and we’re looking for talented individuals to join our journey.
        </p>
      </section>

      <section className="my-10">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Our Culture</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-indigo-600 mb-2">Innovation</h4>
            <p className="text-sm">We encourage bold ideas and rapid experimentation. Failure is just a data point for growth.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-indigo-600 mb-2">Inclusion</h4>
            <p className="text-sm">Diversity is our strength. We believe great ideas can come from anyone, anywhere.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-indigo-600 mb-2">Ownership</h4>
            <p className="text-sm">We give our team the autonomy to own their work and make a real impact on our customers.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Perks & Benefits</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Remote-first flexible working environment</li>
          <li>Comprehensive health, dental, and vision insurance</li>
          <li>Competitive salary and performance bonuses</li>
          <li>Annual learning and development stipend</li>
          <li>Equity options for all full-time employees</li>
        </ul>
      </section>

      <div className="bg-gray-900 text-white p-8 rounded-3xl mt-12 text-center">
        <h3 className="text-2xl font-bold mb-2">Open Positions</h3>
        <p className="text-gray-400 mb-6">We're currently scaling our Engineering, Design, and Marketing teams.</p>
        <button className="bg-white text-gray-900 px-8 py-3 rounded-xl hover:bg-gray-100 transition font-semibold">
          View All Openings
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-gray-400 italic">
        Don't see a role that fits? Shoot us your resume at <span className="text-indigo-600">support@slpro.in</span> and we'll keep you in mind for future opportunities.
      </p>
    </StaticPageLayout>
  );
}
