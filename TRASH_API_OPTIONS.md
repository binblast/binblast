# Trash Schedule API Options

## Current Implementation

I've implemented a **custom database lookup system** using your existing Prisma database with the `TrashScheduleLookup` table. This is the most reliable approach because:

1. **No Free Comprehensive API Exists**: There is no single free API that covers all US zip codes for trash schedules
2. **Local Government Data**: Trash schedules vary by municipality and are managed locally
3. **Data Control**: You maintain control over the data and can update it as needed

## How It Works Now

1. **Database Lookup**: Users enter zip code/city/state → system queries your Prisma database
2. **Manual Entry Fallback**: If lookup fails, users can manually select their trash day
3. **Smart Date Calculation**: System calculates available dates (same day as trash day, or 24-48 hours after)
4. **Firestore Storage**: Scheduled cleanings are saved to Firestore `scheduledCleanings` collection

## Alternative API Options (If You Want to Expand)

### Option 1: City/County Government APIs (Recommended)
Many cities provide open data:
- **City of Providence**: https://catalog.data.gov/dataset/trash-pickup-schedule
- **Check your local city/county websites** for open data portals
- Most provide CSV/JSON downloads that you can import into your database

### Option 2: Third-Party Services (Limited Coverage)
- **TrashDB** (trashdb.com): Compiles data but no public API
- **My Garbage Collection** (mygarbagecollection.com): No API, but good reference
- **When Is Trash Day** (whenistrashday.com): Community-driven, limited coverage

### Option 3: Build Your Own Database
**Recommended Approach** (what you have now):
1. Manually populate `TrashScheduleLookup` table with data for your service areas
2. Start with Peachtree City and Fayetteville (your launch areas)
3. Expand as you grow to new cities
4. Update via admin panel or CSV imports

## How to Populate Your Database

### Method 1: Manual Entry via Prisma Studio
```bash
npx prisma studio
```
Then manually add entries to `TrashScheduleLookup` table.

### Method 2: CSV Import Script
Create a script to import from CSV:
```typescript
// scripts/import-trash-schedules.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Read CSV and import
```

### Method 3: Admin Panel
Create an admin page to add/update trash schedules.

## Recommended Next Steps

1. **Populate Initial Data**: Add trash schedules for Peachtree City and Fayetteville zip codes
2. **Create Admin Interface**: Build a simple admin page to manage trash schedules
3. **Expand Gradually**: Add new cities/zip codes as you expand service areas
4. **User Feedback**: Allow users to report incorrect schedules and update your database

## Current Features

✅ Zip code lookup
✅ City/state lookup fallback  
✅ Manual trash day selection
✅ Smart date calculation (same day or 24-48 hours after trash day)
✅ Time slot selection
✅ Scheduled cleanings display
✅ Past and upcoming cleanings view
✅ Firestore integration for persistence

## Firestore Collection Structure

```
scheduledCleanings/
  {cleaningId}/
    userId: string
    userEmail: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    zipCode: string
    trashDay: string
    scheduledDate: string (YYYY-MM-DD)
    scheduledTime: string (e.g., "9:00 AM - 12:00 PM")
    notes?: string
    status: "upcoming" | "completed" | "cancelled"
    createdAt: timestamp
```

