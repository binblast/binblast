# Deploy Firestore Security Rules

The updated Firestore security rules need to be deployed to your Firebase project for the referral system to work properly.

## Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the entire contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **"Publish"** button

## Option 2: Firebase CLI

If you have Firebase CLI installed:

```bash
# Make sure you're logged in
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules
```

## Verify Deployment

After deploying, refresh your dashboard page. The permission errors should disappear and you should see:
- Referral history loading successfully
- Credits displaying correctly
- No "Missing or insufficient permissions" errors

## Current Rules Summary

The rules allow:
- ✅ Authenticated users can query their own referrals (`where("referrerId", "==", userId)`)
- ✅ Authenticated users can query their own credits (`where("userId", "==", userId)`)
- ✅ Server-side API routes can create/update referrals and credits
- ✅ Users can only read their own data

