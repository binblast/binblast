// app/api/trash-schedule/lookup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Trash Schedule Lookup API
 * 
 * This endpoint looks up trash pickup schedules by zip code, city, and state.
 * 
 * Primary source: Your Prisma database (TrashScheduleLookup table)
 * 
 * Note: Waste Management API (https://api.wm.com/) requires:
 * - JWT authentication
 * - ClientId from WM
 * - Customer account credentials
 * It's designed for WM customers to access their own account data,
 * not for public schedule lookups by zip code.
 * 
 * To use WM API in the future:
 * 1. Contact WM to get API access credentials
 * 2. Add environment variables: WM_API_CLIENT_ID, WM_API_JWT_SECRET
 * 3. Implement WM API integration as a fallback option
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postalCode = searchParams.get("postalCode");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    if (!postalCode && !city) {
      return NextResponse.json(
        { message: "postalCode or city is required" },
        { status: 400 }
      );
    }

    // Primary lookup: Your database
    const record = await prisma.trashScheduleLookup.findFirst({
      where: {
        postalCode: postalCode ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
      },
    });

    if (record) {
      return NextResponse.json(
        {
          defaultTrashDayOfWeek: record.defaultTrashDayOfWeek,
          notes: record.notes,
          source: "database",
        },
        { status: 200 }
      );
    }

    // Future: Could add WM API lookup here if credentials are available
    // For now, return 404 and let user enter manually
    return NextResponse.json(
      { 
        message: "No schedule found in database. Please select your trash day manually.",
        source: "none"
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Trash schedule lookup error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

