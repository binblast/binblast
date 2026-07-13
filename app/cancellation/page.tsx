import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LegalContactBox, LegalSection } from "@/components/LegalSection";

export const metadata = {
  title: "Cancellation & Refund Policy | Bin Blast Co.",
  description: "How to cancel your Bin Blast Co. subscription and our refund policy.",
};

export default function CancellationPage() {
  return (
    <LegalPageLayout
      title="Cancellation & Refund Policy"
      lastUpdated="July 13, 2026"
      activePath="/cancellation"
    >
      <LegalSection title="Cancelling Your Subscription">
        <p>
          You may cancel at any time from your customer dashboard using the <strong>Manage Billing</strong> button,
          which opens the secure Stripe billing portal. Cancellation stops future renewals; you will retain access
          through the end of your current paid billing period unless otherwise noted on your plan.
        </p>
      </LegalSection>

      <LegalSection title="One-Time & Prepaid Plans">
        <p>
          Yearly prepaid packages and one-time cleaning purchases are generally non-refundable once service has been
          scheduled or delivered. Unused prepaid cleanings may be handled case-by-case — contact support before your
          next scheduled visit.
        </p>
      </LegalSection>

      <LegalSection title="Missed or Unsatisfactory Service">
        <p>
          If we miss a scheduled cleaning due to our operations (not due to inaccessible bins or incorrect customer
          information), contact us within 7 days and we will reschedule or issue a credit for that visit.
        </p>
      </LegalSection>

      <LegalSection title="Failed Payments">
        <p>
          If a renewal payment fails, service may be paused until payment is updated in the billing portal. We will
          attempt to notify you by email and/or SMS.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Need help cancelling or requesting a refund? We&apos;re here for you.</p>
        <LegalContactBox title="Cancellation & refund support">
          Contact support before your next visit if you have unused prepaid cleanings or billing questions.
        </LegalContactBox>
      </LegalSection>
    </LegalPageLayout>
  );
}
