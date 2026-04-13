import { StaticPageLayout } from "../../components/StaticPageLayout";

export function Corporate() {
  return (
    <StaticPageLayout title="Corporate Information" category="ABOUT">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Governance & Structure</h2>
        <p>
          GT Store is a subsidiary of <strong>GT Global Group</strong>, specializing in digital retail and logistical infrastructure. We are committed to transparency, ethical business practices, and creating long-term value for our users and stakeholders.
        </p>
      </section>

      <section className="my-10 grid md:grid-cols-2 gap-10">
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Headquarters</h3>
          <div className="text-sm space-y-1">
            <p className="font-semibold">GT Store</p>
            <p>Business Center</p>
            <p>Sector 62, Noida</p>
            <p>Uttar Pradesh, India</p>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Regional Offices</h3>
          <ul className="text-sm space-y-1">
            <li><strong>Noida:</strong> Business Center, Sector 62</li>
            <li><strong>Meerut:</strong>Lal Kurti, Meerut</li>
            <li><strong>New Delhi:</strong>Saket, New Delhi</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-6 font-primary">Leadership</h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
            <div>
              <h4 className="font-bold text-gray-900">Naveen Chauhan</h4>
              <p className="text-xs text-gray-500 uppercase font-semibold">Chief Executive Officer & Founder</p>
            </div>
          </div>

        </div>
      </section>

      <section className="mt-12 p-6 border border-gray-100 rounded-3xl text-sm">
        <h4 className="font-bold mb-2">Registration Details</h4>
        <p>Entity Name: GT Store Global Private Limited</p>
        <p>Company Registration No.: 2026XXXXXX</p>
        <p>Incorporation Date: 26th January 2026</p>
      </section>
    </StaticPageLayout>
  );
}
