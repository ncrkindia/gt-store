import { StaticPageLayout } from "../../components/StaticPageLayout";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-indigo-600 transition"
      >
        <span className="font-bold text-gray-900 pr-8">{question}</span>
        {isOpen ? <Minus className="w-5 h-5 shrink-0" /> : <Plus className="w-5 h-5 shrink-0" />}
      </button>
      {isOpen && (
        <div className="pb-6 text-sm text-gray-500 animate-in fade-in slide-in-from-top-2 duration-200">
          {answer}
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  return (
    <StaticPageLayout title="Frequently Asked Questions" category="HELP">
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-bold text-indigo-600 mb-4 border-b pb-2 uppercase tracking-widest text-xs">Ordering & Payments</h2>
          <div className="divide-y">
            <FAQItem 
              question="What payment methods do you accept?" 
              answer="We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Google Pay. We also offer Interest-Free Installments through Afterpay in select regions."
            />
            <FAQItem 
              question="Can I change or cancel my order after it has been placed?" 
              answer="Orders are processed quickly to ensure fast delivery. You can cancel your order within 30 minutes of placement through your Account Dashboard. After that, we may be unable to cancel it, but you can always return it once received."
            />
            <FAQItem 
              question="Do you offer gift wrapping?" 
              answer="Yes! You can add premium gift wrapping and a personalized note at checkout for a small additional fee."
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-indigo-600 mb-4 border-b pb-2 uppercase tracking-widest text-xs">Shipping & Delivery</h2>
          <div className="divide-y">
            <FAQItem 
              question="How can I track my shipment?" 
              answer="Once your order ships, you will receive an email with a tracking link. You can also view real-time tracking from your 'Orders' page in your GT Store account."
            />
            <FAQItem 
              question="What happens if my package is lost?" 
              answer="Don't worry! All GT Store shipments are insured. If your package is confirmed lost by the carrier, we will ship a replacement immediately at no cost to you."
            />
            <FAQItem 
              question="Do you ship to P.O. Boxes?" 
              answer="Currently, we only ship to physical residential or business addresses via our express carriers to ensure signature verification and safety."
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-indigo-600 mb-4 border-b pb-2 uppercase tracking-widest text-xs">Returns & Refunds</h2>
          <div className="divide-y">
            <FAQItem 
              question="How long do I have to return an item?" 
              answer="You have 30 days from the date of delivery to initiate a return. Items must be in their original condition with all tags attached."
            />
            <FAQItem 
              question="When will I receive my refund?" 
              answer="Refunds are typically processed within 3 business days of receiving your return package. Depending on your bank, it may take an additional 5-10 business days for the funds to appear in your account."
            />
          </div>
        </section>
      </div>

      <div className="mt-12 p-8 bg-indigo-50 rounded-3xl text-center">
        <h3 className="font-bold text-indigo-900 mb-2">Still have questions?</h3>
        <p className="text-sm text-indigo-700/70 mb-6">Our support team is available 24/7 to help you with anything you need.</p>
        <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl shadow-sm hover:shadow-md transition font-semibold">
           Contact Support
        </button>
      </div>
    </StaticPageLayout>
  );
}
