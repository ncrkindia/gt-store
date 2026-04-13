import { StaticPageLayout } from "../../components/StaticPageLayout";
import { Lock, ShieldCheck, Eye, WifiOff } from "lucide-react";

export function Security() {
  return (
    <StaticPageLayout title="Security" category="POLICY">
      <section>
        <p>
          At GT Store, we treat the security of your account and personal data with the highest priority. We employ multi-layered security protocols to ensure your shopping experience is safe and your information is protected.
        </p>
      </section>

      <section className="my-10 grid md:grid-cols-2 gap-8">
        <div className="flex gap-4 items-start">
            <Lock className="w-8 h-8 text-indigo-600 shrink-0" />
            <div>
                <h3 className="font-bold text-gray-900 mb-1">Encrypted Transactions</h3>
                <p className="text-sm">All traffic to and from GT Store is encrypted using 256-bit SSL (Secure Sockets Layer) technology. We ensure your payment data is never stored on our servers.</p>
            </div>
        </div>
        <div className="flex gap-4 items-start">
            <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
            <div>
                <h3 className="font-bold text-gray-900 mb-1">PCI-DSS Compliance</h3>
                <p className="text-sm">Our payment infrastructure is fully PCI-DSS Level 1 compliant, the highest security standard in the payment industry.</p>
            </div>
        </div>
        <div className="flex gap-4 items-start">
            <Eye className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
                <h3 className="font-bold text-gray-900 mb-1">Continuous Monitoring</h3>
                <p className="text-sm">Our automated systems monitor for fraudulent activity 24/7, providing real-time protection against unauthorized account access.</p>
            </div>
        </div>
        <div className="flex gap-4 items-start">
            <WifiOff className="w-8 h-8 text-red-500 shrink-0" />
            <div>
                <h3 className="font-bold text-gray-900 mb-1">DDoS Mitigation</h3>
                <p className="text-sm">We use advanced cloud firewalls and edge computing to protect our platform against large-scale denial-of-service attacks.</p>
            </div>
        </div>
      </section>

      <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Reporting a Vulnerability</h3>
        <p className="text-sm mb-4">We are committed to the safety of our users. If you believe you have discovered a security vulnerability on GT Store, please report it to us immediately through our Bug Bounty program.</p>
        <p className="text-indigo-600 font-bold text-sm underline cursor-pointer">support@slpro.in</p>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        We recommend using a strong, unique password for your GT Store account and enabling Two-Factor Authentication (2FA) in your account settings.
      </p>
    </StaticPageLayout>
  );
}
