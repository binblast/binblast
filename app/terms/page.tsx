import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LegalContactBox, LegalSection } from "@/components/LegalSection";

export const metadata = {
  title: "Terms of Service | Bin Blast Co.",
  description: "Terms of Service for Bin Blast Co. trash bin cleaning subscriptions and services.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="July 13, 2026" activePath="/terms">
      <LegalSection title="1. Agreement">
        <p>
          By subscribing to or using Bin Blast Co. services, you agree to these Terms of Service. If you do not agree,
          please do not use our services.
        </p>
      </LegalSection>

      <LegalSection title="2. Services">
        <p>
          Bin Blast Co. provides professional residential trash bin cleaning on a recurring or one-time basis in our
          published service areas. Service frequency depends on your selected plan. You are responsible for placing bins
          at the curb on your scheduled service day and ensuring bins are accessible.
        </p>
      </LegalSection>

      <LegalSection title="3. Billing & Subscriptions">
        <p>
          Subscription plans renew automatically until cancelled. Charges are processed through Stripe on the billing
          cycle for your plan. You may update payment methods or cancel through your customer dashboard billing portal.
          Prorated charges or credits may apply when changing plans mid-cycle.
        </p>
      </LegalSection>

      <LegalSection title="4. Scheduling & Access">
        <p>
          Missed cleanings due to inaccessible bins, locked gates, incorrect address information, or bins not placed
          curbside may not be eligible for a credit or make-up visit. Please keep your account contact and service
          address up to date.
        </p>
      </LegalSection>

      <LegalSection title="5. Limitation of Liability">
        <p>
          Bin Blast Co. is not liable for indirect, incidental, or consequential damages arising from service delays,
          weather, or circumstances outside our reasonable control. Our total liability for any claim is limited to the
          fees paid for the service period in which the claim arose.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>Questions about these terms? Our support team is happy to help.</p>
        <LegalContactBox title="Terms questions">
          Reach out anytime and we&apos;ll get back to you as soon as possible.
        </LegalContactBox>
      </LegalSection>
    </LegalPageLayout>
  );
}
