# Phase 1 Transactional Emails

These emails are wired in code and send through the existing **EmailJS generic template**
(`NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_GENERIC_MESSAGE` or fallback `template_ent7lyj`).

## Live triggers

| Email | Audience | Trigger |
|-------|----------|---------|
| Payment failed | Customer | Stripe `invoice.payment_failed` webhook |
| Cleaning complete | Customer | Employee or operator marks job complete |
| Partner rejection | Partner applicant | Admin rejects partner application |
| Staff invitation | Employee / Operator | Owner creates team account or admin hires employee |

## EmailJS template variables (generic template)

Use the same fields as customer welcome / cleaning scheduled:

- `to_email`
- `firstName`, `lastName`
- `confirmationTitle` → email subject line
- `confirmationMessage` → HTML body
- `buttonText`, `buttonColor`, `dashboardLink`

## Optional dedicated templates

Copy HTML from the files in this folder into new EmailJS templates if you want
separate designs per email type:

- `payment-failed.html`
- `cleaning-complete.html`
- `partner-rejection.html`
- `staff-invitation.html`

Staff invitations also reuse the existing team member template (`template_9796g8g`).

## Code locations

- `lib/email-utils.ts` — send helpers
- `lib/phase1-email-content.ts` — HTML copy builders
- `app/api/webhooks/stripe/route.ts` — payment failed
- `app/api/employee/jobs/[jobId]/complete/route.ts` — cleaning complete
- `app/api/operator/jobs/[jobId]/complete/route.ts` — cleaning complete
- `app/api/admin/partners/applications/[id]/reject/route.ts` — partner rejection
- `app/api/admin/team-accounts/route.ts` — staff invite
- `app/api/admin/employees/route.ts` — staff invite
