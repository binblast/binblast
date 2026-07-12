// app/api/employee/messages/route.ts
// Employee inbox, contacts, and outbound team messages

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getEmployeeMessagingData } from "@/lib/team-messaging";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    const contactId = req.nextUrl.searchParams.get("contactId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const { contacts, messages } = await getEmployeeMessagingData(employeeId);

    if (contactId) {
      const contact = contacts.find((item) => item.id === contactId);
      const threadMessages = messages.filter((message) => {
        const sentByEmployee =
          message.senderId === employeeId && message.employeeId === contactId;
        const receivedByEmployee =
          message.employeeId === employeeId &&
          (message.senderId === contactId ||
            (!message.senderId && message.from !== "employee" && message.from === contact?.type));
        return sentByEmployee || receivedByEmployee;
      });

      return NextResponse.json({
        success: true,
        contacts,
        messages: threadMessages,
      });
    }

    return NextResponse.json({
      success: true,
      contacts,
      messages,
    });
  } catch (error: any) {
    console.error("[Employee Messages GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch employee messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, recipientId, message, subject } = body;

    if (!employeeId || !recipientId || !message?.trim()) {
      return NextResponse.json(
        { error: "employeeId, recipientId, and message are required" },
        { status: 400 }
      );
    }

    const admin = await import("firebase-admin");
    const db = await getAdminFirestore();

    const [employeeDoc, recipientDoc] = await Promise.all([
      db.collection("users").doc(employeeId).get(),
      db.collection("users").doc(recipientId).get(),
    ]);

    if (!employeeDoc.exists) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!recipientDoc.exists) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const employeeData = employeeDoc.data()!;
    const recipientData = recipientDoc.data()!;
    const recipientRole = recipientData.role || "operator";

    if (!["operator", "admin", "owner"].includes(recipientRole)) {
      return NextResponse.json(
        { error: "Employees can only message operators and management" },
        { status: 403 }
      );
    }

    const messageData = {
      employeeId: recipientId,
      employeeEmail: recipientData.email || "",
      employeeName: `${recipientData.firstName || ""} ${recipientData.lastName || ""}`.trim(),
      recipientRole,
      senderId: employeeId,
      senderName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
      senderEmail: employeeData.email || "",
      senderRole: employeeData.role || "employee",
      message: message.trim(),
      subject: subject?.trim() || "Message from Employee",
      type: "general",
      from: "employee",
      read: false,
      priority: "normal",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("employeeMessages").add(messageData);

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("[Employee Messages POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
