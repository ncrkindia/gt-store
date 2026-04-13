import { StaticPageLayout } from "../../components/StaticPageLayout";

export function Privacy() {
  return (
    <StaticPageLayout title="Privacy Policy" category="POLICY">
      <section>
        <p className="italic text-sm text-gray-400 mb-8">Last Updated: April 10, 2026</p>
        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
        <p>
          We collect information to provide better services to all our users. This includes:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li><strong>Personal Information:</strong> Name, email address, phone number, and shipping address when you create an account or place an order.</li>
          <li><strong>Payment Information:</strong> We do not store credit card numbers; they are processed securely through our PCI-compliant partners.</li>
          <li><strong>Log Information:</strong> Details of how you used our service, such as search queries, IP address, and browser type.</li>
          <li><strong>Cookies:</strong> Small files stored on your device that help us remember your preferences and improve your experience.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">2. How We Use Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Process and deliver your orders.</li>
          <li>Communicate with you regarding order updates and promotions (with your consent).</li>
          <li>Prevent fraud and enhance platform security.</li>
          <li>Analyze site usage to improve our product offerings and site performance.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Data Sharing</h2>
        <p>
          We do not sell your personal data to third parties. We only share information with partners essential for fulfilling your request, such as shipping carriers and payment processors.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Your Rights</h2>
        <p>
          You have the right to access, update, or request the deletion of your personal data at any time. To exercise these rights, please visit your account settings or contact our Data Privacy Officer.
        </p>
      </section>

      <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-sm">
        <h3 className="font-bold mb-2">GDPR & CCPA Compliance</h3>
        <p>GT Store is fully compliant with the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA). For more detailed inquiries, email <span className="text-indigo-600 font-semibold">support@slpro.in</span>.</p>
      </section>
    </StaticPageLayout>
  );
}
