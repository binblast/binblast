import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LegalContactBox, LegalSection } from "@/components/LegalSection";

export const metadata = {
  title: "Privacy Policy | Bin Blast Co.",
  description: "How Bin Blast Co. collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="July 13, 2026" activePath="/privacy">
      <LegalSection title="Information We Collect">
        <p>
          We collect information you provide when signing up or scheduling service, including name, email, phone number,
          service address, payment details (processed by Stripe), and communication preferences.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <ul>
          <li>Provide and schedule bin cleaning services</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send service confirmations, reminders, and account updates</li>
          <li>Improve operations, support, and customer experience</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          We do not sell your personal information. We share data only with service providers needed to operate our
          business (for example, payment processing, email delivery, and SMS notifications) and when required by law.
        </p>
      </LegalSection>

      <LegalSection title="Security & Retention">
        <p>
          We use industry-standard safeguards to protect account data. We retain information as long as needed to provide
          services, meet legal obligations, and resolve disputes.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices">
        <p>
          You may update account details in your dashboard or contact us to request access, correction, or deletion of
          personal information, subject to legal and operational requirements.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Have a privacy question or data request? Contact us directly.</p>
        <LegalContactBox title="Privacy requests">
          Email us for access, correction, or deletion requests related to your personal information.
        </LegalContactBox>
      </LegalSection>
    </LegalPageLayout>
  );
}
