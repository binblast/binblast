// app/api/operator/employees/[employeeId]/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString, isPartnerEmployee } from "@/lib/employee-utils";
import {
  getBinsFromCleaning,
} from "@/lib/operator-fleet-payroll";
import {
  getJobCompensationAmount,
  isJobEligibleForCompensation,
  loadCompensationSettings,
} from "@/lib/employee-compensation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const employeeDoc = await db.collection("users").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employee = employeeDoc.data() || {};
    const isPartnerEmp = await isPartnerEmployee(employeeId);
    if (isPartnerEmp) {
      return NextResponse.json(
        {
          error:
            "This employee belongs to a partner. Use /api/partners/team-members/[employeeId]/earnings instead.",
          isPartnerEmployee: true,
          partnerId: employee.partnerId,
        },
        { status: 403 }
      );
    }

    const settings = await loadCompensationSettings();
    const today = getTodayDateString();

    const completedSnapshot = await db
      .collection("scheduledCleanings")
      .where("assignedEmployeeId", "==", employeeId)
      .where("scheduledDate", "==", today)
      .where("jobStatus", "==", "completed")
      .get();

    const eligibleJobs = completedSnapshot.docs.filter((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as Record<string, unknown>;
      return isJobEligibleForCompensation(data, settings);
    });

    const completedStops = eligibleJobs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as Record<string, unknown>;
      const earnings = getJobCompensationAmount(data, settings);
      const bins = getBinsFromCleaning(data);

      return {
        id: doc.id,
        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        customerName: data.customerName || data.userEmail || "N/A",
        completedAt: data.completedAt || data.operatorResolvedAt || null,
        bins,
        earnings,
        hasRequiredPhotos:
          data.hasRequiredPhotos === true || data.operatorSkipPhotos === true || false,
      };
    });

    const totalEarnings = completedStops.reduce((sum: number, stop: { earnings: number }) => sum + stop.earnings, 0);
    const totalBins = completedStops.reduce((sum: number, stop: { bins: number }) => sum + stop.bins, 0);

    const stopsWithEarnings = completedStops.map((stop: {
      id: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      zipCode: string;
      customerName: string;
      completedAt: unknown;
      bins: number;
      earnings: number;
      hasRequiredPhotos: boolean;
    }) => ({
      ...stop,
      fullAddress: `${stop.addressLine1}${stop.addressLine2 ? `, ${stop.addressLine2}` : ""}, ${stop.city}, ${stop.state} ${stop.zipCode}`.trim(),
      formattedEarnings: `$${stop.earnings.toFixed(2)}`,
    }));

    return NextResponse.json({
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalBins,
      payRatePerJob: settings.residentialFirstBinPay,
      compensationSettings: {
        payModel: settings.payModel,
        residentialFirstBinPay: settings.residentialFirstBinPay,
        residentialAdditionalBinPay: settings.residentialAdditionalBinPay,
      },
      completedStopsCount: completedStops.length,
      stops: stopsWithEarnings,
      avgPerJob:
        completedStops.length > 0
          ? Math.round((totalEarnings / completedStops.length) * 100) / 100
          : 0,
      avgPerBin: totalBins > 0 ? Math.round((totalEarnings / totalBins) * 100) / 100 : 0,
    });
  } catch (error: unknown) {
    console.error("Error getting earnings:", error);
    const message = error instanceof Error ? error.message : "Failed to get earnings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
