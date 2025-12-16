# Password Reset Email Template Setup

## Overview
This guide explains how to set up a custom password reset email template in Firebase Console. Firebase Authentication sends password reset emails automatically, and you can customize the email template to match your brand.

## Option 1: Customize Email Template in Firebase Console (Recommended)

Firebase Authentication has built-in email templates that you can customize. This is the easiest and most reliable method.

### Steps:

1. **Go to Firebase Console**
   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Select your project

2. **Access Authentication Settings**
   - Click on **Authentication** in the left sidebar
   - Go to the **Templates** tab
   - Find **Password reset** template

3. **Customize the Template**
   - Click **Edit** on the Password reset template
   - You can customize:
     - **Subject line**: e.g., "Reset Your Bin Blast Co. Password"
     - **Email body**: Use HTML or plain text
     - **Action link**: This is automatically set to your reset password page

4. **Use the HTML Template**
   - Copy the HTML from `password-reset-firebase.html` in this directory (already uses `%LINK%` format)
   - Paste it into the email body field in Firebase Console
   - The template is already formatted for Firebase with `%LINK%` placeholder
   - Customize colors, text, or styling as needed

5. **Configure Action URL**
   - In Firebase Console → Authentication → Settings → **Action URL**
   - Set the redirect URL to: `https://yourdomain.com/reset-password`
   - Or use: `%LINK%` to use Firebase's default handling

### Firebase Template Variables:

- `%LINK%` - The password reset link (automatically generated)
- `%EMAIL%` - User's email address
- `%DISPLAY_NAME%` - User's display name (if set)

### Example Firebase Template:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Reset Your Password</h1>
        <p>Hello,</p>
        <p>Click the button below to reset your password:</p>
        <a href="%LINK%" class="button">Reset Password</a>
        <p>Or copy this link: %LINK%</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </div>
</body>
</html>
```

## Option 2: Use Custom Email Service (Advanced)

If you want more control over the email sending process, you can use a custom email service like EmailJS or SendGrid. However, Firebase's built-in email system is recommended for password resets as it handles security automatically.

### Using EmailJS:

1. Set up EmailJS (see `EMAILJS_SETUP.md`)
2. Create a new template in EmailJS
3. Use the HTML from `password-reset.html`
4. Replace `{{link}}` with EmailJS variable syntax
5. Call EmailJS API when password reset is requested

**Note:** This approach requires additional API calls and doesn't integrate with Firebase's password reset flow automatically.

## Testing

1. **Test Password Reset Flow:**
   - Go to `/forgot-password` page
   - Enter your email address
   - Click "Send Reset Link"
   - Check your email inbox
   - Click the reset link
   - Verify it redirects to `/reset-password` page

2. **Verify Email Appearance:**
   - Check that the email matches your brand
   - Verify the reset link works correctly
   - Test on different email clients (Gmail, Outlook, etc.)

## Troubleshooting

### Email not received?
- Check spam/junk folder
- Verify email address is correct
- Check Firebase Console → Authentication → Users to see if email was sent
- Review Firebase Console logs for errors

### Reset link not working?
- Ensure domain is authorized in Firebase Console → Authentication → Settings → Authorized domains
- Check that `/reset-password` page exists and handles the `oobCode` parameter
- Verify the link hasn't expired (1 hour limit)

### Template not updating?
- Changes may take a few minutes to propagate
- Clear browser cache and try again
- Verify you're editing the correct template in Firebase Console

## Security Notes

- Password reset links expire after 1 hour (Firebase default)
- Links can only be used once
- Firebase automatically handles security and validation
- Never share reset links publicly

## Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
