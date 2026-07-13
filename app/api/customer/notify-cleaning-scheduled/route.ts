import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmationSms } from "@/lib/customer-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, scheduledDate, scheduledTime, addressLine1, city, state } = body;

    if (!userId || !scheduledDate || !scheduledTime || !addressLine1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Firebase is not configured" }, { status: 500 });
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const result = await sendBookingConfirmationSms({
      phone: userData.phone,
      firstName: userData.firstName,
      scheduledDate,
      scheduledTime,
      addressLine1,
      city: city || "",
      state: state || "",
    });

    return NextResponse.json({ success: true, sms: result });
  } catch (error: any) {
    console.error("[Notify Cleaning Scheduled] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
