// app/api/admin/messages/conversations/route.ts
// Get all team contacts and conversations for admin/operator/owner

import { NextRequest, NextResponse } from "next/server";
import { getStaffContacts } from "@/lib/team-messaging";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const viewerUserId = req.nextUrl.searchParams.get("viewerUserId") || undefined;
    const conversations = await getStaffContacts({ includePartners: true, viewerUserId });

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("[Get Conversations] Error:", error);

    let errorMessage = error.message || "Failed to fetch conversations";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
