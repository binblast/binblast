// app/api/operator/employees/[employeeId]/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { subject, message, priority } = body;

    if (!employeeId || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, subject, message" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, collection, addDoc, serverTimestamp } = firestore;

    // Get employee data
    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeSnap.data();

    // Create message document
    const messagesRef = collection(db, "employeeMessages");
    const messageData = {
      employeeId,
      employeeEmail: employeeData.email,
      subject,
      message,
      priority: priority || "normal",
      status: "sent",
      createdAt: serverTimestamp(),
    };

    await addDoc(messagesRef, messageData);

    // Send email to employee
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: employeeData.email,
          subject: `Message from Bin Blast Co. - ${subject}`,
          html: `
            <h2>${subject}</h2>
            <p>${message.replace(/\n/g, "<br>")}</p>
            <p style="margin-top: 20px; color: #6b7280; font-size: 0.875rem;">
              This is a message from your Bin Blast Co. operator.
            </p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send email, but message was saved");
      }
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

