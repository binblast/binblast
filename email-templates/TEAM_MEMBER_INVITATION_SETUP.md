# Team Member Invitation Email Setup Guide

This guide will help you set up the EmailJS template for team member invitations when partners add new team members.

## Template ID
**Hardcoded Template ID:** `template_9796g8g`

## Email Template Variables

The following variables are used in the email template and must be configured in your EmailJS template:

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `to_email` | Team member's email address | `john.doe@example.com` |
| `firstName` | Team member's first name | `John` |
| `lastName` | Team member's last name | `Doe` |
| `email` | Team member's email (displayed in email) | `john.doe@example.com` |
| `tempPassword` | Temporary password for login | `TempXy9z!` |
| `partnerBusinessName` | Partner's business name | `ABC Cleaning Services` |
| `serviceAreas` | Comma-separated service areas | `Peachtree City, Fayetteville` |
| `payRate` | Pay rate per trash can | `10.00` |
| `loginLink` | Link to login page | `https://binblast.vercel.app/login` |

## Setting Up EmailJS Template

### Step 1: Create New Template in EmailJS

1. Log in to your [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to **Email Templates** → **Add New Template**
3. Name the template: **"Team Member Invitation"**
4. Set the Template ID to: `template_9796g8g` (or update the code if you use a different ID)

### Step 2: Configure Template Content

Copy the HTML content from `email-templates/team-member-invitation.html` and paste it into your EmailJS template editor.

**Important:** EmailJS uses Handlebars syntax (`{{variableName}}`), but some email clients may not support all Handlebars features. The template uses:
- `{{variableName}}` for simple variables
- `{{#if variableName}}...{{/if}}` for conditional blocks (for optional fields)

### Step 3: Map Template Variables

In the EmailJS template editor, ensure all variables are properly mapped:

1. **Required Variables:**
   - `{{firstName}}`
   - `{{lastName}}`
   - `{{email}}`
   - `{{tempPassword}}`
   - `{{partnerBusinessName}}`
   - `{{loginLink}}`

2. **Optional Variables (with conditional blocks):**
   - `{{serviceAreas}}` - Only shown if provided
   - `{{payRate}}` - Only shown if provided

### Step 4: Test the Template

1. Use EmailJS's **Test** feature to send a test email
2. Use sample data:
   ```
   firstName: John
   lastName: Doe
   email: test@example.com
   tempPassword: Temp1234!
   partnerBusinessName: ABC Cleaning Services
   serviceAreas: Peachtree City, Fayetteville
   payRate: 10.00
   loginLink: https://binblast.vercel.app/login
   ```

### Step 5: Verify Email Delivery

1. Add a test team member through the partner dashboard
2. Check that the invitation email is received
3. Verify all information displays correctly
4. Test the login link

## Email Content Overview

The email includes:

1. **Header:** Bin Blast logo and welcome message
2. **Account Details Section:**
   - Email address
   - Temporary password
   - Service areas (if provided)
   - Pay rate (if provided)
3. **Login Button:** Direct link to login page
4. **Important Requirements:** Training and certification requirements
5. **Next Steps:** What the team member can access after login
6. **Security Note:** Reminder to change temporary password

## Troubleshooting

### Email Not Sending

1. **Check EmailJS Configuration:**
   - Verify `NEXT_PUBLIC_EMAILJS_SERVICE_ID` is set in environment variables
   - Verify `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` is set in environment variables
   - Ensure server-side API calls are enabled in EmailJS Dashboard → Account → General

2. **Check Template ID:**
   - Verify the template ID `template_9796g8g` matches your EmailJS template
   - Check that the template is published/active

3. **Check Server Logs:**
   - Look for `[Notify Team Member] Failed to send invitation email:` errors
   - Check EmailJS API response in server logs

### Variables Not Displaying

1. **Variable Names:** Ensure variable names match exactly (case-sensitive)
2. **Handlebars Syntax:** Verify `{{variableName}}` syntax is correct
3. **Optional Variables:** Check that conditional blocks (`{{#if}}...{{/if}}`) are properly closed

### Email Formatting Issues

1. **HTML Support:** Ensure your email client supports HTML emails
2. **Logo:** Verify the logo URL `https://binblast.vercel.app/bin-blast-logo.png` is accessible
3. **Responsive Design:** Test on mobile devices to ensure proper rendering

## Code Integration

The email is automatically sent when:
- A partner adds a new team member via `/api/partners/team-members` (POST)
- The team member account is successfully created
- The email is sent asynchronously (non-blocking) so it won't delay the API response

The email sending function is located in:
- `lib/email-utils.ts` → `notifyTeamMemberInvitation()`
- Called from: `app/api/partners/team-members/route.ts`

## Security Notes

- Temporary passwords are randomly generated: `Temp{random8chars}!`
- Passwords are stored in Firestore (encrypted at rest)
- Team members are required to change their password on first login
- The email includes a security reminder to change the temporary password

## Support

If you encounter issues:
1. Check EmailJS dashboard for delivery status
2. Review server logs for error messages
3. Test with EmailJS's built-in test feature
4. Contact support: binblastcompany@gmail.com
