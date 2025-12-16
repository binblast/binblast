// app/api/partners/team-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getActivePartner } from "@/lib/partner-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/partners/team-members
 * Get all team members for a partner
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const partnerId = searchParams.get("partnerId");
    const userId = searchParams.get("userId");

    if (!partnerId && !userId) {
      return NextResponse.json(
        { error: "partnerId or userId is required" },
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
    const { collection, query, where, getDocs, orderBy } = firestore;

    // If userId provided, get partnerId first
    let finalPartnerId = partnerId;
    if (!finalPartnerId && userId) {
      const partner = await getActivePartner(userId);
      if (!partner) {
        return NextResponse.json(
          { error: "Partner not found" },
          { status: 404 }
        );
      }
      finalPartnerId = partner.id;
    }

    // Get all employees linked to this partner
    // Sort in memory to avoid Firestore index requirements
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("partnerId", "==", finalPartnerId)
    );

    const employeesSnapshot = await getDocs(employeesQuery);
    let employees = employeesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        serviceArea: data.serviceArea || [],
        payRatePerJob: data.payRatePerJob || 0,
        hiringStatus: data.hiringStatus || "active",
        partnerId: data.partnerId || null,
        tempPassword: data.tempPassword || null,
        hasChangedPassword: data.hasChangedPassword || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Sort by createdAt if not already sorted by query
    employees.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
      return bTime - aTime; // Descending order (newest first)
    });

    return NextResponse.json({
      success: true,
      employees,
      count: employees.length,
    });
  } catch (error: any) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partners/team-members
 * Create a new team member (employee) for a partner
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      partnerId, 
      userId,
      firstName, 
      lastName, 
      email, 
      phone, 
      serviceArea, 
      payRatePerJob 
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, email" },
        { status: 400 }
      );
    }

    // Validate pay rate
    const payRate = payRatePerJob ? parseFloat(payRatePerJob.toString()) : 10;
    if (isNaN(payRate) || payRate < 7.50 || payRate > 10) {
      return NextResponse.json(
        { error: "Pay rate must be between $7.50 and $10.00 per trash can" },
        { status: 400 }
      );
    }

    // Verify partner access
    let finalPartnerId = partnerId;
    if (!finalPartnerId && userId) {
      const partner = await getActivePartner(userId);
      if (!partner) {
        return NextResponse.json(
          { error: "Unauthorized: Partner not found" },
          { status: 401 }
        );
      }
      finalPartnerId = partner.id;
    } else if (finalPartnerId && userId) {
      // Verify that the partnerId belongs to the userId
      const partner = await getActivePartner(userId);
      if (!partner || partner.id !== finalPartnerId) {
        return NextResponse.json(
          { error: "Unauthorized: Partner ID does not match your account" },
          { status: 403 }
        );
      }
    }

    if (!finalPartnerId) {
      return NextResponse.json(
        { error: "partnerId or userId is required" },
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
    const { collection, doc, setDoc, query, where, getDocs, serverTimestamp } = firestore;

    // Check if email already exists
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase())
    );
    const existingUsers = await getDocs(usersQuery);
    
    if (!existingUsers.empty) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Create Firebase user account
    // Generate temporary password first
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    
    try {
      // Initialize Firebase before creating user
      const { getFirebaseApp } = await import("@/lib/firebase");
      const app = await getFirebaseApp();
      
      if (!app) {
        console.error("[Team Members API] Firebase app not initialized");
        return NextResponse.json(
          { error: "Unable to initialize authentication service. Please try again or contact support." },
          { status: 500 }
        );
      }

      // Import Firebase auth module directly (server-side)
      // On server, we can import directly since we've already initialized the app
      const firebaseAuth = await import("firebase/auth");
      const auth = firebaseAuth.getAuth(app);
      
      if (!auth) {
        console.error("[Team Members API] Firebase auth instance is null after initialization");
        return NextResponse.json(
          { error: "Unable to initialize authentication service. Please try again or contact support." },
          { status: 500 }
        );
      }

      // Create user with email/password
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(auth, email, tempPassword);
      
      // Update profile
      await firebaseAuth.updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Save employee data to Firestore with partnerId
      const userDocRef = doc(collection(db, "users"), userCredential.user.uid);
      await setDoc(userDocRef, {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        role: "employee",
        serviceArea: serviceArea || [],
        payRatePerJob: payRate,
        partnerId: finalPartnerId, // Link employee to partner
        hiringStatus: "active",
        hiredDate: serverTimestamp(),
        hiredBy: userId || finalPartnerId,
        tempPassword: tempPassword, // Store temporary password
        hasChangedPassword: false, // Track if user has changed password
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Initialize training progress (employee will need to complete training)
      const trainingProgressRef = collection(db, "trainingProgress");
      await setDoc(doc(trainingProgressRef, userCredential.user.uid), {
        employeeId: userCredential.user.uid,
        overallStatus: "in_progress",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        employee: {
          id: userCredential.user.uid,
          email,
          firstName,
          lastName,
          tempPassword, // Return temp password so partner can share it
        },
        message: "Team member added successfully. They will need to complete training before clocking in.",
      });
    } catch (authError: any) {
      console.error("[Team Members API] Error creating user:", authError);
      
      // Handle specific Firebase auth errors
      if (authError.code === "auth/email-already-in-use") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      
      if (authError.message?.includes("Firebase") || authError.message?.includes("auth")) {
        return NextResponse.json(
          { error: "Authentication service error. Please try again or contact support if the issue persists." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || "Failed to create team member account. Please try again." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create team member" },
      { status: 500 }
    );
  }
}
