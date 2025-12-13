// app/api/operator/employees/[employeeId]/flag-issue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

const VALID_ISSUE_TYPES = [
  "performance",
  "attendance",
  "quality",
  "safety",
  "communication",
  "other",
];

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { issueType, description, severity, relatedJobId } = body;

    if (!employeeId || !issueType || !description) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, issueType, description" },
        { status: 400 }
      );
    }

    if (!VALID_ISSUE_TYPES.includes(issueType)) {
      return NextResponse.json(
        { error: `Invalid issue type. Must be one of: ${VALID_ISSUE_TYPES.join(", ")}` },
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
    const { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } = firestore;

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

    // Create issue flag document
    const issuesRef = collection(db, "employeeIssues");
    const issueData = {
      employeeId,
      employeeName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
      employeeEmail: employeeData.email,
      issueType,
      description,
      severity: severity || "medium",
      relatedJobId: relatedJobId || null,
      status: "open",
      createdAt: serverTimestamp(),
    };

    await addDoc(issuesRef, issueData);

    // Update employee document to track issue count
    const currentIssueCount = employeeData.issueCount || 0;
    await updateDoc(employeeRef, {
      issueCount: currentIssueCount + 1,
      lastIssueDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notify admin via email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: process.env.ADMIN_EMAIL || "admin@binblast.com",
          subject: `Employee Issue Flagged - ${employeeData.firstName} ${employeeData.lastName}`,
          html: `
            <h2>Employee Issue Flagged</h2>
            <p><strong>Employee:</strong> ${employeeData.firstName} ${employeeData.lastName} (${employeeData.email})</p>
            <p><strong>Issue Type:</strong> ${issueType}</p>
            <p><strong>Severity:</strong> ${severity || "medium"}</p>
            <p><strong>Description:</strong></p>
            <p>${description.replace(/\n/g, "<br>")}</p>
            ${relatedJobId ? `<p><strong>Related Job ID:</strong> ${relatedJobId}</p>` : ''}
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/operator/employees/${employeeId}" style="padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
                View Employee Details
              </a>
            </p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send admin notification email, but issue was flagged");
      }
    } catch (emailError) {
      console.error("Error sending admin notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Issue flagged successfully",
    });
  } catch (error: any) {
    console.error("Error flagging issue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to flag issue" },
      { status: 500 }
    );
  }
}

