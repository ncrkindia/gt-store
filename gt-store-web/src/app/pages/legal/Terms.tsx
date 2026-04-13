import { StaticPageLayout } from "../../components/StaticPageLayout";

export function Terms() {
  return (
    <StaticPageLayout title="Terms of Use" category="POLICY">
      <section>
        <p className="italic text-sm text-gray-400 mb-8">Last Updated: April 10, 2026</p>
        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing and using <strong>GT Store</strong> (the "Website"), you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Use License</h2>
        <p>Permission is granted to temporarily download one copy of the materials on GT Store's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4">
          <li>Modify or copy the materials.</li>
          <li>Use the materials for any commercial purpose.</li>
          <li>Attempt to decompile or reverse engineer any software contained on the website.</li>
          <li>Remove any copyright or other proprietary notations from the materials.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
        <p>
          To access some features of the Website, you may be required to create an account. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Limitations of Liability</h2>
        <p>
          In no event shall GT Store or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on GT Store's website.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the laws of Singapore and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
        </p>
      </section>

      <section className="bg-gray-900 text-white p-6 rounded-2xl text-sm">
        <p>GT Store reserves the right, at its sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.</p>
      </section>
    </StaticPageLayout>
  );
}
