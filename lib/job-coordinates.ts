import { getAdminFirestore } from "@/lib/firebase-admin";
import { geocodeStopServer } from "@/lib/geocoding-server";
import { hasStopCoordinates } from "@/lib/stop-coordinates";

type JobRecord = Record<string, unknown> & {
  id?: string;
  userId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
};

export async function enrichJobRecordWithCoordinates(job: JobRecord): Promise<JobRecord> {
  if (hasStopCoordinates(job)) {
    return job;
  }

  try {
    const db = await getAdminFirestore();
    const userId = String(job.userId || "");

    if (userId) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as { latitude?: number; longitude?: number };
        if (typeof userData.latitude === "number" && typeof userData.longitude === "number") {
          return {
            ...job,
            latitude: userData.latitude,
            longitude: userData.longitude,
            geocodePrecision: "exact",
          };
        }
      }
    }

    const result = await geocodeStopServer({
      addressLine1: String(job.addressLine1 || ""),
      addressLine2: job.addressLine2 ? String(job.addressLine2) : undefined,
      city: String(job.city || ""),
      state: String(job.state || ""),
      zipCode: String(job.zipCode || ""),
    });

    if (!result) {
      return job;
    }

    if (job.id) {
      try {
        await db.collection("scheduledCleanings").doc(String(job.id)).update({
          latitude: result.latitude,
          longitude: result.longitude,
          geocodePrecision: result.precision,
        });
      } catch (persistError) {
        console.warn(`[Jobs] Could not persist coordinates for ${job.id}:`, persistError);
      }
    }

    return {
      ...job,
      latitude: result.latitude,
      longitude: result.longitude,
      geocodePrecision: result.precision,
    };
  } catch (error) {
    console.warn("[Jobs] Coordinate enrichment skipped:", error);
    return job;
  }
}

export async function enrichJobsWithCoordinates<T extends JobRecord>(jobs: T[]): Promise<T[]> {
  const enriched: T[] = [];

  for (const job of jobs) {
    enriched.push((await enrichJobRecordWithCoordinates(job)) as T);
  }

  return enriched;
}
