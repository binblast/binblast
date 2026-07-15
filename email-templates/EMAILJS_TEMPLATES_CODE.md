# EmailJS Template Setup — Bin Blast Co.

Each email type has its **own HTML template** in EmailJS. Copy the matching file from `email-templates/`, set the subject line below, then paste the Template ID into Vercel.

**EmailJS settings (all templates):**
- **To Email:** `{{to_email}}`
- **From Name:** Bin Blast Co.
- **Reply To:** support@binblastco.com
- **Subject:** `{{email_subject}}`

Enable **server-side API** in EmailJS: Account → Security → allow server requests.

---

## Template map

| Email | HTML file | Env var | Fallback ID | Subject line |
|-------|-----------|---------|-------------|--------------|
| Customer Welcome | `customer-welcome.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CUSTOMER_WELCOME` | `template_ent7lyj` | Welcome to Bin Blast Co. — your fresh bins start here |
| Cleaning Scheduled | `cleaning-scheduled-confirmation.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_SCHEDULED` | `template_ent7lyj` | You're all set — bin cleaning confirmed |
| Payment Failed | `payment-failed.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PAYMENT_FAILED` | `template_ent7lyj` | Action needed: update your payment method |
| Cleaning Complete | `cleaning-complete.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_COMPLETE` | `template_ent7lyj` | Your bins are fresh — cleaning complete |
| Partner Application (admin) | `partnership-application.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION` | `template_aabpctf` | New partner application: {{businessName}} |
| Partner Approval | `partner-approval.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL` | `template_lm4wzqr` | You're approved — welcome to the Bin Blast partner program |
| Partner Rejection | `partner-rejection.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_REJECTION` | `template_ent7lyj` | Update on your Bin Blast partner application |
| Team Member Invitation | `team-member-invitation.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TEAM_MEMBER_INVITATION` | `template_9796g8g` | Your Bin Blast team account is ready |
| Password Reset | `password-reset-emailjs.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET` | `template_l421jys` | Reset your Bin Blast Co. password |
| Generic Message | `generic-message.html` | `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_GENERIC_MESSAGE` | `template_ent7lyj` | `{{email_subject}}` (dynamic) |

---

## 1. Customer Welcome

**Triggered by:** `notifyCustomerWelcome()` — new customer registration

**Variables:**
```
to_email
email_subject
logoUrl
firstName
lastName
planName
addressLine1
addressLine2
city
state
zipCode
preferredServiceDate
preferredTimeWindow
preferredDayOfWeek
confirmationTitle
confirmationMessage
confirmationDetails
buttonText
buttonColor
dashboardLink
```

**Note:** `confirmationMessage` and `confirmationDetails` may contain HTML. Use triple braces `{{{confirmationMessage}}}` in EmailJS if available.

---

## 2. Cleaning Scheduled

**Triggered by:** `notifyCleaningScheduled()` — customer confirms cleaning date

**Variables:**
```
to_email
email_subject
logoUrl
firstName
lastName
scheduledDate
scheduledTime
addressLine1
addressLine2
city
state
zipCode
preferredDayOfWeek
planName
binsCount
curbPlacementReminder
dashboardLink
```

---

## 3. Payment Failed

**Triggered by:** `notifyPaymentFailed()` — Stripe `invoice.payment_failed` webhook

**Variables:**
```
to_email
email_subject
logoUrl
firstName
planName
amountDue
dashboardLink
```

---

## 4. Cleaning Complete

**Triggered by:** `notifyCleaningComplete()` / `notifyCleaningCompleteForJob()` — job marked complete

**Variables:**
```
to_email
email_subject
logoUrl
firstName
completedDate
nextCleaningDate
dashboardLink
```

---

## 5. Partner Application (admin alert)

**Triggered by:** `notifyAdminNewApplication()` — partner applies on website

**Variables:**
```
to_email
email_subject
logoUrl
applicationId
businessName
ownerName
email
phone
websiteOrInstagram
serviceAreas
businessType
hasInsurance
promotionMethod
heardAboutUs
userId
submittedAt
```

---

## 6. Partner Approval

**Triggered by:** `notifyPartnerApproval()` — admin approves partner application

**Variables:**
```
to_email
email_subject
logoUrl
email
ownerName
businessName
referralCode
serviceAreas
revenueSharePartner
revenueSharePlatform
signupLink
partnerId
```

---

## 7. Partner Rejection

**Triggered by:** `notifyPartnerRejection()` — admin rejects partner application

**Variables:**
```
to_email
email_subject
logoUrl
ownerName
businessName
rejectionReason
```

---

## 8. Team Member Invitation

**Triggered by:** `notifyTeamMemberInvitation()` / `notifyBinBlastStaffInvitation()` — admin creates staff account

**Variables:**
```
to_email
email_subject
logoUrl
firstName
lastName
email
tempPassword
partnerBusinessName
serviceAreas
payRate
loginLink
```

---

## 9. Password Reset

**Triggered by:** `/api/auth/password-reset` — forgot password flow

**Variables:**
```
to_email
email_subject
logoUrl
firstName
resetLink
email
```

---

## 10. Generic Message

**Triggered by:** `/api/email/send` — ad-hoc admin/operator emails

**Variables:**
```
to_email
email_subject
logoUrl
firstName
lastName
confirmationTitle
confirmationMessage
buttonText
buttonColor
dashboardLink
```

Use triple braces for `{{{confirmationMessage}}}` when sending HTML content.

---

## Vercel environment variables (full list)

```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_ADMIN_EMAIL=binblastcompany@gmail.com
NEXT_PUBLIC_EMAIL_LOGO_URL=https://www.binblastco.com/bin-blast-email-logo.png
NEXT_PUBLIC_BASE_URL=https://www.binblastco.com

NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CUSTOMER_WELCOME=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_SCHEDULED=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PAYMENT_FAILED=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_COMPLETE=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL=template_lm4wzqr
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_REJECTION=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TEAM_MEMBER_INVITATION=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_GENERIC_MESSAGE=template_ent7lyj
```

---

## Quick setup checklist

1. Create **10 separate templates** in EmailJS (one per row in the table above)
2. Paste HTML from the matching `email-templates/*.html` file into each
3. Set **To** = `{{to_email}}` and **Subject** = `{{email_subject}}` on every template
4. Add all variables listed for that template in EmailJS template settings
5. Copy each Template ID into the matching Vercel env var
6. Send a test email from EmailJS for each template before going live
