// app/api/admin/partners/[id]/messages/route.ts
// Get and send messages to/from a partner

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;

    // Use Admin SDK for server-side operations
    const admin = await import("firebase-admin");
    let app;
    try {
      app = admin.app();
    } catch {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      };

      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error("Firebase Admin credentials not configured");
      }

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
      });
    }

    const db = app.firestore();

    const messagesSnapshot = await db
      .collection("partnerMessages")
      .where("partnerId", "==", partnerId)
      .orderBy("createdAt", "desc")
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error("[Get Messages] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
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
    let app;
    try {
      app = admin.app();
    } catch {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      };

      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error("Firebase Admin credentials not configured");
      }

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
      });
    }

    const db = app.firestore();

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
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
