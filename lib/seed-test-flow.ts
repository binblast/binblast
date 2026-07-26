import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { appendStandardPrepNote } from "@/lib/cleaning-readiness";
import { getDayOfWeekName } from "@/lib/business-hours";
import { getTodayDateString } from "@/lib/employee-utils";
import { getRequiredModules } from "@/lib/training-modules";

export const TEST_FLOW_PASSWORD = "BinBlastTest2026!";
export const TEST_FLOW_CUSTOMER_EMAIL = "flow.test.customer@binblastco.com";
export const TEST_FLOW_EMPLOYEE_EMAIL = "flow.test.employee@binblastco.com";

export interface SeedTestFlowResult {
  customer: {
    uid: string;
    email: string;
    password: string;
    cleaningId: string;
    scheduledDate: string;
  };
  employee: {
    uid: string;
    email: string;
    password: string;
  };
  operator: {
    loginUrl: string;
    note: string;
  };
  steps: string[];
}

async function getOrCreateAuthUser(
  auth: import("firebase-admin").auth.Auth,
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, displayName });
    return existing.uid;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  const created = await auth.createUser({
    email,
    password,
    displayName,
    emailVerified: true,
  });
  return created.uid;
}

export async function seedTestFlowAccounts(): Promise<SeedTestFlowResult> {
  await getAdminApp();
  const admin = await import("firebase-admin");
  const auth = admin.auth();
  const db = await getAdminFirestore();
  const FieldValue = admin.firestore.FieldValue;
  const today = getTodayDateString();
  const trashDay = getDayOfWeekName(today);

  const customerUid = await getOrCreateAuthUser(
    auth,
    TEST_FLOW_CUSTOMER_EMAIL,
    TEST_FLOW_PASSWORD,
    "Flow Test Customer"
  );

  const employeeUid = await getOrCreateAuthUser(
    auth,
    TEST_FLOW_EMPLOYEE_EMAIL,
    TEST_FLOW_PASSWORD,
    "Flow Test Employee"
  );

  const employeeName = "Flow TestEmployee";
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 180);

  await db.collection("users").doc(customerUid).set(
    {
      firstName: "Flow",
      lastName: "TestCustomer",
      email: TEST_FLOW_CUSTOMER_EMAIL,
      phone: "7705550101",
      role: "customer",
      selectedPlan: "twice-month",
      paymentStatus: "paid",
      subscriptionStatus: "active",
      stripeCustomerId: "test_flow_customer",
      recurringScheduleActive: true,
      addressLine1: "123 Test Lane",
      addressLine2: null,
      city: "Fayetteville",
      state: "GA",
      zipCode: "30214",
      preferredDayOfWeek: trashDay,
      preferredTimeWindow: "8:00 AM - 12:00 PM",
      referralCode: "FLOWTEST01",
      referralCount: 0,
      cleaningCredits: 0,
      pendingCleaningConfirmation: false,
      pendingCleaningData: null,
      defaultAssignedEmployeeId: employeeUid,
      defaultAssignedEmployeeName: employeeName,
      isTestAccount: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection("users").doc(employeeUid).set(
    {
      firstName: "Flow",
      lastName: "TestEmployee",
      email: TEST_FLOW_EMPLOYEE_EMAIL,
      phone: "7705550102",
      role: "employee",
      serviceArea: ["Fayetteville", "30214", "Peachtree City"],
      payRatePerJob: 15,
      hiringStatus: "active",
      isTestAccount: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      hiredDate: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const module of getRequiredModules()) {
    await db
      .collection("employeeTraining")
      .doc(`${employeeUid}_${module.id}`)
      .set(
        {
          employeeId: employeeUid,
          moduleId: module.id,
          completed: true,
          completedAt: admin.firestore.Timestamp.fromDate(now),
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          certificationStatus: "completed",
          quizScore: 100,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  const cleaningRef = await db.collection("scheduledCleanings").add({
    userId: customerUid,
    userEmail: TEST_FLOW_CUSTOMER_EMAIL,
    addressLine1: "123 Test Lane",
    addressLine2: null,
    city: "Fayetteville",
    state: "GA",
    zipCode: "30214",
    trashDay,
    scheduledDate: today,
    scheduledTime: "8:00 AM - 12:00 PM",
    notes: "Test flow cleaning — safe to complete in staging.",
    binsCount: 1,
    internalNotes: appendStandardPrepNote(null),
    status: "upcoming",
    jobStatus: "pending",
    assignedEmployeeId: employeeUid,
    assignedEmployeeName: employeeName,
    assignmentSource: "test_flow_seed",
    billingCoverage: "plan_included",
    isTestFlow: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    customer: {
      uid: customerUid,
      email: TEST_FLOW_CUSTOMER_EMAIL,
      password: TEST_FLOW_PASSWORD,
      cleaningId: cleaningRef.id,
      scheduledDate: today,
    },
    employee: {
      uid: employeeUid,
      email: TEST_FLOW_EMPLOYEE_EMAIL,
      password: TEST_FLOW_PASSWORD,
    },
    operator: {
      loginUrl: "/operator",
      note: "Use your existing Blast Command login (binblastcompany@gmail.com).",
    },
    steps: [
      "Customer: log in at /customer → confirm upcoming cleaning on /dashboard",
      "Operator: log in at /operator → verify assignment on schedule board",
      "Employee: log in at /employee → clock in → start job → photos → complete",
      "Customer: refresh dashboard → cleaning should show completed + next visit scheduled",
    ],
  };
}
