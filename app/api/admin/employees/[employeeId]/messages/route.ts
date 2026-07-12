// app/api/admin/employees/[employeeId]/messages/route.ts
// Get and send messages between staff members

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  getThreadMessages,
  markThreadMessagesAsRead,
  sortMessagesChronologically,
} from "@/lib/team-messaging";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const contactId = params.employeeId;
    const viewerUserId = req.nextUrl.searchParams.get("viewerUserId");
    const db = await getAdminFirestore();

    if (viewerUserId) {
      await markThreadMessagesAsRead(viewerUserId, contactId);
      const messages = await getThreadMessages(viewerUserId, contactId);

      return NextResponse.json({
        success: true,
        messages,
      });
    }

    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      db.collection("employeeMessages").where("employeeId", "==", contactId).get(),
      db.collection("employeeMessages").where("senderId", "==", contactId).get(),
    ]);

    const messageMap = new Map<string, Record<string, unknown>>();

    receivedSnapshot.docs.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      messageMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    sentSnapshot.docs.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      messageMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const messages = sortMessagesChronologically(
      Array.from(messageMap.values()) as Array<Record<string, unknown> & { id: string }>
    );

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error("[Get Employee Messages] Error:", error);

    let errorMessage = error.message || "Failed to fetch messages";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage =
        "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator to configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const recipientId = params.employeeId;
    const body = await req.json();
    const { message, type, subject, senderId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const admin = await import("firebase-admin");
    const db = await getAdminFirestore();

    const [recipientDoc, senderDoc] = await Promise.all([
      db.collection("users").doc(recipientId).get(),
      senderId ? db.collection("users").doc(senderId).get() : Promise.resolve(null),
    ]);

    if (!recipientDoc.exists) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const recipientData = recipientDoc.data()!;
    const senderData = senderDoc?.exists ? senderDoc.data()! : null;
    const senderRole =
      (typeof senderData?.role === "string" ? senderData.role : null) ||
      (recipientData.role === "operator" ? "admin" : "admin");

    const trimmedSubject = typeof subject === "string" ? subject.trim() : "";

    const messageData = {
      employeeId: recipientId,
      employeeEmail: recipientData.email || "",
      employeeName: `${recipientData.firstName || ""} ${recipientData.lastName || ""}`.trim(),
      recipientRole: recipientData.role || "employee",
      senderId: senderId || null,
      senderName: senderData
        ? `${senderData.firstName || ""} ${senderData.lastName || ""}`.trim()
        : "Management",
      senderEmail: senderData?.email || "",
      senderRole,
      message: message.trim(),
      ...(trimmedSubject ? { subject: trimmedSubject } : {}),
      type: type || "general",
      from: senderRole === "operator" ? "operator" : senderRole === "owner" ? "owner" : "admin",
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

    let errorMessage = error.message || "Failed to send message";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage =
        "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator to configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
