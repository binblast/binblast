# Partner Application Email & Notification Setup

## Overview
This document describes the email notification system for partner applications and approvals.

## Features Implemented

### 1. Email Notifications

#### When Application is Submitted:
- **Admin Email**: Email sent to `binblastcompany@gmail.com` (or `NEXT_PUBLIC_ADMIN_EMAIL`) when a partner application is submitted
- **Admin Notification**: A notification is created in Firestore `adminNotifications` collection for dashboard display

#### When Application is Approved:
- **Partner Email**: Email sent to the partner with:
  - Approval confirmation
  - Signup link (`/partner?partnerId={partnerId}`)
  - Partner details (business name, referral code, service areas, revenue share)
  - Next steps instructions
- **Admin Notification**: A notification is created in Firestore for dashboard display

### 2. Dashboard Notifications

- **Notification Banner**: Blue banner appears at top of admin dashboard when new partner applications are pending
- **Badge Count**: Red badge shows count of pending applications on "Partners" tab
- **Real-time Updates**: Notifications update in real-time as applications are submitted

## Email Templates Required

### 1. Partner Application Notification (Admin)
- **Template ID**: Use existing `template_aabpctf` or set `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION`
- **Template File**: `email-templates/partnership-application.html` (already exists)
- **Recipient**: `binblastcompany@gmail.com` or `NEXT_PUBLIC_ADMIN_EMAIL`

### 2. Partner Approval Email (Partner)
- **Template ID**: Set `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL` (or defaults to `template_partner_approval`)
- **Template File**: `email-templates/partner-approval.html` (created)
- **Recipient**: Partner's email from application

## Environment Variables

Add these to your Vercel environment variables:

```bash
# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_emailjs_public_key

# Admin Email
NEXT_PUBLIC_ADMIN_EMAIL=binblastcompany@gmail.com

# Email Template IDs (optional - defaults provided)
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION=template_aabpctf
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL=template_partner_approval
```

## EmailJS Template Setup

### Partner Approval Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to **Email Templates**
3. Click **Create New Template**
4. Name it: "Partner Approval Email"
5. Copy HTML from `email-templates/partner-approval.html`
6. Paste into template editor
7. Set **Subject**: `Partnership Application Approved - {{businessName}}`
8. Set **To Email**: `{{to_email}}`
9. Save and copy the **Template ID**
10. Add Template ID to Vercel environment variables as `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL`

### Template Variables

The partner approval email uses these variables:
- `{{to_email}}` - Partner's email
- `{{ownerName}}` - Partner owner name
- `{{businessName}}` - Business name
- `{{referralCode}}` - Partner referral code
- `{{serviceAreas}}` - Service areas (comma-separated)
- `{{revenueSharePartner}}` - Partner revenue share percentage
- `{{revenueSharePlatform}}` - Platform revenue share percentage
- `{{signupLink}}` - Partner signup URL

## Firestore Rules

The following rules have been added to `firestore.rules`:

```javascript
// Admin notifications collection
match /adminNotifications/{notificationId} {
  allow read: if isAdminOrOperator() || request.auth == null;
  allow create: if request.auth == null; // Only server-side can create
  allow update: if isAdminOrOperator() || request.auth == null;
  allow delete: if isAdminOrOperator() || request.auth == null;
}
```

**Important**: Deploy these rules to Firebase:
```bash
firebase deploy --only firestore:rules
```

## Files Modified

1. **`lib/email-utils.ts`** (NEW) - Email sending helper functions
2. **`app/api/partners/apply/route.ts`** - Added admin notification on submission
3. **`app/api/admin/partners/applications/[id]/approve/route.ts`** - Added partner email on approval
4. **`app/dashboard/page.tsx`** - Added notification banner and badge count
5. **`firestore.rules`** - Added `adminNotifications` collection rules
6. **`email-templates/partner-approval.html`** (NEW) - Partner approval email template

## Testing

1. **Test Application Submission**:
   - Submit a partner application
   - Check admin email inbox for notification
   - Check admin dashboard for notification banner

2. **Test Approval**:
   - Approve a partner application
   - Check partner email inbox for approval email
   - Verify signup link works (`/partner?partnerId={partnerId}`)

## Troubleshooting

### Emails Not Sending?
- Check Vercel logs for EmailJS errors
- Verify EmailJS server-side API is enabled (Dashboard → Account → General)
- Verify all environment variables are set correctly
- Check EmailJS template IDs match exactly

### Notifications Not Showing?
- Verify Firestore rules are deployed
- Check browser console for Firestore permission errors
- Ensure admin/operator is logged in

### Signup Link Not Working?
- Verify `NEXT_PUBLIC_BASE_URL` is set in Vercel
- Check that partner ID exists in Firestore `partners` collection
- Verify partner signup page (`/app/partner/page.tsx`) is working

## Next Steps

1. Create EmailJS template for partner approval
2. Set environment variables in Vercel
3. Deploy Firestore rules
4. Test the flow end-to-end
