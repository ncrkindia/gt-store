import { StaticPageLayout } from "../../components/StaticPageLayout";

export function ReturnsPolicy() {
  return (
    <StaticPageLayout title="Return Policy" category="POLICY">
      <section>
        <p className="italic text-sm text-gray-400 mb-8">Last Updated: April 10, 2026</p>
        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Overview</h2>
        <p>
          At GT Store, we want you to be completely satisfied with your purchase. If for any reason you are not satisfied, you may return your items according to the terms outlined in this policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Return Eligibility</h2>
        <p>To be eligible for a return, the following conditions must be met:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Items must be returned within <strong>30 days</strong> of the delivery date.</li>
          <li>Items must be in their original, unused condition (unworn, unwashed, unaltered).</li>
          <li>All original tags, labels, and packaging must be intact.</li>
          <li>A valid proof of purchase (order confirmation or receipt) is required.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Non-Returnable Items</h2>
        <p>The following items cannot be returned or exchanged:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Personalized or custom-made products.</li>
          <li>Intimates, swimwear, and jewelry (for hygiene reasons).</li>
          <li>Items marked as "Final Sale" or "Non-Returnable" at the time of purchase.</li>
          <li>Perishable goods or gift cards.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Refund Process</h2>
        <p>
          Once your return is received and inspected, we will notify you of the approval or rejection of your refund. Approved refunds will be processed, and a credit will automatically be applied to your original method of payment within <strong>5-10 business days</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Exchange Policy</h2>
        <p>
          We currently do not offer direct exchanges. If you need a different size or color, please return the original item for a refund and place a new order.
        </p>
      </section>

      <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm">
        <h3 className="font-bold mb-2">Questions?</h3>
        <p>If you have any questions regarding our return policy, please contact our Legal Compliance team at <span className="text-indigo-600">support@slpro.in</span>.</p>
      </section>
    </StaticPageLayout>
  );
}
