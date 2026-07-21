import { getAdminFirestore } from "@/lib/firebase-admin";
import { loadCompensationSettings } from "@/lib/employee-compensation-server";
import type {
  BinBlasterAdminNote,
  BinBlasterApplicationFormData,
  BinBlasterApplicationRecord,
  BinBlasterApplicationStatus,
  BinBlasterCompensation,
  BinBlasterPayInfo,
} from "@/lib/bin-blaster-types";
import {
  sendBinBlasterApplicationReceivedEmail,
  sendBinBlasterEmployeeInviteEmail,
  sendBinBlasterInterviewEmail,
  sendBinBlasterStatusEmail,
} from "@/lib/bin-blaster-email";
import { logAdminAction } from "@/lib/admin-auth";

const COLLECTION = "binBlasterApplications";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function serializeApplication(id: string, data: Record<string, unknown>): BinBlasterApplicationRecord {
  return {
    id,
    personal: (data.personal || {}) as BinBlasterApplicationRecord["personal"],
    work: (data.work || {}) as BinBlasterApplicationRecord["work"],
    serviceAreas: Array.isArray(data.serviceAreas) ? (data.serviceAreas as string[]) : [],
    agreements: (data.agreements || {
      noGuarantee: false,
      compensationBased: false,
      accurateInfo: false,
      followProcedures: false,
    }) as BinBlasterApplicationRecord["agreements"],
    status: (data.status as BinBlasterApplicationStatus) || "new",
    adminNotes: Array.isArray(data.adminNotes) ? (data.adminNotes as BinBlasterAdminNote[]) : [],
    assignedServiceAreas: Array.isArray(data.assignedServiceAreas)
      ? (data.assignedServiceAreas as string[])
      : [],
    compensation: (data.compensation as BinBlasterCompensation | null) || null,
    employeeId: (data.employeeId as string | null) || null,
    allowResubmission: Boolean(data.allowResubmission),
    submittedAt: toIso(data.submittedAt) || new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) || new Date().toISOString(),
    interviewRequestedAt: toIso(data.interviewRequestedAt),
    approvedAt: toIso(data.approvedAt),
    rejectedAt: toIso(data.rejectedAt),
    employeeAccountCreatedAt: toIso(data.employeeAccountCreatedAt),
  };
}

export async function getBinBlasterPayInfo(): Promise<BinBlasterPayInfo> {
  const settings = await loadCompensationSettings();

  return {
    title: "How Bin Blasters Are Paid",
    introCopy:
      "Bin Blasters are paid per completed service. Compensation may vary based on the number of bins, route type, job size, and whether the service is residential, HOA, restaurant, or commercial.",
    residentialFirstBin: settings.residentialFirstBinPay,
    residentialAdditionalBin: settings.residentialAdditionalBinPay,
    commercialCopy:
      "Commercial and larger jobs may use a percentage-based or custom compensation amount determined by management.",
    finalCopy: "Final compensation details are confirmed before a route or job is accepted.",
  };
}

export async function findActiveBinBlasterApplicationByEmail(
  email: string
): Promise<BinBlasterApplicationRecord | null> {
  const db = await getAdminFirestore();
  const normalized = email.trim().toLowerCase();
  const snapshot = await db
    .collection(COLLECTION)
    .where("personal.email", "==", normalized)
    .limit(20)
    .get();

  const active = snapshot.docs.find((doc: { data: () => Record<string, unknown> }) => {
    const data = doc.data();
    const status = data.status as BinBlasterApplicationStatus;
    if (status === "rejected" && data.allowResubmission) return false;
    return !["rejected", "employee_account_created"].includes(status);
  });

  if (!active) return null;
  return serializeApplication(active.id, active.data());
}

