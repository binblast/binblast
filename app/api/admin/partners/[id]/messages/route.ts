// app/api/admin/partners/[id]/messages/route.ts
// Get and send messages to/from a partner

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;

    // Use Admin SDK for server-side operations
    const db = await getAdminFirestore();

    const messagesSnapshot = await db
      .collection("partnerMessages")
      .where("partnerId", "==", partnerId)
      .orderBy("createdAt", "desc")
      .get();

    const messages = messagesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error("[Get Messages] Error:", error);
    
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
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    const body = await req.json();
    const { message, type } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use Admin SDK for server-side operations
    const admin = await import("firebase-admin");
    const db = await getAdminFirestore();

    const messageData = {
      partnerId,
      message: message.trim(),
      type: type || "request",
      from: "admin", // TODO: Get actual admin user ID
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("partnerMessages").add(messageData);

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("[Send Message] Error:", error);
    
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
