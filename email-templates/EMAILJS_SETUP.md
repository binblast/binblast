# EmailJS Setup Guide for Partnership Applications

## Overview
This guide will help you set up EmailJS to send email notifications when users submit partnership applications.

## Step 1: EmailJS Account Setup

1. Go to [EmailJS.com](https://www.emailjs.com/) and create an account (or log in)
2. Navigate to **Email Services** and add your email service (Gmail, Outlook, etc.)
3. Note your **Service ID**: `service_rok6u9h` (already provided)

## Step 2: Create Email Template in EmailJS

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Give it a name: "Partnership Application Notification"
4. Copy the HTML from `partnership-application.html` and paste it into the template editor
5. **Important**: Replace the Handlebars syntax `{{variableName}}` with EmailJS syntax `{{variableName}}` (they're the same, but make sure they match exactly)
6. Set the **Subject** to: `New Partnership Application: {{businessName}}`
7. Set the **To Email** to: `{{to_email}}` (this will use the ADMIN_EMAIL env var)
8. Save the template and **copy the Template ID** (you'll need this for Vercel)

## Step 3: Get Your EmailJS Public Key

1. Go to **Account** → **General** in EmailJS dashboard
2. Find your **Public Key** (also called User ID)
3. Copy this value (you'll need it for Vercel)

## Step 4: Set Environment Variables in Vercel

Go to your Vercel project dashboard → **Settings** → **Environment Variables** and add:

### Required Variables:

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
ADMIN_EMAIL=your-admin-email@example.com
```

**OR** (if you prefer using NEXT_PUBLIC prefix for admin email):

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@example.com
```

**Note:** The template ID (`template_aabpctf`) is hardcoded in the code, so you don't need to set `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` unless you want to override it.

### Variable Descriptions:

- **NEXT_PUBLIC_EMAILJS_SERVICE_ID**: Your EmailJS service ID (`service_rok6u9h`) - defaults to `service_rok6u9h` if not set
- **NEXT_PUBLIC_EMAILJS_TEMPLATE_ID**: (Optional) Template ID - defaults to `template_aabpctf` if not set
- **NEXT_PUBLIC_EMAILJS_PUBLIC_KEY**: Your EmailJS public key/user ID from Step 3 (**Required**)
- **ADMIN_EMAIL** or **NEXT_PUBLIC_ADMIN_EMAIL**: The email address where you want to receive partnership application notifications (**Required**)

## Step 5: Template Variables Reference

The email template uses these variables (automatically populated from the form):

| Variable | Description | Example |
|----------|-------------|---------|
| `{{businessName}}` | Business name | "ABC Cleaning Services" |
| `{{ownerName}}` | Owner's name | "John Doe" |
| `{{email}}` | Contact email | "john@example.com" |
| `{{phone}}` | Contact phone | "(555) 123-4567" |
| `{{websiteOrInstagram}}` | Website or Instagram URL | "https://instagram.com/abc" |
| `{{serviceAreas}}` | Service areas (comma-separated) | "Downtown, Uptown, Midtown" |
| `{{businessType}}` | Type of business | "Residential Cleaning" |
| `{{hasInsurance}}` | Insurance status | "Yes" or "No" |
| `{{promotionMethod}}` | How they plan to promote | "Social Media" |
| `{{heardAboutUs}}` | How they heard about you | "Google Search" |
| `{{applicationId}}` | Unique application ID | "abc123xyz" |
| `{{userId}}` | User ID (if logged in) | "user123" or "Not logged in" |
| `{{submittedAt}}` | Submission timestamp | "Monday, January 1, 2024 at 2:30 PM" |
| `{{to_email}}` | Recipient email (from ADMIN_EMAIL) | "admin@example.com" |

## Step 6: Testing

1. After setting up all environment variables, redeploy your Vercel app
2. Submit a test partnership application through your form
3. Check your email inbox for the notification
4. Check Vercel logs if email doesn't arrive (look for EmailJS errors)

## Troubleshooting

### Email not sending?
- Check Vercel logs for EmailJS API errors
- Verify all environment variables are set correctly
- Ensure your EmailJS service is active and connected
- Check that the template ID matches exactly

### Template variables not showing?
- Make sure variable names match exactly (case-sensitive)
- Verify the template syntax uses `{{variableName}}` format
- Check that the API route is sending all required variables

### Permission errors?
- Ensure your EmailJS account has proper permissions
- Check that your email service (Gmail, etc.) is properly connected
- Verify API rate limits haven't been exceeded

## Code Integration

The EmailJS integration is already implemented in:
- `app/api/partners/apply/route.ts` (lines 92-140)

The code will:
- Automatically send an email when a partnership application is submitted
- Include all form data in the email
- Handle errors gracefully (won't fail the application if email fails)
- Log email status for debugging

## Support

For EmailJS-specific issues, visit: https://www.emailjs.com/docs/