export async function createBinBlasterApplication(
  form: BinBlasterApplicationFormData
): Promise<BinBlasterApplicationRecord> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const normalizedEmail = form.personal.email.trim().toLowerCase();

  const duplicate = await findActiveBinBlasterApplicationByEmail(normalizedEmail);
  if (duplicate) {
    throw new Error("An application with this email is already under review.");
  }

  const existingUser = await db
    .collection("users")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();
  if (!existingUser.empty) {
    const role = existingUser.docs[0].data().role;
    if (role === "employee") {
      throw new Error("An employee account already exists for this email. Please sign in instead.");
    }
  }

  const docRef = db.collection(COLLECTION).doc();
  const payload = {
    personal: {
      ...form.personal,
      email: normalizedEmail,
      phone: form.personal.phone.replace(/\D/g, ""),
    },
    work: form.work,
    serviceAreas: form.serviceAreas,
    agreements: form.agreements,
    status: "new" as BinBlasterApplicationStatus,
    adminNotes: [],
    assignedServiceAreas: [],
    compensation: null,
    employeeId: null,
    allowResubmission: false,
    submittedAt: now,
    updatedAt: now,
    interviewRequestedAt: null,
    approvedAt: null,
    rejectedAt: null,
    employeeAccountCreatedAt: null,
    source: "bin_blaster_application",
  };

  await docRef.set(payload);
  const created = serializeApplication(docRef.id, {
    ...payload,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await sendBinBlasterApplicationReceivedEmail(created);
  return created;
}

export async function listBinBlasterApplications(params?: {
  status?: BinBlasterApplicationStatus;
  search?: string;
}): Promise<BinBlasterApplicationRecord[]> {
  const db = await getAdminFirestore();
  let query: ReturnType<typeof db.collection> = db.collection(COLLECTION);

  if (params?.status) {
    query = query.where("status", "==", params.status);
  }

  const snapshot = await query.limit(500).get();
  let applications: BinBlasterApplicationRecord[] = snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) =>
    serializeApplication(doc.id, doc.data())
  );

  if (params?.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    applications = applications.filter((app: BinBlasterApplicationRecord) => {
      const haystack = [
        app.personal.firstName,
        app.personal.lastName,
        app.personal.email,
        app.personal.phone,
        app.personal.city,
        app.personal.zip,
        ...app.serviceAreas,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  applications.sort(
    (a: BinBlasterApplicationRecord, b: BinBlasterApplicationRecord) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return applications;
}

export async function getBinBlasterApplicationById(
  applicationId: string
): Promise<BinBlasterApplicationRecord | null> {
  const db = await getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).doc(applicationId).get();
  if (!snapshot.exists) return null;
  return serializeApplication(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function updateBinBlasterApplication(params: {
  applicationId: string;
  status?: BinBlasterApplicationStatus;
  adminNote?: string;
  actorId: string;
  actorName: string;
  assignedServiceAreas?: string[];
  compensation?: BinBlasterCompensation;
  allowResubmission?: boolean;
  sendStatusEmail?: boolean;
  sendInterviewEmail?: boolean;
  interviewMessage?: string;
}): Promise<BinBlasterApplicationRecord> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = db.collection(COLLECTION).doc(params.applicationId);
  const existingSnap = await docRef.get();

  if (!existingSnap.exists) {
    throw new Error("Application not found.");
  }

  const existing = existingSnap.data() as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: now };
  const notes = Array.isArray(existing.adminNotes) ? [...(existing.adminNotes as BinBlasterAdminNote[])] : [];

  if (params.adminNote?.trim()) {
    notes.push({
      id: `note-${Date.now()}`,
      text: params.adminNote.trim(),
      authorId: params.actorId,
      authorName: params.actorName,
      createdAt: new Date().toISOString(),
    });
    update.adminNotes = notes;
  }

  if (params.status) {
    update.status = params.status;
    if (params.status === "interview_requested") {
      update.interviewRequestedAt = now;
    }
    if (params.status === "approved") {
      update.approvedAt = now;
    }
    if (params.status === "rejected") {
      update.rejectedAt = now;
    }
  }

  if (params.assignedServiceAreas) {
    update.assignedServiceAreas = params.assignedServiceAreas;
  }

  if (params.compensation) {
    update.compensation = params.compensation;
  }

  if (params.allowResubmission !== undefined) {
    update.allowResubmission = params.allowResubmission;
  }

  await docRef.set(update, { merge: true });
  const updated = await getBinBlasterApplicationById(params.applicationId);
  if (!updated) {
    throw new Error("Failed to load updated application.");
  }

  if (params.sendInterviewEmail || params.status === "interview_requested") {
    await sendBinBlasterInterviewEmail(updated, params.interviewMessage);
  } else if (params.sendStatusEmail && params.status) {
    await sendBinBlasterStatusEmail(updated, params.status);
  }

  return updated;
}

export async function createEmployeeAccountFromBinBlasterApplication(params: {
  applicationId: string;
  actorId: string;
  assignedServiceAreas?: string[];
  compensation?: BinBlasterCompensation;
}): Promise<{ application: BinBlasterApplicationRecord; employeeId: string }> {
  const application = await getBinBlasterApplicationById(params.applicationId);
  if (!application) {
    throw new Error("Application not found.");
  }

  if (application.employeeId) {
    throw new Error("An employee account has already been created for this application.");
  }

  if (!["approved", "waitlisted", "interview_requested", "under_review"].includes(application.status)) {
    throw new Error("Application must be reviewed before creating an employee account.");
  }

  const settings = await loadCompensationSettings();
  const compensation: BinBlasterCompensation = params.compensation || application.compensation || {
    residentialFirstBin: settings.residentialFirstBinPay,
    residentialAdditionalBin: settings.residentialAdditionalBinPay,
    notes: "",
  };
  const serviceAreas =
    params.assignedServiceAreas?.length
      ? params.assignedServiceAreas
      : application.assignedServiceAreas.length
        ? application.assignedServiceAreas
        : application.serviceAreas;

  if (!serviceAreas.length) {
    throw new Error("Assign at least one service area before creating an employee account.");
  }

  const adminApp = await import("@/lib/firebase-admin");
  const app = await adminApp.getAdminApp();
  const auth = app.auth();
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  const email = application.personal.email.trim().toLowerCase();
  const tempPassword = `Bb${Math.random().toString(36).slice(-8)}!${Math.floor(Math.random() * 90 + 10)}`;

  let employeeId: string;
  try {
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName: `${application.personal.firstName} ${application.personal.lastName}`.trim(),
    });
    employeeId = userRecord.uid;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new Error("An account with this email already exists.");
    }
    throw error;
  }

  await db.collection("users").doc(employeeId).set({
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    email,
    phone: application.personal.phone,
    city: application.personal.city,
    zip: application.personal.zip,
    role: "employee",
    serviceArea: serviceAreas,
    payRatePerJob: compensation.residentialFirstBin,
    residentialFirstBinPay: compensation.residentialFirstBin,
    residentialAdditionalBinPay: compensation.residentialAdditionalBin,
    hiringStatus: "active",
    hiredDate: now,
    hiredBy: params.actorId,
    binBlasterApplicationId: application.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("employeeApplications").add({
    employeeId,
    applicationDate: now,
    status: "approved",
    source: "bin_blaster_application",
    binBlasterApplicationId: application.id,
  });

  await db.collection(COLLECTION).doc(application.id).set(
    {
      employeeId,
      status: "employee_account_created",
      assignedServiceAreas: serviceAreas,
      compensation,
      employeeAccountCreatedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await sendBinBlasterEmployeeInviteEmail({
    email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    tempPassword,
    serviceAreas,
    residentialFirstBin: compensation.residentialFirstBin,
    residentialAdditionalBin: compensation.residentialAdditionalBin,
  });

  await logAdminAction("create_employee_from_bin_blaster_application", params.actorId, {
    applicationId: application.id,
    employeeId,
    email,
  });

  const updated = await getBinBlasterApplicationById(application.id);
  if (!updated) {
    throw new Error("Failed to load updated application.");
  }

  return { application: updated, employeeId };
}
