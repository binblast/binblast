import { NextRequest, NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type StaffRole = "employee" | "operator";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

interface TeamAccountSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  hiringStatus: string;
  hasChangedPassword: boolean;
  createdAt: unknown;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildTempPassword() {
  return `Temp${Math.random().toString(36).slice(-8)}!`;
}

function isStaffRole(role: unknown): role is StaffRole {
  return role === "employee" || role === "operator";
}

async function findStaffAccountsByEmail(db: any, normalizedEmail: string) {
  const snapshot = await db.collection("users").where("email", "==", normalizedEmail).limit(10).get();
  return snapshot.docs
    .map((doc: FirestoreDocument) => ({ id: doc.id, ...doc.data() }))
    .filter((user: Record<string, unknown>) => isStaffRole(user.role));
}

function buildUserDoc({
  firstName,
  lastName,
  normalizedEmail,
  phone,
  role,
  userId,
  tempPassword,
  parsedServiceAreas,
  payRatePerJob,
  admin,
  includeCreatedAt = true,
}: {
  firstName: string;
  lastName: string;
  normalizedEmail: string;
  phone?: string;
  role: StaffRole;
  userId: string;
  tempPassword: string;
  parsedServiceAreas: string[];
  payRatePerJob?: number | string;
  admin: typeof import("firebase-admin");
  includeCreatedAt?: boolean;
}) {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    role,
    hiringStatus: "active",
    hiredDate: admin.firestore.FieldValue.serverTimestamp(),
    hiredBy: userId || "owner",
    tempPassword,
    hasChangedPassword: false,
    ...(includeCreatedAt
      ? { createdAt: admin.firestore.FieldValue.serverTimestamp() }
      : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(role === "employee"
      ? {
          serviceArea: parsedServiceAreas,
          payRatePerJob: payRatePerJob ? Number(payRatePerJob) : 10,
        }
      : {}),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get("query")?.trim().toLowerCase() || "";
    const db = await getAdminFirestore();
    const snapshot = await db.collection("users").get();

    const accounts = (snapshot.docs as FirestoreDocument[])
      .map((doc): TeamAccountSummary | null => {
        const data = doc.data();
        const role = typeof data.role === "string" ? data.role : "";
        if (role !== "employee" && role !== "operator") return null;

        const firstName = typeof data.firstName === "string" ? data.firstName : "";
        const lastName = typeof data.lastName === "string" ? data.lastName : "";
        const email = typeof data.email === "string" ? data.email : "";
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: doc.id,
          firstName,
          lastName,
          fullName,
          email,
          phone: typeof data.phone === "string" ? data.phone : "",
          role,
          hiringStatus: typeof data.hiringStatus === "string" ? data.hiringStatus : "active",
          hasChangedPassword: data.hasChangedPassword === true,
          createdAt: data.createdAt || null,
        };
      })
      .filter((account): account is TeamAccountSummary => account !== null)
      .filter((account: TeamAccountSummary) => {
        if (!query) return true;
        return (
          account.fullName.toLowerCase().includes(query) ||
          account.email.toLowerCase().includes(query) ||
          account.phone.includes(query)
        );
      })
      .sort((a: TeamAccountSummary, b: TeamAccountSummary) => a.fullName.localeCompare(b.fullName));

    return NextResponse.json({
      success: true,
      accounts,
      counts: {
        employees: accounts.filter((account: TeamAccountSummary) => account.role === "employee").length,
        operators: accounts.filter((account: TeamAccountSummary) => account.role === "operator").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Team Accounts GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load team accounts";
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
    const {
      role,
      firstName,
      lastName,
      email,
      phone,
      password,
      serviceArea,
      payRatePerJob,
    } = body as {
      role?: StaffRole;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      password?: string;
      serviceArea?: string[] | string;
      payRatePerJob?: number | string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    if (role !== "employee" && role !== "operator") {
      return NextResponse.json(
        { error: "Role must be employee or operator" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const tempPassword = password?.trim() || buildTempPassword();
    const parsedServiceAreas = Array.isArray(serviceArea)
      ? serviceArea
      : typeof serviceArea === "string"
        ? serviceArea.split(",").map((area) => area.trim()).filter(Boolean)
        : [];

    const adminApp = await getAdminApp();
    const adminAuth = adminApp.auth();
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");

    const existingStaff = await findStaffAccountsByEmail(db, normalizedEmail);
    if (existingStaff.length > 0) {
      const existingRole = existingStaff[0].role as StaffRole;
      return NextResponse.json(
        {
          error: `This email is already set up as an ${existingRole}. Use Login Help to send a password reset instead.`,
        },
        { status: 400 }
      );
    }

    let authUser: { uid: string; email?: string } | null = null;
    let linkedExistingLogin = false;
    let upgradedFromRole: string | null = null;

    try {
      authUser = await adminAuth.getUserByEmail(normalizedEmail);
      linkedExistingLogin = true;
    } catch (authLookupError: any) {
      if (authLookupError?.code !== "auth/user-not-found") {
        throw authLookupError;
      }
    }

    let accountId: string;
    const userDoc = buildUserDoc({
      firstName,
      lastName,
      normalizedEmail,
      phone,
      role,
      userId: userId || "owner",
      tempPassword,
      parsedServiceAreas,
      payRatePerJob,
      admin,
      includeCreatedAt: !linkedExistingLogin,
    });

    if (authUser) {
      accountId = authUser.uid;
      const existingDoc = await db.collection("users").doc(accountId).get();
      const existingData = existingDoc.exists ? existingDoc.data() : null;
      const existingRole = typeof existingData?.role === "string" ? existingData.role : null;

      if (existingRole && isStaffRole(existingRole)) {
        return NextResponse.json(
          {
            error: `This email is already set up as an ${existingRole}. Use Login Help to send a password reset instead.`,
          },
          { status: 400 }
        );
      }

      if (existingRole && existingRole !== role) {
        upgradedFromRole = existingRole;
      }

      await adminAuth.updateUser(accountId, {
        password: tempPassword,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        email: normalizedEmail,
      });

      await db.collection("users").doc(accountId).set(userDoc, { merge: true });
    } else {
      const userRecord = await adminAuth.createUser({
        email: normalizedEmail,
        password: tempPassword,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        emailVerified: false,
      });
      accountId = userRecord.uid;
      await db.collection("users").doc(accountId).set(userDoc);
    }

    if (role === "employee") {
      const trainingDoc = await db.collection("trainingProgress").doc(accountId).get();
      if (!trainingDoc.exists) {
        await db.collection("trainingProgress").doc(accountId).set({
          employeeId: accountId,
          overallStatus: "in_progress",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await logAdminAction("create_team_account", userId || "owner", {
      accountId,
      email: normalizedEmail,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      linkedExistingLogin,
      upgradedFromRole,
    });

    const successMessage = linkedExistingLogin
      ? upgradedFromRole
        ? `${role === "operator" ? "Operator" : "Employee"} access added to existing ${upgradedFromRole} account`
        : `${role === "operator" ? "Operator" : "Employee"} login linked to existing email`
      : `${role === "operator" ? "Operator" : "Employee"} account created successfully`;

    return NextResponse.json({
      success: true,
      account: {
        id: accountId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        tempPassword,
      },
      linkedExistingLogin,
      upgradedFromRole,
      message: successMessage,
    });
  } catch (error: any) {
    console.error("[Team Accounts POST] Error:", error);

    if (error.code === "auth/email-already-exists" || error.code === "auth/email-already-in-use") {
      return NextResponse.json(
        {
          error:
            "Firebase already has a login for this email. Try again in a moment, or use Login Help to send a password reset.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create team account" },
      { status: 500 }
    );
  }
}
