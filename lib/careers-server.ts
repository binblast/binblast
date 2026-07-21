import { getAdminFirestore } from "@/lib/firebase-admin";
import type {
  CareerApplicationFormData,
  CareerApplicationRecord,
  CareerApplicationStatus,
  CareerOnboardingChecklists,
  CareerTalentPoolEntry,
} from "@/lib/careers-types";
import { sendCareerStatusEmail } from "@/lib/careers-email";

const APPLICATIONS = "careerApplications";
const TALENT_POOL = "careerTalentPool";

function defaultChecklists(): CareerOnboardingChecklists {
  return {
    training: {
      safetyOrientation: false,
      equipmentTraining: false,
      photoDocumentation: false,
      routeProcedures: false,
    },
    uniform: {
      brandedShirt: false,
      safetyGear: false,
    },
    equipment: {
      phoneSetup: false,
      routeSupplies: false,
      vehicleInspection: false,
    },
  };
}

export async function findActiveApplicationByEmail(
  email: string
): Promise<CareerApplicationRecord | null> {
  const db = await getAdminFirestore();
  const normalized = email.trim().toLowerCase();
  const snapshot = await db
    .collection(APPLICATIONS)
    .where("personal.email", "==", normalized)
    .limit(10)
    .get();

  const active = snapshot.docs.find((doc: { data: () => Record<string, unknown> }) => {
    const status = doc.data().status as CareerApplicationStatus;
    return !["not_selected", "withdrawn", "hired"].includes(status);
  });

  if (!active) return null;
  return serializeApplication(active.id, active.data());
}

export async function createCareerApplication(params: {
  form: CareerApplicationFormData;
  applicantId: string;
}): Promise<CareerApplicationRecord> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  const duplicate = await findActiveApplicationByEmail(params.form.personal.email);
  if (duplicate) {
    throw new Error("An active application already exists for this email.");
  }

  const docRef = db.collection(APPLICATIONS).doc();
  const payload = {
    ...params.form,
    personal: {
      ...params.form.personal,
      email: params.form.personal.email.trim().toLowerCase(),
      password: undefined,
      confirmPassword: undefined,
    },
    applicantId: params.applicantId,
    status: "application_received" as CareerApplicationStatus,
    assignedRecruiterId: null,
    assignedRecruiterName: null,
    adminNotes: [],
    interviewScheduledAt: null,
    submittedAt: now,
    updatedAt: now,
    withdrawnAt: null,
    hiredAt: null,
    source: "careers_funnel",
  };

  await docRef.set(payload);

  await db.collection("users").doc(params.applicantId).set(
    {
      firstName: params.form.personal.firstName,
      lastName: params.form.personal.lastName,
      email: params.form.personal.email.trim().toLowerCase(),
      phone: params.form.personal.phone,
      city: params.form.personal.city,
      state: params.form.personal.state,
      zip: params.form.personal.zip,
      role: "career_applicant",
      hiringStatus: "pending_approval",
      careerApplicationId: docRef.id,
      updatedAt: now,
    },
    { merge: true }
  );

  const record = await getCareerApplicationById(docRef.id);
  if (record) {
    await sendCareerStatusEmail(record, "application_received");
  }

  if (params.form.joinTalentPool) {
    await addTalentPoolEntry({
      firstName: params.form.personal.firstName,
      lastName: params.form.personal.lastName,
      email: params.form.personal.email,
      phone: params.form.personal.phone,
      city: params.form.personal.city,
      state: params.form.personal.state,
      zip: params.form.personal.zip,
      skills: params.form.experience.experienceTags,
      desiredPosition: params.form.talentPoolDesiredRole || params.form.positionTitle,
      availability: JSON.stringify(params.form.availability),
      yearsExperience: params.form.experience.yearsWorked,
    });
  }

  return record!;
}

export async function getCareerApplicationById(id: string): Promise<CareerApplicationRecord | null> {
  const db = await getAdminFirestore();
  const doc = await db.collection(APPLICATIONS).doc(id).get();
  if (!doc.exists) return null;
  return serializeApplication(doc.id, doc.data() || {});
}

