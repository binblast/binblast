import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";
import {
  createCareerApplication,
  findActiveApplicationByEmail,
  getCareerApplicationForApplicant,
} from "@/lib/careers-server";
import type { CareerApplicationFormData } from "@/lib/careers-types";
import { validateWizardStep } from "@/lib/careers-application";

export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string, max = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(key) || []).filter((time) => now - time < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  rateLimitMap.set(key, hits);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const form = body.form as CareerApplicationFormData;
    const password = String(body.password || form?.personal?.password || "");

    if (!form) {
      return NextResponse.json({ error: "Application data is required." }, { status: 400 });
    }

    const validationError = validateWizardStep(6, form);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const email = form.personal.email.trim().toLowerCase();
    if (isRateLimited(`career-submit:${email}`)) {
      return NextResponse.json(
        { error: "Too many submission attempts. Please try again later." },
        { status: 429 }
      );
    }

    const existing = await findActiveApplicationByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An active application already exists for this email." },
        { status: 409 }
      );
    }

    const admin = await getAdminApp();
    const adminAuth = admin.auth();
    let applicantId: string;

    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: `${form.personal.firstName} ${form.personal.lastName}`.trim(),
      });
      applicantId = userRecord.uid;
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Failed to create account.";
      if (message.includes("email-already-exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in to your applicant dashboard." },
          { status: 409 }
        );
      }
      throw authError;
    }

    const application = await createCareerApplication({ form, applicantId });

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      applicantId,
    });
  } catch (error: unknown) {
    console.error("[Careers Applications POST]", error);
    const message = error instanceof Error ? error.message : "Failed to submit application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await getAdminApp();
    const decoded = await admin.auth().verifyIdToken(token);
    const application = await getCareerApplicationForApplicant(decoded.uid);

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    console.error("[Careers Applications GET]", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
