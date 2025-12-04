# Waste Management API Integration Guide

## Overview

The Waste Management API (https://api.wm.com/) is **not suitable for public zip code lookups**. It's designed for Waste Management customers to access their own account information.

## API Limitations

### What WM API Provides:
- ✅ Customer account balance
- ✅ Invoice history
- ✅ Service details (for WM customers)
- ✅ Next pickup dates (for WM customers with accounts)
- ❌ **NOT** public schedule lookup by zip code
- ❌ **NOT** available without customer account credentials

### Requirements:
- JWT authentication token
- ClientId (provided by WM)
- Customer account credentials
- API access approval from WM

## Current Implementation

Your system uses a **custom database approach** which is the recommended solution:

1. **Database Lookup** (`TrashScheduleLookup` table in Prisma)
   - Stores trash schedules by zip code/city/state
   - Fast and reliable
   - You control the data
   - No API dependencies

2. **Manual Entry Fallback**
   - If lookup fails, users can manually select their trash day
   - Ensures users can always schedule cleanings

## When WM API Could Be Useful

The WM API would only be beneficial if:

1. **You become a WM partner/reseller** and get API access
2. **Your customers are WM customers** and want to link their accounts
3. **You want to display WM customer data** in your dashboard

## How to Integrate WM API (If You Get Access)

### Step 1: Get API Credentials
Contact Waste Management to request API access:
- Email: api-support@wm.com (or check their developer portal)
- Request: ClientId and JWT secret
- Explain your use case

### Step 2: Add Environment Variables
```env
WM_API_CLIENT_ID=your_client_id
WM_API_JWT_SECRET=your_jwt_secret
WM_API_BASE_URL=https://api.wm.com/v1  # or apitest.wm.com/v1 for testing
```

### Step 3: Create WM API Service
```typescript
// lib/wm-api.ts
export async function getWMCustomerNextPickup(customerId: string) {
  // Implementation using WM API
  // Endpoint: GET /customers/{customerId}/services/next-pickup
}
```

### Step 4: Update Lookup Route
Add WM API as a fallback option in `/api/trash-schedule/lookup/route.ts`

## Recommendation

**Stick with your current database approach** because:

1. ✅ Works for all customers (not just WM customers)
2. ✅ No API dependencies or rate limits
3. ✅ Full control over data
4. ✅ Faster response times
5. ✅ Works offline/without external services

**Consider WM API only if:**
- You become a WM partner
- You want to integrate WM customer accounts
- You need real-time WM account data

## Alternative: Public Data Sources

For public schedule data, consider:

1. **City/County Open Data Portals**
   - Many cities provide CSV/JSON downloads
   - Import into your `TrashScheduleLookup` table
   - Example: https://catalog.data.gov/dataset/trash-pickup-schedule

2. **Manual Data Collection**
   - Start with your service areas (Peachtree City, Fayetteville)
   - Expand as you grow
   - Most reliable for your business model

3. **User-Reported Data**
   - Allow users to report their trash day
   - Verify and add to database
   - Build your own comprehensive database over time

## Current System Status

✅ **Working Now:**
- Database lookup by zip code/city/state
- Manual trash day selection
- Smart date calculation
- Scheduled cleanings storage

✅ **Ready to Expand:**
- Add more zip codes to database
- Create admin panel for managing schedules
- Import CSV data from city portals

