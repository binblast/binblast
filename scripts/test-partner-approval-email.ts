/**
 * Send a test partner approval email via EmailJS (template_uourt0p).
 *
 * Usage:
 *   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_key \
 *   npx tsx scripts/test-partner-approval-email.ts --to you@example.com
 */

import { notifyPartnerApproval } from "../lib/email-utils";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const to = getArg("--to") || process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error("Missing recipient. Pass --to you@example.com");
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) {
    console.error("Missing NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in environment.");
    process.exit(1);
  }

  console.log(`Sending partner approval test email to ${to}...`);

  const result = await notifyPartnerApproval({
    email: to,
    ownerName: "Test Owner",
    businessName: "Test Business LLC",
    referralCode: "TEST123",
    serviceAreas: "Peachtree City, Fayetteville",
    revenueSharePartner: 0.6,
    revenueSharePlatform: 0.4,
    signupLink: "https://www.binblastco.com/register?partner=true",
    partnerId: "test-partner-id",
  });

  if (result.success) {
    console.log("✅ Email sent successfully.");
    return;
  }

  console.error("❌ Email failed:", result.error);
  process.exit(1);
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
