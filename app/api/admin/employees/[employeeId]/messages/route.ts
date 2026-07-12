// app/api/admin/employees/[employeeId]/messages/route.ts
// Get and send messages to/from an employee

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    // Use Admin SDK for server-side operations
    const db = await getAdminFirestore();

    // Query without orderBy to avoid composite index requirement.
    // Load both messages to and from this team member.
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      db.collection("employeeMessages").where("employeeId", "==", employeeId).get(),
      db.collection("employeeMessages").where("senderId", "==", employeeId).get(),
    ]);

    const messageMap = new Map<string, Record<string, unknown>>();

    receivedSnapshot.docs.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      messageMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    sentSnapshot.docs.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      messageMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const messages = Array.from(messageMap.values()).sort((a, b) => {
      const aTime =
        (a.createdAt as { toMillis?: () => number })?.toMillis?.() ||
        ((a.createdAt as { _seconds?: number })?._seconds || 0) * 1000;
      const bTime =
        (b.createdAt as { toMillis?: () => number })?.toMillis?.() ||
        ((b.createdAt as { _seconds?: number })?._seconds || 0) * 1000;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error("[Get Employee Messages] Error:", error);
    
    // Provide helpful error message for missing credentials
    let errorMessage = error.message || "Failed to fetch messages";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator to configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { message, type, subject } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use Admin SDK for server-side operations
    const admin = await import("firebase-admin");
    const db = await getAdminFirestore();

    // Get employee data to include email
    const employeeDoc = await db.collection("users").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeDoc.data();

    const messageData = {
      employeeId,
      employeeEmail: employeeData.email || "",
      employeeName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
      recipientRole: employeeData.role || "employee",
      message: message.trim(),
      subject: subject || (type === "praise" ? "Great work!" : type === "warning" ? "Important Notice" : "Message from Admin"),
      type: type || "request",
      from: employeeData.role === "operator" ? "operator" : "admin",
      read: false,
      priority: type === "warning" ? "high" : "normal",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("employeeMessages").add(messageData);

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("[Send Employee Message] Error:", error);
    
    // Provide helpful error message for missing credentials
    let errorMessage = error.message || "Failed to send message";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator to configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
