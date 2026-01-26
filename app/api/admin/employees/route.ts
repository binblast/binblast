// app/api/admin/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getAllEmployees } from "@/lib/employee-utils";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const certificationStatus = searchParams.get("certificationStatus");
    const taxInfoComplete = searchParams.get("taxInfoComplete");
    const serviceArea = searchParams.get("serviceArea");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    // Get all employees
    let employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      orderBy("createdAt", "desc")
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
        role: data.role || "",
        serviceArea: data.serviceArea || [],
        payRatePerJob: data.payRatePerJob || 0,
        taxInfo: data.taxInfo || null,
        hiringStatus: data.hiringStatus || "active",
        hiredDate: data.hiredDate,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Apply filters
    if (certificationStatus) {
      // Filter by certification status - need to check trainingProgress collection
      const { collection: trainingCollection, query: trainingQuery, where: trainingWhere, getDocs: getTrainingDocs } = firestore;
      const trainingProgressRef = trainingCollection(db, "trainingProgress");
      
      const allEmployeeIds = employees.map(e => e.id);
      const certifiedEmployeeIds = new Set<string>();
      
      for (const empId of allEmployeeIds) {
        const progressQuery = trainingQuery(
          trainingProgressRef,
          trainingWhere("employeeId", "==", empId)
        );
        const progressSnapshot = await getTrainingDocs(progressQuery);
        
        if (!progressSnapshot.empty) {
          const progressData = progressSnapshot.docs[0].data();
          const overallStatus = progressData.overallStatus || "in_progress";
          
          if (certificationStatus === "certified" && overallStatus === "completed") {
            certifiedEmployeeIds.add(empId);
          } else if (certificationStatus === "expired") {
            const expiresAt = progressData.nextRecertDueAt;
            if (expiresAt) {
              const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
              if (expiryDate < new Date()) {
                certifiedEmployeeIds.add(empId);
              }
            }
          } else if (certificationStatus === "in_progress" && overallStatus === "in_progress") {
            certifiedEmployeeIds.add(empId);
          }
        } else if (certificationStatus === "in_progress") {
          certifiedEmployeeIds.add(empId);
        }
      }
      
      employees = employees.filter(emp => certifiedEmployeeIds.has(emp.id));
    }

    if (taxInfoComplete === "true") {
      employees = employees.filter(emp => emp.taxInfo && emp.taxInfo.ssn);
    } else if (taxInfoComplete === "false") {
      employees = employees.filter(emp => !emp.taxInfo || !emp.taxInfo.ssn);
    }

    if (serviceArea) {
      employees = employees.filter(emp => 
        emp.serviceArea && emp.serviceArea.some((area: string) => 
          area.toLowerCase().includes(serviceArea.toLowerCase())
        )
      );
    }

    return NextResponse.json({
      success: true,
      employees,
      count: employees.length,
    });
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, serviceArea, payRatePerJob } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, email" },
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
    const { collection, doc, setDoc, serverTimestamp } = firestore;

    // Create Firebase user account
    const { createUserWithEmailAndPassword, updateProfile, getAuthInstance } = await import("@/lib/firebase");
    const auth = await getAuthInstance();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Firebase auth not available" },
        { status: 500 }
      );
    }

    // Generate a secure temporary password
    function generateTemporaryPassword(): string {
      const length = 12;
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const numbers = "0123456789";
      const special = "!@#$%^&*";
      const allChars = uppercase + lowercase + numbers + special;
      
      let password = "";
      // Ensure at least one character from each set
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];
      
      // Fill the rest randomly
      for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Shuffle the password
      return password.split("").sort(() => Math.random() - 0.5).join("");
    }

    // Always generate a temporary password
    const tempPassword = generateTemporaryPassword();
    const userCredential = await createUserWithEmailAndPassword(email, tempPassword);
    
    // Update profile
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
    });

    // Save employee data to Firestore
    const userDocRef = doc(collection(db, "users"), userCredential.user.uid);
    await setDoc(userDocRef, {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || null,
      role: "employee",
      serviceArea: serviceArea || [],
      payRatePerJob: payRatePerJob ? parseFloat(payRatePerJob) : 10,
      hiringStatus: "active",
      hiredDate: serverTimestamp(),
      hiredBy: userId || "admin",
      tempPassword: tempPassword, // Store temp password temporarily (should be cleared after first login)
      hasChangedPassword: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Audit logging for employee creation
    await logAdminAction("create_employee", userId || "admin", {
      employeeId: userCredential.user.uid,
      email,
      firstName,
      lastName,
    });

    // TODO: Send invitation email with temporary password

    return NextResponse.json({
      success: true,
      employee: {
        id: userCredential.user.uid,
        email,
        firstName,
        lastName,
      },
      tempPassword: tempPassword, // Return temp password so admin can share it with employee
      message: "Employee account created successfully. Temporary password has been generated.",
    });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    
    if (error.code === "auth/email-already-in-use") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}