export async function getCareerApplicationForApplicant(
  applicantId: string
): Promise<CareerApplicationRecord | null> {
  const db = await getAdminFirestore();
  const snapshot = await db
    .collection(APPLICATIONS)
    .where("applicantId", "==", applicantId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return serializeApplication(doc.id, doc.data());
}

export async function updateApplicantContact(params: {
  applicationId: string;
  applicantId: string;
  phone?: string;
  email?: string;
}): Promise<CareerApplicationRecord | null> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const docRef = db.collection(APPLICATIONS).doc(params.applicationId);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const data = doc.data() || {};
  if (data.applicantId !== params.applicantId) return null;

  const updates: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (params.phone) updates["personal.phone"] = params.phone;
  if (params.email) updates["personal.email"] = params.email.trim().toLowerCase();

  await docRef.set(updates, { merge: true });
  await db.collection("users").doc(params.applicantId).set(
    {
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.email ? { email: params.email.trim().toLowerCase() } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getCareerApplicationById(params.applicationId);
}

export async function withdrawCareerApplication(params: {
  applicationId: string;
  applicantId: string;
}): Promise<CareerApplicationRecord | null> {
  return updateCareerApplicationStatus({
    applicationId: params.applicationId,
    status: "withdrawn",
    actorId: params.applicantId,
    actorName: "Applicant",
  });
}

export async function listCareerApplications(filters?: {
  status?: CareerApplicationStatus;
  search?: string;
}): Promise<CareerApplicationRecord[]> {
  const db = await getAdminFirestore();
  let query = db.collection(APPLICATIONS).orderBy("submittedAt", "desc");

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.limit(200).get();
  let records: CareerApplicationRecord[] = snapshot.docs.map(
    (doc: { id: string; data: () => Record<string, unknown> }) =>
      serializeApplication(doc.id, doc.data())
  );

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    records = records.filter((record) => {
      const haystack = [
        record.personal.firstName,
        record.personal.lastName,
        record.personal.email,
        record.personal.phone,
        record.positionTitle,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return records;
}

export async function updateCareerApplicationStatus(params: {
  applicationId: string;
  status: CareerApplicationStatus;
  actorId: string;
  actorName?: string;
  adminNote?: string;
  assignedRecruiterId?: string | null;
  assignedRecruiterName?: string | null;
  interviewScheduledAt?: string | null;
}): Promise<CareerApplicationRecord | null> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const docRef = db.collection(APPLICATIONS).doc(params.applicationId);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const existingNotes = Array.isArray(doc.data()?.adminNotes) ? doc.data()?.adminNotes : [];
  const updates: Record<string, unknown> = {
    status: params.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (params.adminNote) {
    updates.adminNotes = [
      ...existingNotes,
      {
        text: params.adminNote,
        createdAt: new Date().toISOString(),
        createdBy: params.actorName || params.actorId,
      },
    ];
  }

  if (params.assignedRecruiterId !== undefined) {
    updates.assignedRecruiterId = params.assignedRecruiterId;
  }
  if (params.assignedRecruiterName !== undefined) {
    updates.assignedRecruiterName = params.assignedRecruiterName;
  }
  if (params.interviewScheduledAt !== undefined) {
    updates.interviewScheduledAt = params.interviewScheduledAt;
  }
  if (params.status === "withdrawn") {
    updates.withdrawnAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (params.status === "hired") {
    updates.hiredAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await docRef.set(updates, { merge: true });
  const record = await getCareerApplicationById(params.applicationId);

  if (record && params.status !== "under_review") {
    await sendCareerStatusEmail(record, params.status);
  }

  if (record && params.status === "hired") {
    await convertApplicantToEmployee(record, params.actorId);
  }

  return record;
}

export async function convertApplicantToEmployee(
  application: CareerApplicationRecord,
  hiredBy: string
): Promise<void> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("users").doc(application.applicantId).set(
    {
      role: "employee",
      hiringStatus: "approved",
      hiredDate: now,
      hiredBy,
      payRatePerJob: 8,
      serviceArea: [],
      onboardingChecklists: defaultChecklists(),
      payrollProfilePlaceholder: {
        status: "pending_setup",
        createdAt: now,
      },
      routeTechnicianProfile: {
        status: "training",
        positionId: application.positionId,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("employeeApplications").add({
    employeeId: application.applicantId,
    careerApplicationId: application.id,
    applicationDate: now,
    status: "approved",
    reviewedBy: hiredBy,
    reviewedAt: now,
    notes: "Converted from careers funnel",
  });
}

export async function addTalentPoolEntry(
  entry: Omit<CareerTalentPoolEntry, "id" | "createdAt">
): Promise<string> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const docRef = await db.collection(TALENT_POOL).add({
    ...entry,
    email: entry.email.trim().toLowerCase(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

function serializeApplication(id: string, data: Record<string, unknown>): CareerApplicationRecord {
  return {
    id,
    applicantId: String(data.applicantId || ""),
    positionId: String(data.positionId || ""),
    positionTitle: String(data.positionTitle || ""),
    personal: (data.personal || {}) as CareerApplicationRecord["personal"],
    eligibility: (data.eligibility || {}) as CareerApplicationRecord["eligibility"],
    experience: (data.experience || {}) as CareerApplicationRecord["experience"],
    availability: (data.availability || {}) as CareerApplicationRecord["availability"],
    shortAnswers: (data.shortAnswers || {}) as CareerApplicationRecord["shortAnswers"],
    documents: (data.documents || {}) as CareerApplicationRecord["documents"],
    joinTalentPool: Boolean(data.joinTalentPool),
    talentPoolDesiredRole: String(data.talentPoolDesiredRole || ""),
    status: (data.status as CareerApplicationStatus) || "application_received",
    assignedRecruiterId: (data.assignedRecruiterId as string | null) ?? null,
    assignedRecruiterName: (data.assignedRecruiterName as string | null) ?? null,
    adminNotes: Array.isArray(data.adminNotes) ? (data.adminNotes as CareerApplicationRecord["adminNotes"]) : [],
    interviewScheduledAt: data.interviewScheduledAt
      ? String(data.interviewScheduledAt)
      : null,
    submittedAt: timestampToIso(data.submittedAt),
    updatedAt: timestampToIso(data.updatedAt),
    withdrawnAt: data.withdrawnAt ? timestampToIso(data.withdrawnAt) : null,
    hiredAt: data.hiredAt ? timestampToIso(data.hiredAt) : null,
    source: "careers_funnel",
  };
}

function timestampToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function careerApplicationsToCsv(records: CareerApplicationRecord[]): string {
  const headers = [
    "Application ID",
    "Name",
    "Email",
    "Phone",
    "Position",
    "Status",
    "City",
    "State",
    "Submitted At",
  ];
  const rows = records.map((record) => [
    record.id,
    `${record.personal.firstName} ${record.personal.lastName}`,
    record.personal.email,
    record.personal.phone,
    record.positionTitle,
    record.status,
    record.personal.city,
    record.personal.state,
    record.submittedAt,
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
