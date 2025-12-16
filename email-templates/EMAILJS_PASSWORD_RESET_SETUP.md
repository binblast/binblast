# EmailJS Password Reset Setup Guide

## Overview
This guide explains how to set up EmailJS to send custom password reset emails for Bin Blast Co.

## Step 1: Create Email Template in EmailJS

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to **Email Templates**
3. Click **Create New Template**
4. Name it: "Password Reset - Bin Blast Co."
5. Copy the HTML from `password-reset-emailjs.html` in this directory
6. Paste it into the template editor
7. Set the **Subject** to: `Reset Your Bin Blast Co. Password`
8. Set the **To Email** to: `{{to_email}}` or `{{email}}`
9. Save the template and **copy the Template ID** (you'll need this)

## Step 2: Template Variables

The template uses these EmailJS variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{to_email}}` or `{{email}}` | User's email address | `user@example.com` |
| `{{resetLink}}` | Password reset link with token | `https://yourdomain.com/reset-password?token=abc123...` |

## Step 3: Set Environment Variables

Add the following environment variable to your Vercel project:

```
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET=your_template_id_here
```

**Important:** Replace `your_template_id_here` with the actual template ID from Step 1.

### Other Required Variables (if not already set):

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_rok6u9h
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

## Step 4: Update Code with Template ID

After setting the environment variable, you can also hardcode it in the API route if preferred:

1. Open `app/api/auth/password-reset/route.ts`
2. Find the line with `emailjsTemplateId`
3. Replace `template_xxxxxxxx` with your actual template ID:

```typescript
const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET || "your_template_id_here";
```

## Step 5: Firebase Admin SDK (Optional but Recommended)

For the best security and user experience, set up Firebase Admin SDK:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Add these environment variables to Vercel:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** The `FIREBASE_PRIVATE_KEY` should include the `\n` characters as shown.

If Admin SDK is not configured, the system will use a custom token system that requires Admin SDK for password updates. You'll need to install `firebase-admin`:

```bash
npm install firebase-admin
```

## Step 6: Testing

1. Go to `/forgot-password` page
2. Enter a valid email address
3. Click "Send Reset Link"
4. Check your email inbox (and spam folder)
5. Click the reset link in the email
6. Verify it redirects to `/reset-password` page
7. Enter a new password and confirm
8. Verify you can log in with the new password

## Troubleshooting

### Email not received?
- Check spam/junk folder
- Verify EmailJS template ID is correct
- Check Vercel logs for EmailJS API errors
- Verify `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` is set correctly
- Ensure EmailJS service is active

### Reset link not working?
- Check that the reset link format is correct (`?token=...` or `?oobCode=...`)
- Verify token hasn't expired (1 hour limit)
- Check Vercel logs for API errors
- Ensure Firebase Admin SDK is configured if using custom tokens

### "Password reset service temporarily unavailable" error?
- This means Firebase Admin SDK is not configured
- Set up Firebase Admin SDK (see Step 5) or install `firebase-admin` package
- Ensure environment variables are set correctly

### Template variables not showing?
- Verify variable names match exactly: `{{resetLink}}`, `{{to_email}}`, `{{email}}`
- Check that template_params in API route match template variables
- Ensure EmailJS template syntax uses `{{variableName}}` format

## Security Notes

- Password reset links expire after 1 hour
- Links can only be used once
- Tokens are stored securely in Firestore
- Custom tokens are marked as used after password reset
- For production, Firebase Admin SDK is strongly recommended

## Support

For EmailJS-specific issues:
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS Dashboard](https://dashboard.emailjs.com/)

For Firebase Admin SDK issues:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
