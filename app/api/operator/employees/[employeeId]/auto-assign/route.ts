// app/api/operator/employees/[employeeId]/auto-assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  findMatchingCustomers,
  balanceWorkload,
  calculateWorkload,
  clusterCustomersByProximity,
  AssignmentResult,
} from "@/lib/zone-assignment";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { zones, counties, maxAssignments } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
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
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

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
    const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

    // Use provided zones/counties or get from employee document
    const employeeZones = zones || employeeData.zones || [];
    const employeeCounties = counties || employeeData.counties || [];

    if (employeeZones.length === 0 && employeeCounties.length === 0) {
      return NextResponse.json(
        { error: "Employee has no zones or counties assigned" },
        { status: 400 }
      );
    }

    // Check current workload
    const currentWorkload = await calculateWorkload(employeeId);
    if (!currentWorkload) {
      return NextResponse.json(
        { error: "Failed to calculate workload" },
        { status: 500 }
      );
    }

    // Balance workload to determine how many to assign
    const workloadBalance = await balanceWorkload(
      employeeId,
      employeeZones,
      employeeCounties
    );

    // Find matching unassigned customers
    const matchingCustomers = await findMatchingCustomers(
      employeeZones,
      employeeCounties
    );

    // Cluster customers by proximity
    const clusters = clusterCustomersByProximity(matchingCustomers, 5); // 5 mile threshold

    // Determine how many customers to assign
    const targetAssignments = maxAssignments
      ? Math.min(maxAssignments, workloadBalance.canAssign)
      : workloadBalance.canAssign;

    const result: AssignmentResult = {
      assigned: 0,
      skipped: 0,
      reassigned: 0,
      errors: [],
      details: [],
    };

    // Assign customers by cluster (ensuring nearby customers are assigned together)
    let assignedCount = 0;
    const assignedCustomerIds = new Set<string>();

    for (const cluster of clusters) {
      // Check if we can assign this entire cluster
      if (assignedCount + cluster.length > targetAssignments) {
        // Can't fit entire cluster, skip it
        cluster.forEach((customer) => {
          result.skipped++;
          result.details.push({
            customerId: customer.id,
            action: "skipped",
            reason: "Workload balance limit reached - cluster too large",
          });
        });
        continue;
      }

      // Assign entire cluster
      for (const customer of cluster) {
        try {
          const customerRef = doc(db, "scheduledCleanings", customer.id);
          await updateDoc(customerRef, {
            assignedEmployeeId: employeeId,
            assignedEmployeeName: employeeName,
            assignmentSource: "auto",
            assignedAt: serverTimestamp(),
            jobStatus: "pending",
            updatedAt: serverTimestamp(),
          });

          result.assigned++;
          assignedCount++;
          assignedCustomerIds.add(customer.id);
          result.details.push({
            customerId: customer.id,
            action: "assigned",
          });
        } catch (error: any) {
          result.errors.push(`Failed to assign customer ${customer.id}: ${error.message}`);
          result.details.push({
            customerId: customer.id,
            action: "error",
            reason: error.message,
          });
        }
      }

      // Stop if we've reached the target
      if (assignedCount >= targetAssignments) {
        break;
      }
    }

    // Add remaining unassigned customers to skipped
    matchingCustomers.forEach((customer) => {
      if (!assignedCustomerIds.has(customer.id)) {
        const detail = result.details.find(d => d.customerId === customer.id);
        if (!detail) {
          result.skipped++;
          result.details.push({
            customerId: customer.id,
            action: "skipped",
            reason: "Workload balance limit reached",
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Auto-assigned ${result.assigned} customer(s)`,
      result,
      workload: {
        before: currentWorkload.totalCustomers,
        after: currentWorkload.totalCustomers + result.assigned,
        capacity: workloadBalance.targetCount,
      },
    });
  } catch (error: any) {
    console.error("Error auto-assigning customers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-assign customers" },
      { status: 500 }
    );
  }
}

