import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import {
  createEmployeeAccountFromBinBlasterApplication,
  listBinBlasterApplications,
  updateBinBlasterApplication,
} from "@/lib/bin-blaster-server";
import type { BinBlasterApplicationStatus } from "@/lib/bin-blaster-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status") as BinBlasterApplicationStatus | null;
    const search = req.nextUrl.searchParams.get("search") || undefined;

    const applications = await listBinBlasterApplications({
      status: status || undefined,
      search,
    });

    return NextResponse.json({ success: true, applications, count: applications.length });
  } catch (error: unknown) {
    console.error("[Admin Bin Blaster GET]", error);
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
    const status = body.status as BinBlasterApplicationStatus | undefined;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required." }, { status: 400 });
    }

    const application = await updateBinBlasterApplication({
      applicationId,
      status,
      adminNote: body.adminNote ? String(body.adminNote) : undefined,
      actorId: userId || "admin",
      actorName: body.actorName ? String(body.actorName) : "Admin",
      assignedServiceAreas: Array.isArray(body.assignedServiceAreas)
        ? body.assignedServiceAreas.map(String)
        : undefined,
      compensation: body.compensation || undefined,
      allowResubmission: body.allowResubmission,
      sendStatusEmail: Boolean(body.sendStatusEmail),
      sendInterviewEmail: Boolean(body.sendInterviewEmail),
      interviewMessage: body.interviewMessage ? String(body.interviewMessage) : undefined,
    });

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    console.error("[Admin Bin Blaster PUT]", error);
    const message = error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const action = String(body.action || "create_employee_account");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required." }, { status: 400 });
    }

    if (action === "create_employee_account") {
      const result = await createEmployeeAccountFromBinBlasterApplication({
        applicationId,
        actorId: userId || "admin",
        assignedServiceAreas: Array.isArray(body.assignedServiceAreas)
          ? body.assignedServiceAreas.map(String)
          : undefined,
        compensation: body.compensation || undefined,
      });

      return NextResponse.json({
        success: true,
        application: result.application,
        employeeId: result.employeeId,
        message: "Employee account created and invitation sent.",
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Admin Bin Blaster POST]", error);
    const message = error instanceof Error ? error.message : "Failed to process request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
