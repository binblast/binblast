import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata = {
  title: "Privacy Policy | Bin Blast Co.",
  description: "How Bin Blast Co. collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="July 13, 2026">
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Information We Collect</h2>
        <p>
          We collect information you provide when signing up or scheduling service, including name, email, phone number,
          service address, payment details (processed by Stripe), and communication preferences.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>How We Use Information</h2>
        <ul style={{ paddingLeft: "1.25rem" }}>
          <li>Provide and schedule bin cleaning services</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send service confirmations, reminders, and account updates</li>
          <li>Improve operations, support, and customer experience</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Sharing</h2>
        <p>
          We do not sell your personal information. We share data only with service providers needed to operate our
          business (for example, payment processing, email delivery, and SMS notifications) and when required by law.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Security &amp; Retention</h2>
        <p>
          We use industry-standard safeguards to protect account data. We retain information as long as needed to provide
          services, meet legal obligations, and resolve disputes.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Your Choices</h2>
        <p>
          You may update account details in your dashboard or contact us to request access, correction, or deletion of
          personal information, subject to legal and operational requirements.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:support@binblastco.com" style={{ color: "inherit" }}>
            support@binblastco.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
