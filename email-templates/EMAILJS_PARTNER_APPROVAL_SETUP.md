# EmailJS Setup Guide: Partner Approval Email

## Overview
This guide will help you set up the EmailJS template for sending partner approval emails when a partnership application is accepted.

## Step 1: Access EmailJS Dashboard

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Log in to your account

## Step 2: Create New Email Template

1. Navigate to **Email Templates** in the left sidebar
2. Click **Create New Template** button
3. Give it a name: **"Partner Approval Email"** or **"Partnership Application Accepted"**

## Step 3: Copy Template HTML

1. Open the file: `email-templates/partner-approval.html`
2. Copy **ALL** the HTML content (from `<!DOCTYPE html>` to `</html>`)
3. In EmailJS template editor, click **"Code"** tab (or switch to HTML view)
4. Paste the HTML content

## Step 4: Configure Email Settings

### Subject Line
Set the **Subject** field to:
```
Partnership Application Approved - {{businessName}}
```

### To Email
Set the **To Email** field to:
```
{{to_email}}
```

**Important**: EmailJS uses `{{variableName}}` syntax for template variables. Make sure all variables match exactly.

## Step 5: Template Variables

The template uses these variables (all must be provided by your API):

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `{{to_email}}` | Partner's email address | `partner@example.com` |
| `{{ownerName}}` | Partner owner's name | `John Smith` |
| `{{businessName}}` | Business name | `ABC Cleaning Services` |
| `{{referralCode}}` | Partner referral code | `ABCJS123` |
| `{{serviceAreas}}` | Service areas (comma-separated) | `Atlanta, Marietta, Roswell` |
| `{{revenueSharePartner}}` | Partner revenue share % | `60` |
| `{{revenueSharePlatform}}` | Platform revenue share % | `40` |
| `{{signupLink}}` | Partner signup URL | `https://binblast.vercel.app/partner?partnerId=abc123` |

## Step 6: Test Template

1. Click **"Test"** button in EmailJS template editor
2. Fill in test values for all variables:
   ```
   to_email: your-email@example.com
   ownerName: Test Owner
   businessName: Test Business
   referralCode: TEST123
   serviceAreas: Test Area 1, Test Area 2
   revenueSharePartner: 60
   revenueSharePlatform: 40
   signupLink: https://binblast.vercel.app/partner?partnerId=test123
   ```
3. Click **"Send Test Email"**
4. Check your email inbox to verify the template looks correct

## Step 7: Save Template and Get Template ID

1. Click **"Save"** button
2. After saving, you'll see the **Template ID** (e.g., `template_abc123xyz`)
3. **Copy this Template ID** - you'll need it for Vercel

## Step 8: Add Template ID to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL`
   - **Value**: Your template ID (e.g., `template_abc123xyz`)
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

## Step 9: Verify Environment Variables

Make sure these environment variables are set in Vercel:

```bash
# Required
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_ADMIN_EMAIL=binblastcompany@gmail.com

# Partner Approval Template (new)
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL=your_template_id_here
```

## Step 10: Enable Server-Side API (Important!)

EmailJS requires server-side API to be enabled for API routes to work:

1. Go to EmailJS Dashboard → **Account** → **General**
2. Scroll down to **"Allow server-side API calls"**
3. **Enable** this option
4. Save changes

**Note**: Without this enabled, emails from server-side API routes will fail with a 403 error.

## Step 11: Deploy and Test

1. **Redeploy your Vercel application** (or wait for automatic deployment)
2. Test the flow:
   - Submit a partner application
   - Approve the application in admin dashboard
   - Check partner's email inbox for approval email
   - Verify signup link works

## Troubleshooting

### Email Not Sending?
- ✅ Check Vercel logs for EmailJS errors
- ✅ Verify Template ID matches exactly in Vercel
- ✅ Ensure server-side API is enabled in EmailJS
- ✅ Verify all environment variables are set
- ✅ Check that `to_email` variable is being sent correctly

### Template Variables Not Showing?
- ✅ Ensure variable names match exactly (case-sensitive)
- ✅ Verify variables are being sent from API route
- ✅ Check EmailJS template uses `{{variableName}}` syntax (not `{{#if}}` or Handlebars)

### Signup Link Not Working?
- ✅ Verify `NEXT_PUBLIC_BASE_URL` is set in Vercel
- ✅ Check partner ID exists in Firestore
- ✅ Test signup link manually in browser

### 403 Forbidden Error?
- ✅ Enable "Allow server-side API calls" in EmailJS Dashboard
- ✅ Verify EmailJS Public Key is correct
- ✅ Check API rate limits haven't been exceeded

## Template Preview

The email template includes:
- ✅ Green success header with approval message
- ✅ Prominent "Complete Partner Signup" button
- ✅ Partner details (business name, referral code, service areas, revenue share)
- ✅ Step-by-step next steps instructions
- ✅ Important note with contact information
- ✅ Professional footer

## Support

For EmailJS-specific issues:
- EmailJS Documentation: https://www.emailjs.com/docs/
- EmailJS Support: support@emailjs.com

For application-specific issues:
- Check Vercel logs
- Review API route: `app/api/admin/partners/applications/[id]/approve/route.ts`
- Review email utility: `lib/email-utils.ts`
