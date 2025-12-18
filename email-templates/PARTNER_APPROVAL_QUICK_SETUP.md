# Partner Approval Email - Quick Setup Checklist

## ✅ Pre-Flight Checklist

- [ ] EmailJS account created and logged in
- [ ] Email service connected (Gmail, Outlook, etc.)
- [ ] EmailJS Public Key obtained
- [ ] Server-side API enabled in EmailJS Dashboard

## 📧 EmailJS Template Setup (5 minutes)

### Step 1: Create Template
- [ ] Go to EmailJS Dashboard → Email Templates
- [ ] Click "Create New Template"
- [ ] Name: "Partner Approval Email"

### Step 2: Copy HTML
- [ ] Open `email-templates/partner-approval.html`
- [ ] Copy ALL HTML content
- [ ] Paste into EmailJS template editor (Code/HTML view)

### Step 3: Configure Settings
- [ ] **Subject**: `Partnership Application Approved - {{businessName}}`
- [ ] **To Email**: `{{to_email}}`
- [ ] Save template

### Step 4: Get Template ID
- [ ] Copy Template ID (e.g., `template_abc123xyz`)
- [ ] Save it somewhere safe

## 🔧 Vercel Configuration (2 minutes)

### Environment Variables
Add these to Vercel → Settings → Environment Variables:

- [ ] `NEXT_PUBLIC_EMAILJS_SERVICE_ID` = `service_rok6u9h`
- [ ] `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` = `your_public_key`
- [ ] `NEXT_PUBLIC_ADMIN_EMAIL` = `binblastcompany@gmail.com`
- [ ] `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL` = `your_template_id`

### Important Settings
- [ ] Enable "Allow server-side API calls" in EmailJS Dashboard
- [ ] Set `NEXT_PUBLIC_BASE_URL` if using custom domain

## 🧪 Testing (5 minutes)

### Test Email Template
- [ ] Click "Test" in EmailJS template editor
- [ ] Fill test values:
  ```
  to_email: your-email@example.com
  ownerName: Test Owner
  businessName: Test Business
  referralCode: TEST123
  serviceAreas: Test Area
  revenueSharePartner: 60
  revenueSharePlatform: 40
  signupLink: https://binblast.vercel.app/partner?partnerId=test123
  ```
- [ ] Send test email
- [ ] Verify email received and looks correct

### Test Full Flow
- [ ] Submit a test partner application
- [ ] Approve application in admin dashboard
- [ ] Check partner email inbox
- [ ] Click signup link and verify it works

## 📋 Template Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `{{to_email}}` | ✅ | Partner's email address |
| `{{ownerName}}` | ✅ | Partner owner name |
| `{{businessName}}` | ✅ | Business name |
| `{{referralCode}}` | ✅ | Partner referral code |
| `{{serviceAreas}}` | ✅ | Service areas (comma-separated) |
| `{{revenueSharePartner}}` | ✅ | Partner % (e.g., "60") |
| `{{revenueSharePlatform}}` | ✅ | Platform % (e.g., "40") |
| `{{signupLink}}` | ✅ | Full signup URL |

## 🚨 Common Issues

### Email Not Sending?
1. Check Vercel logs for errors
2. Verify Template ID is correct
3. Ensure server-side API is enabled
4. Check all environment variables are set

### Template Variables Empty?
1. Verify variable names match exactly
2. Check API route is sending all variables
3. Ensure EmailJS uses `{{variable}}` syntax

### Signup Link Broken?
1. Verify `NEXT_PUBLIC_BASE_URL` is set
2. Check partner ID exists in Firestore
3. Test link manually in browser

## 📞 Support

- **EmailJS Docs**: https://www.emailjs.com/docs/
- **Template File**: `email-templates/partner-approval.html`
- **API Route**: `app/api/admin/partners/applications/[id]/approve/route.ts`
- **Email Utility**: `lib/email-utils.ts`

---

**Total Setup Time**: ~15 minutes
**Difficulty**: Easy
**Status**: Ready to use once template is created in EmailJS
