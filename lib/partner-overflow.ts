import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { partnerMatchesTerritory, type PartnerRecordForAssignment } from "@/lib/partner-leads";

export const DEFAULT_MAX_JOBS_PER_DAY = 10;
export const OVERFLOW_OFFER_EXPIRY_HOURS = 6;

export type OverflowOfferStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled";

export interface OverflowJobRecord {
  id: string;
  partnerId?: string | null;
  originalPartnerId?: string | null;
  city?: string;
  zipCode?: string;
  scheduledDate?: string;
  assignedEmployeeId?: string | null;
  assignmentType?: string | null;
  customerName?: string;
  addressLine1?: string;
  binsCount?: number;
  jobStatus?: string;
  status?: string;
}

export interface OverflowPartnerRecord extends PartnerRecordForAssignment {
  acceptsOverflow?: boolean;
  maxJobsPerDay?: number;
  businessName?: string;
}

export interface OverflowOfferRecord {
  id: string;
  jobId: string;
  scheduledDate: string;
  city: string;
  zipCode: string;
  customerName: string;
  addressLine1: string;
  binsCount: number;
  originalPartnerId: string | null;
  offeredToPartnerId: string;
  offeredToPartnerName: string;
  status: OverflowOfferStatus;
  createdAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
}

function isActiveJobStatus(status?: string | null, jobStatus?: string | null): boolean {
  const normalized = String(status || jobStatus || "").toLowerCase();
  return !["cancelled", "canceled", "completed", "refunded"].includes(normalized);
}

export function getPartnerMaxJobsPerDay(partner: OverflowPartnerRecord): number {
  const value = Number(partner.maxJobsPerDay);
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_MAX_JOBS_PER_DAY;
}

export function partnerAcceptsOverflow(partner: OverflowPartnerRecord): boolean {
  if (typeof partner.acceptsOverflow === "boolean") {
    return partner.acceptsOverflow;
  }
  return partner.partnerTier === "overflow";
}

export async function countPartnerJobsForDate(
  partnerId: string,
  scheduledDate: string
): Promise<number> {
  const db = await getDbInstance();
  if (!db) return 0;

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs } = firestore;

  const jobsQuery = query(
    collection(db, "scheduledCleanings"),
    where("scheduledDate", "==", scheduledDate),
    where("partnerId", "==", partnerId)
  );
  const snapshot = await getDocs(jobsQuery);

  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    return isActiveJobStatus(data.status, data.jobStatus);
  }).length;
}

export async function isPartnerAtCapacity(
  partner: OverflowPartnerRecord,
  scheduledDate: string
): Promise<boolean> {
  const currentCount = await countPartnerJobsForDate(partner.id, scheduledDate);
  return currentCount >= getPartnerMaxJobsPerDay(partner);
}

export function findEligibleOverflowPartners(
  partners: OverflowPartnerRecord[],
  job: OverflowJobRecord
): OverflowPartnerRecord[] {
  const jobPartnerId = job.partnerId || job.originalPartnerId || null;

  return partners.filter((partner) => {
    if (partner.status !== "active") return false;
    if (!partnerAcceptsOverflow(partner)) return false;
    if (partner.id === jobPartnerId) return false;
    return partnerMatchesTerritory(partner, job.city, job.zipCode);
  });
}

