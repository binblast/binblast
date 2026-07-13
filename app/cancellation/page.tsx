import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Cancellation & Refund Policy | Bin Blast Co.",
  description: "How to cancel your Bin Blast Co. subscription and our refund policy.",
};

export default function CancellationPage() {
  return (
    <LegalPageLayout title="Cancellation & Refund Policy" lastUpdated="July 13, 2026">
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Cancelling Your Subscription</h2>
        <p>
          You may cancel at any time from your customer dashboard using the <strong>Manage Billing</strong> button, which
          opens the secure Stripe billing portal. Cancellation stops future renewals; you will retain access through the
          end of your current paid billing period unless otherwise noted on your plan.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>One-Time &amp; Prepaid Plans</h2>
        <p>
          Yearly prepaid packages and one-time cleaning purchases are generally non-refundable once service has been
          scheduled or delivered. Unused prepaid cleanings may be handled case-by-case — contact support before your
          next scheduled visit.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Missed or Unsatisfactory Service</h2>
        <p>
          If we miss a scheduled cleaning due to our operations (not due to inaccessible bins or incorrect customer
          information), contact us within 7 days and we will reschedule or issue a credit for that visit.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Failed Payments</h2>
        <p>
          If a renewal payment fails, service may be paused until payment is updated in the billing portal. We will
          attempt to notify you by email and/or SMS.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Contact</h2>
        <p>
          Cancellation or refund questions:{" "}
          <a href="mailto:support@binblastco.com" style={{ color: "inherit" }}>
            support@binblastco.com
          </a>{" "}
          or{" "}
          <a href="tel:+14703050823" style={{ color: "inherit" }}>
            (470) 305-0823
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
