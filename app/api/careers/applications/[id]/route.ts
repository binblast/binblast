import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";
import {
  getCareerApplicationById,
  updateApplicantContact,
  withdrawCareerApplication,
} from "@/lib/careers-server";

export const dynamic = "force-dynamic";

async function verifyApplicant(req: NextRequest, applicationId: string) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const admin = await getAdminApp();
  const decoded = await admin.auth().verifyIdToken(token);
  const application = await getCareerApplicationById(applicationId);
  if (!application || application.applicantId !== decoded.uid) return null;
  return { decoded, application };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const verified = await verifyApplicant(req, params.id);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, application: verified.application });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const verified = await verifyApplicant(req, params.id);
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.action === "withdraw") {
      const application = await withdrawCareerApplication({
        applicationId: params.id,
        applicantId: verified.decoded.uid,
      });
      return NextResponse.json({ success: true, application });
    }

    if (body.action === "update_contact") {
      const application = await updateApplicantContact({
        applicationId: params.id,
        applicantId: verified.decoded.uid,
        phone: body.phone,
        email: body.email,
      });
      return NextResponse.json({ success: true, application });
    }

    if (body.action === "update_documents") {
      const admin = await import("@/lib/firebase-admin");
      const db = await admin.getAdminFirestore();
      await db.collection("careerApplications").doc(params.id).set(
        {
          documents: body.documents,
          updatedAt: (await import("firebase-admin")).firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      const application = await getCareerApplicationById(params.id);
      return NextResponse.json({ success: true, application });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Careers Application PATCH]", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }
}