function buildOfferExpiry(scheduledDate: string): Date {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
    ? new Date(`${scheduledDate}T17:00:00`)
    : new Date(Date.now() + OVERFLOW_OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
  const minExpiry = new Date(Date.now() + OVERFLOW_OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
  return base > minExpiry ? base : minExpiry;
}

export async function getPendingOverflowOfferForJob(jobId: string): Promise<boolean> {
  const db = await getDbInstance();
  if (!db) return false;

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs } = firestore;

  const offersQuery = query(
    collection(db, "overflowOffers"),
    where("jobId", "==", jobId),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(offersQuery);
  return !snapshot.empty;
}

export async function createOverflowOffersForJob(jobId: string): Promise<string[]> {
  const db = await getDbInstance();
  if (!db) return [];

  const firestore = await safeImportFirestore();
  const { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } = firestore;

  const jobRef = doc(db, "scheduledCleanings", jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) return [];

  const jobData = jobSnap.data();
  if (jobData.assignedEmployeeId) return [];

  const hasPending = await getPendingOverflowOfferForJob(jobId);
  if (hasPending) return [];

  const job: OverflowJobRecord = {
    id: jobId,
    partnerId: jobData.partnerId || null,
    originalPartnerId: jobData.originalPartnerId || jobData.partnerId || null,
    city: jobData.city || "",
    zipCode: jobData.zipCode || "",
    scheduledDate: jobData.scheduledDate || "",
    customerName: jobData.customerName || jobData.userName || "Customer",
    addressLine1: jobData.addressLine1 || "",
    binsCount: Number(jobData.binsCount || 1),
  };

  if (!job.scheduledDate) return [];

  const partnersSnapshot = await getDocs(
    query(collection(db, "partners"), where("status", "==", "active"))
  );
  const partners = partnersSnapshot.docs.map((partnerDoc) => ({
    id: partnerDoc.id,
    ...(partnerDoc.data() as OverflowPartnerRecord),
  }));

  const eligiblePartners = findEligibleOverflowPartners(partners, job);
  if (eligiblePartners.length === 0) {
    return [];
  }

  const createdOfferIds: string[] = [];
  const expiresAt = buildOfferExpiry(job.scheduledDate);

  for (const partner of eligiblePartners) {
    const atCapacity = await isPartnerAtCapacity(partner, job.scheduledDate);
    if (atCapacity) continue;

    const duplicateQuery = query(
      collection(db, "overflowOffers"),
      where("jobId", "==", jobId),
      where("offeredToPartnerId", "==", partner.id),
      where("status", "==", "pending")
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) continue;

    const offerRef = await addDoc(collection(db, "overflowOffers"), {
      jobId,
      scheduledDate: job.scheduledDate,
      city: job.city || "",
      zipCode: job.zipCode || "",
      customerName: job.customerName || "Customer",
      addressLine1: job.addressLine1 || "",
      binsCount: job.binsCount || 1,
      originalPartnerId: job.originalPartnerId || job.partnerId || null,
      offeredToPartnerId: partner.id,
      offeredToPartnerName: partner.businessName || "Partner",
      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt,
      respondedAt: null,
    });

    createdOfferIds.push(offerRef.id);
  }

  if (createdOfferIds.length > 0) {
    await updateDocSafe(jobRef, {
      overflowStatus: "offered",
      updatedAt: serverTimestamp(),
    });
  }

  return createdOfferIds;
}

async function updateDocSafe(
  ref: { path?: string },
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDbInstance();
  if (!db) return;
  const firestore = await safeImportFirestore();
  const { updateDoc } = firestore;
  await updateDoc(ref as never, data);
}

export async function processUnassignedJobsForOverflow(
  scheduledDate?: string
): Promise<{ processed: number; offersCreated: number }> {
  const db = await getDbInstance();
  if (!db) return { processed: 0, offersCreated: 0 };

  const firestore = await safeImportFirestore();
  const { collection, query, where, getDocs } = firestore;
  const { getTodayDateString } = await import("@/lib/employee-utils");

  const date = scheduledDate || getTodayDateString();
  const jobsQuery = query(
    collection(db, "scheduledCleanings"),
    where("scheduledDate", "==", date)
  );
  const snapshot = await getDocs(jobsQuery);

  let processed = 0;
  let offersCreated = 0;

  for (const jobDoc of snapshot.docs) {
    const data = jobDoc.data();
    if (data.assignedEmployeeId) continue;
    if (!isActiveJobStatus(data.status, data.jobStatus)) continue;

    processed += 1;
    const offerIds = await createOverflowOffersForJob(jobDoc.id);
    offersCreated += offerIds.length;
  }

  return { processed, offersCreated };
}

export async function acceptOverflowOffer(
  offerId: string,
  partnerId: string
): Promise<{ success: boolean; error?: string; jobId?: string }> {
  const db = await getDbInstance();
  if (!db) return { success: false, error: "Database not available" };

  const firestore = await safeImportFirestore();
  const { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } = firestore;

  const offerRef = doc(db, "overflowOffers", offerId);
  const offerSnap = await getDoc(offerRef);
  if (!offerSnap.exists()) {
    return { success: false, error: "Overflow offer not found" };
  }

  const offer = offerSnap.data();
  if (offer.offeredToPartnerId !== partnerId) {
    return { success: false, error: "This offer is not assigned to your partner account" };
  }
  if (offer.status !== "pending") {
    return { success: false, error: "This offer is no longer available" };
  }

  const expiresAt = offer.expiresAt?.toDate?.() || offer.expiresAt;
  if (expiresAt instanceof Date && expiresAt.getTime() < Date.now()) {
    await updateDoc(offerRef, {
      status: "expired",
      respondedAt: serverTimestamp(),
    });
    return { success: false, error: "This overflow offer has expired" };
  }

  const jobRef = doc(db, "scheduledCleanings", offer.jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) {
    return { success: false, error: "Job not found" };
  }

  const jobData = jobSnap.data();
  if (jobData.assignedEmployeeId) {
    return { success: false, error: "This job has already been assigned" };
  }

  const partnerRef = doc(db, "partners", partnerId);
  const partnerSnap = await getDoc(partnerRef);
  if (!partnerSnap.exists()) {
    return { success: false, error: "Partner not found" };
  }

  const partnerData = partnerSnap.data() as OverflowPartnerRecord;
  const atCapacity = await isPartnerAtCapacity(
    { id: partnerId, ...partnerData },
    String(offer.scheduledDate || jobData.scheduledDate || "")
  );
  if (atCapacity) {
    return { success: false, error: "You are at capacity for this date" };
  }

  await updateDoc(jobRef, {
    partnerId,
    originalPartnerId: offer.originalPartnerId || jobData.partnerId || null,
    assignmentType: "overflow",
    overflowOfferId: offerId,
    overflowAcceptedAt: serverTimestamp(),
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    overflowStatus: "accepted",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(offerRef, {
    status: "accepted",
    respondedAt: serverTimestamp(),
  });

  const siblingOffersQuery = query(
    collection(db, "overflowOffers"),
    where("jobId", "==", offer.jobId),
    where("status", "==", "pending")
  );
  const siblingOffers = await getDocs(siblingOffersQuery);
  await Promise.all(
    siblingOffers.docs
      .filter((docSnap) => docSnap.id !== offerId)
      .map((docSnap) =>
        updateDoc(docSnap.ref, {
          status: "cancelled",
          respondedAt: serverTimestamp(),
        })
      )
  );

  return { success: true, jobId: offer.jobId };
}

export async function declineOverflowOffer(
  offerId: string,
  partnerId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDbInstance();
  if (!db) return { success: false, error: "Database not available" };

  const firestore = await safeImportFirestore();
  const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

  const offerRef = doc(db, "overflowOffers", offerId);
  const offerSnap = await getDoc(offerRef);
  if (!offerSnap.exists()) {
    return { success: false, error: "Overflow offer not found" };
  }

  const offer = offerSnap.data();
  if (offer.offeredToPartnerId !== partnerId) {
    return { success: false, error: "This offer is not assigned to your partner account" };
  }
  if (offer.status !== "pending") {
    return { success: false, error: "This offer is no longer pending" };
  }

  await updateDoc(offerRef, {
    status: "declined",
    respondedAt: serverTimestamp(),
  });

  return { success: true };
}

export function serializeOverflowOffer(
  data: Record<string, unknown>,
  id: string
): OverflowOfferRecord {
  const serializeTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && value !== null && "toDate" in value) {
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      if (maybeDate instanceof Date) return maybeDate.toISOString();
    }
    return null;
  };

  return {
    id,
    jobId: String(data.jobId || ""),
    scheduledDate: String(data.scheduledDate || ""),
    city: String(data.city || ""),
    zipCode: String(data.zipCode || ""),
    customerName: String(data.customerName || "Customer"),
    addressLine1: String(data.addressLine1 || ""),
    binsCount: Number(data.binsCount || 1),
    originalPartnerId: data.originalPartnerId ? String(data.originalPartnerId) : null,
    offeredToPartnerId: String(data.offeredToPartnerId || ""),
    offeredToPartnerName: String(data.offeredToPartnerName || "Partner"),
    status: String(data.status || "pending") as OverflowOfferStatus,
    createdAt: serializeTimestamp(data.createdAt),
    expiresAt: serializeTimestamp(data.expiresAt),
    respondedAt: serializeTimestamp(data.respondedAt),
  };
}
