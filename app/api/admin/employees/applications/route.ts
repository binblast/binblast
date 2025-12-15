// app/api/admin/employees/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // "pending" | "approved" | "rejected"

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    let applicationsQuery = query(
      collection(db, "employeeApplications"),
      orderBy("applicationDate", "desc")
    );

    if (status) {
      applicationsQuery = query(
        collection(db, "employeeApplications"),
        where("status", "==", status),
        orderBy("applicationDate", "desc")
      );
    }

    const applicationsSnapshot = await getDocs(applicationsQuery);
    const applications = applicationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        employeeId: data.employeeId,
        applicationDate: data.applicationDate?.toDate?.()?.toISOString(),
        status: data.status || "pending",
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
        notes: data.notes || "",
      };
    });

    // Get employee details for each application
    const { doc: getDoc, getDoc: fetchDoc } = firestore;
    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        try {
          const userDoc = await fetchDoc(getDoc(db, "users", app.employeeId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              ...app,
              employee: {
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                email: userData.email || "",
                phone: userData.phone || "",
              },
            };
          }
          return app;
        } catch (error) {
          console.error(`Error fetching employee ${app.employeeId}:`, error);
          return app;
        }
      })
    );

    return NextResponse.json({
      success: true,
      applications: applicationsWithDetails,
      count: applicationsWithDetails.length,
    });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing required field: employeeId" },
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
    const { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } = firestore;

    // Check if application already exists
    const applicationsRef = collection(db, "employeeApplications");
    const { query, where, getDocs } = firestore;
    const existingQuery = query(
      applicationsRef,
      where("employeeId", "==", employeeId),
      where("status", "==", "pending")
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "Application already exists for this employee" },
        { status: 400 }
      );
    }

    // Create application
    const applicationRef = await addDoc(applicationsRef, {
      employeeId,
      applicationDate: serverTimestamp(),
      status: "pending",
    });

    // Update user document with pending approval status
    const userDocRef = doc(db, "users", employeeId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        hiringStatus: "pending_approval",
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      applicationId: applicationRef.id,
      message: "Application created successfully",
    });
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create application" },
      { status: 500 }
    );
  }
}
