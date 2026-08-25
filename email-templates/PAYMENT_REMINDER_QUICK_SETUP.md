# Payment Reminder Email — Quick Setup

Create this **once** in EmailJS, then paste the Template ID into Vercel.

## 1. Create the EmailJS template

1. Open [EmailJS → Email Templates](https://dashboard.emailjs.com/admin/templates)
2. Click **Create New Template**
3. Name it: **Payment Reminder**
4. Open `email-templates/payment-reminder.html` in this repo → copy **all** HTML → paste into the EmailJS content editor (Code / HTML view)
5. Settings:
   - **To Email:** `{{to_email}}`
   - **Subject:** `{{email_subject}}`
   - **From Name:** Bin Blast Co.
   - **Reply To:** support@binblastco.com
6. **Save**
7. Copy the **Template ID** (looks like `template_xxxxxxx`)

## 2. Add to Vercel (two separate fields)

| Field | Exactly this |
|--------|----------------|
| **Name** | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PAYMENT_REMINDER` |
| **Value** | `template_xxxxxxx` ← your real ID from EmailJS |

Environments: Production (+ Preview if you want)

Then **Redeploy** Production (required for `NEXT_PUBLIC_` vars).

## 3. Test

In Blast Command → Customer Management → find a **pending** customer → **Remind to pay**.

## Variables this template uses

```
to_email
email_subject
logoUrl
firstName
planName
pricingLink
```
