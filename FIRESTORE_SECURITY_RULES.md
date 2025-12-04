# Firestore Security Rules

## How to Apply These Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy and paste the rules from `firestore.rules` file
6. Click **Publish** to save the rules

## Security Rules Overview

These rules ensure that:

### Users Collection (`/users/{userId}`)
- ✅ Users can **read** their own user document
- ✅ Users can **create** their own user document during registration
- ✅ Users can **update** their own user document (but cannot change email)
- ❌ Users **cannot delete** their own document (admin only)

### Subscriptions Collection (`/subscriptions/{subscriptionId}`)
- ✅ Users can **read** their own subscriptions
- ✅ Users can **create** subscriptions for themselves
- ✅ Users can **update** their own subscriptions (but cannot change userId)
- ❌ Users **cannot delete** subscriptions (admin only)

### Service Addresses Collection (`/serviceAddresses/{addressId}`)
- ✅ Users can **read** their own service addresses
- ✅ Users can **create** addresses for themselves
- ✅ Users can **update** their own addresses
- ✅ Users can **delete** their own addresses

### All Other Collections
- ❌ Default deny - all other collections are blocked

## Testing Your Rules

After publishing, you can test your rules in the Firebase Console:
1. Go to **Firestore Database** → **Rules** tab
2. Click **Rules Playground** (bottom right)
3. Test different scenarios to ensure rules work correctly

## Important Notes

- These rules ensure users can only access their own data
- Email addresses cannot be changed after creation
- User IDs cannot be changed in subscriptions
- Admin operations (like deletions) should be done through Firebase Admin SDK or Cloud Functions

