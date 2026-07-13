import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Terms of Service | Bin Blast Co.",
  description: "Terms of Service for Bin Blast Co. trash bin cleaning subscriptions and services.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="July 13, 2026">
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>1. Agreement</h2>
        <p>
          By subscribing to or using Bin Blast Co. services, you agree to these Terms of Service. If you do not agree,
          please do not use our services.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>2. Services</h2>
        <p>
          Bin Blast Co. provides professional residential trash bin cleaning on a recurring or one-time basis in our
          published service areas. Service frequency depends on your selected plan. You are responsible for placing bins
          at the curb on your scheduled service day and ensuring bins are accessible.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>3. Billing &amp; Subscriptions</h2>
        <p>
          Subscription plans renew automatically until cancelled. Charges are processed through Stripe on the billing
          cycle for your plan. You may update payment methods or cancel through your customer dashboard billing portal.
          Prorated charges or credits may apply when changing plans mid-cycle.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>4. Scheduling &amp; Access</h2>
        <p>
          Missed cleanings due to inaccessible bins, locked gates, incorrect address information, or bins not placed
          curbside may not be eligible for a credit or make-up visit. Please keep your account contact and service
          address up to date.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>5. Limitation of Liability</h2>
        <p>
          Bin Blast Co. is not liable for indirect, incidental, or consequential damages arising from service delays,
          weather, or circumstances outside our reasonable control. Our total liability for any claim is limited to the
          fees paid for the service period in which the claim arose.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>6. Contact</h2>
        <p>
          Questions about these terms:{" "}
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
