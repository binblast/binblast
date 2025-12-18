// app/api/partners/team-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getActivePartner } from "@/lib/partner-auth";
import { notifyTeamMemberInvitation } from "@/lib/email-utils";

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

    // Verify partner access and get partner data
    // Priority: userId (authenticated user) > partnerId (parameter)
    let finalPartnerId = partnerId;
    let partnerBusinessName = "";
    
    if (userId) {
      // If userId is provided, use it to get the partner (userId is source of truth for auth)
      console.log(`[Team Members API] Looking up partner for userId: ${userId}`);
      let partner = await getActivePartner(userId);
      let partnerStatus = null;
      
      console.log(`[Team Members API] getActivePartner result:`, partner ? `Found partner ${partner.id}` : "Not found");
      
      // If not found by userId, try to get user email from Firestore and search by email (fallback)
      if (!partner) {
        try {
          const db = await getDbInstance();
          if (db) {
            const firestore = await safeImportFirestore();
            const { doc, getDoc, collection, query, where, getDocs } = firestore;
            
            // First, check if partner exists with any status (to get status info)
            const partnersByUserIdQuery = query(
              collection(db, "partners"),
              where("userId", "==", userId)
            );
            const partnersByUserIdSnapshot = await getDocs(partnersByUserIdQuery);
            
            if (!partnersByUserIdSnapshot.empty) {
              const partnerDoc = partnersByUserIdSnapshot.docs[0];
              const partnerData = partnerDoc.data();
              partnerStatus = partnerData.status || null;
              
              console.log(`[Team Members API] Found partner by userId with status: ${partnerStatus}`);
              
              // If status is active, use this partner
              if (partnerData.status === "active") {
                partner = {
                  id: partnerDoc.id,
                  businessName: partnerData.businessName || "",
                  referralCode: partnerData.referralCode || "",
                  status: partnerData.status || "",
                };
                console.log(`[Team Members API] Using partner ${partner.id} (active)`);
              }
            } else {
              console.log(`[Team Members API] No partner found with userId: ${userId}`);
            }
            
            // If still not found, try by email
            if (!partner) {
              let userEmail: string | null = null;
              
              // Try to get email from users collection
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                userEmail = userDoc.data()?.email || null;
              }
              
              // If user document doesn't exist but partnerId is provided, try to get email from partner record
              if (!userEmail && partnerId) {
                try {
                  const partnerDoc = await getDoc(doc(db, "partners", partnerId));
                  if (partnerDoc.exists()) {
                    userEmail = partnerDoc.data()?.email || null;
                    console.log(`[Team Members API] Got email from partner record: ${userEmail}`);
                  }
                } catch (partnerEmailError) {
                  console.error("[Team Members API] Error getting email from partner record:", partnerEmailError);
                }
              }
              
              if (userEmail) {
                console.log(`[Team Members API] Trying email lookup: ${userEmail.toLowerCase()}`);
                // Try to find partner by email (any status first to check status)
                const partnersByEmailAnyStatusQuery = query(
                  collection(db, "partners"),
                  where("email", "==", userEmail.toLowerCase())
                );
                const partnersByEmailAnyStatusSnapshot = await getDocs(partnersByEmailAnyStatusQuery);
                
                if (!partnersByEmailAnyStatusSnapshot.empty) {
                  const partnerDoc = partnersByEmailAnyStatusSnapshot.docs[0];
                  const partnerData = partnerDoc.data();
                  partnerStatus = partnerData.status || null;
                  
                  console.log(`[Team Members API] Found partner by email with status: ${partnerStatus}`);
                  
                  // If status is active, use this partner
                  if (partnerData.status === "active") {
                    partner = {
                      id: partnerDoc.id,
                      businessName: partnerData.businessName || "",
                      referralCode: partnerData.referralCode || "",
                      status: partnerData.status || "",
                    };
                    console.log(`[Team Members API] Using partner ${partner.id} (active from email lookup)`);
                  }
                } else {
                  console.log(`[Team Members API] No partner found with email: ${userEmail.toLowerCase()}`);
                }
              } else {
                console.log(`[Team Members API] Could not get user email from users collection or partner record`);
              }
            }
          }
        } catch (emailLookupError) {
          console.error("[Team Members API] Error looking up partner:", emailLookupError);
        }
      }
      
      // If still not found and partnerId was provided, try to verify it directly
      if (!partner && partnerId) {
        try {
          const db = await getDbInstance();
          if (db) {
            const firestore = await safeImportFirestore();
            const { doc, getDoc } = firestore;
            
            const partnerDoc = await getDoc(doc(db, "partners", partnerId));
            if (partnerDoc.exists()) {
              const partnerData = partnerDoc.data();
              partnerStatus = partnerData.status || null;
              
              console.log(`[Team Members API] Found partner by partnerId with status: ${partnerStatus}`);
              
              // If status is active, use this partner
              if (partnerData.status === "active") {
                partner = {
                  id: partnerDoc.id,
                  businessName: partnerData.businessName || "",
                  referralCode: partnerData.referralCode || "",
                  status: partnerData.status || "",
                };
                console.log(`[Team Members API] Using partner ${partner.id} (active from partnerId)`);
              }
            }
          }
        } catch (partnerIdError) {
          console.error("[Team Members API] Error looking up partner by partnerId:", partnerIdError);
        }
      }
      
      if (!partner) {
        // Provide more specific error message based on partner status
        let errorMessage = "Unauthorized: Partner not found or not active";
        let errorDetails: any = { status: partnerStatus || "not found" };
        
        if (partnerStatus === "pending_agreement") {
          errorMessage = "Please accept the partner agreement before adding team members. Go to your partner dashboard to complete the agreement.";
          // Try to get partnerId to provide a link
          try {
            const db = await getDbInstance();
            if (db) {
              const firestore = await safeImportFirestore();
              const { collection, query, where, getDocs, doc, getDoc } = firestore;
              
              // Try to find partner by userId or email to get partnerId
              let partnerIdForLink = partnerId || null; // Use provided partnerId first
              
              if (!partnerIdForLink) {
                const partnersByUserIdQuery = query(
                  collection(db, "partners"),
                  where("userId", "==", userId)
                );
                const partnersByUserIdSnapshot = await getDocs(partnersByUserIdQuery);
                
                if (!partnersByUserIdSnapshot.empty) {
                  partnerIdForLink = partnersByUserIdSnapshot.docs[0].id;
                } else {
                  const userDoc = await getDoc(doc(db, "users", userId));
                  const userEmail = userDoc.exists() ? userDoc.data()?.email : null;
                  if (userEmail) {
                    const partnersByEmailQuery = query(
                      collection(db, "partners"),
                      where("email", "==", userEmail.toLowerCase())
                    );
                    const partnersByEmailSnapshot = await getDocs(partnersByEmailQuery);
                    if (!partnersByEmailSnapshot.empty) {
                      partnerIdForLink = partnersByEmailSnapshot.docs[0].id;
                    }
                  }
                }
              }
              
              if (partnerIdForLink) {
                errorDetails.agreementLink = `/partners/agreement/${partnerIdForLink}`;
              }
            }
          } catch (linkError) {
            console.error("[Team Members API] Error getting agreement link:", linkError);
          }
        } else if (partnerStatus === "suspended" || partnerStatus === "removed") {
          errorMessage = `Cannot add team members: Partner account is ${partnerStatus}. Please contact support.`;
        } else if (partnerStatus) {
          errorMessage = `Cannot add team members: Partner status is "${partnerStatus}". Account must be active.`;
        }
        
        console.error(`[Team Members API] Partner lookup failed for userId ${userId}, partnerId: ${partnerId || "not provided"}, status: ${partnerStatus || "not found"}`);
        return NextResponse.json(
          { 
            error: errorMessage,
            details: errorDetails
          },
          { status: 401 }
        );
      }
      
      // Use the partner ID from the authenticated user's partner record
      finalPartnerId = partner.id;
      partnerBusinessName = partner.businessName || "";
      
      // If partnerId was also provided, log a warning if it doesn't match (but don't fail)
      if (partnerId && partner.id !== partnerId) {
        console.warn(`[Team Members API] Partner ID mismatch: provided ${partnerId}, but userId ${userId} belongs to partner ${partner.id}`);
      }
    } else if (finalPartnerId) {
      // If only partnerId is provided (no userId), fetch partner data to get business name
      const db = await getDbInstance();
      if (db) {
        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;
        const partnerDoc = await getDoc(doc(db, "partners", finalPartnerId));
        if (partnerDoc.exists()) {
          const partnerData = partnerDoc.data();
          partnerBusinessName = partnerData.businessName || "";
        }
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

      // Send invitation email (fire-and-forget, non-blocking)
      (async () => {
        try {
          await notifyTeamMemberInvitation({
            email,
            firstName,
            lastName,
            tempPassword,
            partnerBusinessName: partnerBusinessName || "Your Partner",
            serviceAreas: serviceArea && serviceArea.length > 0 ? serviceArea.join(", ") : undefined,
            payRate: payRate,
            loginLink: "https://binblast.vercel.app/login",
          });
        } catch (emailError: any) {
          console.error("[Team Members API] Failed to send invitation email:", emailError?.message || emailError);
          // Don't throw - email failure shouldn't block team member creation
        }
      })();

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
