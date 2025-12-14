// app/api/operator/employees/[employeeId]/reassign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getEmployeesInSameZones, calculateWorkload } from "@/lib/zone-assignment";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { customerIds, targetEmployeeId } = body;

    if (!employeeId || !targetEmployeeId) {
      return NextResponse.json(
        { error: "Missing employeeId or targetEmployeeId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: "customerIds must be a non-empty array" },
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

    // Get target employee data
    const targetEmployeeRef = doc(db, "users", targetEmployeeId);
    const targetEmployeeSnap = await getDoc(targetEmployeeRef);

    if (!targetEmployeeSnap.exists()) {
      return NextResponse.json(
        { error: "Target employee not found" },
        { status: 404 }
      );
    }

    const targetEmployeeData = targetEmployeeSnap.data();
    const targetEmployeeName = `${targetEmployeeData.firstName || ""} ${targetEmployeeData.lastName || ""}`.trim();

    // Check target employee workload
    const targetWorkload = await calculateWorkload(targetEmployeeId);
    if (targetWorkload && targetWorkload.totalCustomers + customerIds.length > 40) {
      return NextResponse.json(
        { error: `Target employee would exceed capacity (${targetWorkload.totalCustomers + customerIds.length}/40)` },
        { status: 400 }
      );
    }

    const reassigned: string[] = [];
    const errors: string[] = [];

    // Reassign customers
    for (const customerId of customerIds) {
      try {
        const customerRef = doc(db, "scheduledCleanings", customerId);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists()) {
          errors.push(`Customer ${customerId} not found`);
          continue;
        }

        const customerData = customerSnap.data();
        
        // Verify customer is currently assigned to source employee
        if (customerData.assignedEmployeeId !== employeeId) {
          errors.push(`Customer ${customerId} is not assigned to source employee`);
          continue;
        }

        await updateDoc(customerRef, {
          assignedEmployeeId: targetEmployeeId,
          assignedEmployeeName: targetEmployeeName,
          assignmentSource: "manual",
          reassignedAt: serverTimestamp(),
          reassignedFrom: employeeId,
          updatedAt: serverTimestamp(),
        });

        reassigned.push(customerId);
      } catch (error: any) {
        errors.push(`Failed to reassign customer ${customerId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reassigned ${reassigned.length} customer(s)`,
      reassigned,
      errors,
    });
  } catch (error: any) {
    console.error("Error reassigning customers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reassign customers" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

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
    const { doc, getDoc } = firestore;

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
    const zones = employeeData.zones || [];
    const counties = employeeData.counties || [];

    // Get other employees in same zones who can take customers
    const availableEmployees = await getEmployeesInSameZones(employeeId, zones, counties);
    
    // Filter out current employee and calculate capacity for each
    const employeesWithCapacity = await Promise.all(
      availableEmployees
        .filter((emp) => emp.id !== employeeId)
        .map(async (emp) => {
          const workload = await calculateWorkload(emp.id);
          return {
            id: emp.id,
            name: emp.name,
            currentCustomers: workload?.totalCustomers || 0,
            availableCapacity: workload ? Math.max(0, 40 - workload.totalCustomers) : 40,
            capacityUtilization: workload?.capacityUtilization || 0,
          };
        })
    );

    // Sort by available capacity (most available first)
    employeesWithCapacity.sort((a, b) => b.availableCapacity - a.availableCapacity);

    return NextResponse.json({
      success: true,
      availableEmployees: employeesWithCapacity,
    });
  } catch (error: any) {
    console.error("Error getting available employees:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get available employees" },
      { status: 500 }
    );
  }
}

