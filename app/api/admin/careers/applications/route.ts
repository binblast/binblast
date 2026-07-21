import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import {
  careerApplicationsToCsv,
  listCareerApplications,
  updateCareerApplicationStatus,
} from "@/lib/careers-server";
import { sendMoreInformationRequestEmail } from "@/lib/careers-email";
import type { CareerApplicationStatus } from "@/lib/careers-types";
import { getCareerApplicationById } from "@/lib/careers-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status") as CareerApplicationStatus | null;
    const search = req.nextUrl.searchParams.get("search") || undefined;
    const format = req.nextUrl.searchParams.get("format");

    const applications = await listCareerApplications({
      status: status || undefined,
      search,
    });

    if (format === "csv") {
      const csv = careerApplicationsToCsv(applications);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="career-applications.csv"',
        },
      });
    }

    return NextResponse.json({ success: true, applications, count: applications.length });
  } catch (error: unknown) {
    console.error("[Admin Careers GET]", error);
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const applicationId = String(body.applicationId || "");
    const status = body.status as CareerApplicationStatus;
    const adminNote = body.adminNote ? String(body.adminNote) : undefined;
    const assignedRecruiterId = body.assignedRecruiterId ?? undefined;
    const assignedRecruiterName = body.assignedRecruiterName ?? undefined;
    const interviewScheduledAt = body.interviewScheduledAt ?? undefined;
    const requestInfoMessage = body.requestInfoMessage ? String(body.requestInfoMessage) : undefined;

    if (!applicationId || !status) {
      return NextResponse.json({ error: "applicationId and status are required." }, { status: 400 });
    }

    const application = await updateCareerApplicationStatus({
      applicationId,
      status,
      actorId: userId || "admin",
      actorName: "Recruiting Team",
      adminNote,
      assignedRecruiterId,
      assignedRecruiterName,
      interviewScheduledAt,
    });

    if (requestInfoMessage && application) {
      await sendMoreInformationRequestEmail(application, requestInfoMessage);
    }

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    console.error("[Admin Careers PUT]", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const applicationId = String(body.applicationId || "");
    const application = await getCareerApplicationById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const updated = await updateCareerApplicationStatus({
      applicationId,
      status: "hired",
      actorId: userId || "admin",
      actorName: "Recruiting Team",
      adminNote: body.adminNote || "Applicant hired via admin dashboard",
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    console.error("[Admin Careers POST hire]", error);
    return NextResponse.json({ error: "Failed to hire applicant." }, { status: 500 });
  }
}
