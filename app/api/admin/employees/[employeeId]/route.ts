// app/api/admin/employees/[employeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const isAdmin = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userDoc = await getDoc(doc(db, "users", employeeId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const data = userDoc.data();
    
    // Get training certificate status
    const { collection, query, where, getDocs } = firestore;
    const trainingProgressRef = collection(db, "trainingProgress");
    const progressQuery = query(
      trainingProgressRef,
      where("employeeId", "==", employeeId)
    );
    const progressSnapshot = await getDocs(progressQuery);
    
    let certificationStatus = "not_started";
    let certificateData = null;
    
    if (!progressSnapshot.empty) {
      const progressData = progressSnapshot.docs[0].data();
      certificationStatus = progressData.overallStatus || "in_progress";
      
      if (progressData.certificates && progressData.certificates.length > 0) {
        const latestCert = progressData.certificates[progressData.certificates.length - 1];
        certificateData = {
          certId: latestCert.certId,
          issuedAt: latestCert.issuedAt?.toDate?.()?.toISOString(),
          expiresAt: latestCert.expiresAt?.toDate?.()?.toISOString(),
          scoreSummary: latestCert.scoreSummary,
        };
      }
    }

    const employee = {
      id: userDoc.id,
      email: data.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      role: data.role || "",
      serviceArea: data.serviceArea || [],
      payRatePerJob: data.payRatePerJob || 0,
      taxInfo: data.taxInfo || null,
      hiringStatus: data.hiringStatus || "active",
      hiredDate: data.hiredDate,
      hiredBy: data.hiredBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      certificationStatus,
      certificate: certificateData,
    };

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error: any) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, serviceArea, payRatePerJob } = body;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const userDocRef = doc(db, "users", employeeId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || null;
    if (serviceArea !== undefined) updateData.serviceArea = serviceArea;
    if (payRatePerJob !== undefined) updateData.payRatePerJob = parseFloat(payRatePerJob);

    await updateDoc(userDocRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update employee" },
      { status: 500 }
    );
  }
}
