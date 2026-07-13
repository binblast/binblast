// app/api/operator/employees/[employeeId]/proof/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString, parseFirestoreTimestamp } from "@/lib/employee-utils";
import { formatCleaningDateForStorage, parseCleaningDate } from "@/lib/cleaning-schedule";
import { getJobPhotos } from "@/lib/job-photo-upload";

export const dynamic = "force-dynamic";

function isCompletedCleaning(data: Record<string, unknown>): boolean {
  return data.status === "completed" || data.jobStatus === "completed";
}

function serializeTimestamp(value: unknown): string | null {
  const date = parseFirestoreTimestamp(value);
  return date ? date.toISOString() : null;
}

function serializeScheduledDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return value.split("T")[0];
  }
  try {
    return formatCleaningDateForStorage(parseCleaningDate(value));
  } catch {
    return null;
  }
}

function isValidPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

async function buildProofRecord(
  cleaningId: string,
  data: Record<string, unknown>,
  includePhotos = true
) {
  const photos = includePhotos ? await getJobPhotos(cleaningId) : [];
  const serializedPhotos = photos.map((photo) => ({
    id: photo.id,
    photoType: photo.photoType,
    storageUrl: photo.storageUrl,
    timestamp: photo.timestamp.toISOString(),
    gpsCoordinates: photo.gpsCoordinates || null,
  }));

  const previewPhotoUrl =
    serializedPhotos.find((photo) => photo.photoType === "inside")?.storageUrl ||
    serializedPhotos.find((photo) => photo.photoType === "outside")?.storageUrl ||
    serializedPhotos[0]?.storageUrl ||
    (isValidPhotoUrl(data.insidePhotoUrl as string) ? (data.insidePhotoUrl as string) : null) ||
    (isValidPhotoUrl(data.outsidePhotoUrl as string) ? (data.outsidePhotoUrl as string) : null) ||
    (isValidPhotoUrl(data.completionPhotoUrl as string) ? (data.completionPhotoUrl as string) : null);

  return {
    cleaningId,
    completionPhotoUrl: isValidPhotoUrl(data.completionPhotoUrl as string)
      ? (data.completionPhotoUrl as string)
      : null,
    insidePhotoUrl: isValidPhotoUrl(data.insidePhotoUrl as string)
      ? (data.insidePhotoUrl as string)
      : null,
    outsidePhotoUrl: isValidPhotoUrl(data.outsidePhotoUrl as string)
      ? (data.outsidePhotoUrl as string)
      : null,
    previewPhotoUrl,
    photos: serializedPhotos,
    photoCount: serializedPhotos.length,
    employeeNotes: (data.employeeNotes as string) || null,
    operatorNotes: (data.operatorNotes as string) || null,
    flags: Array.isArray(data.flags) ? data.flags : [],
    completedAt: serializeTimestamp(data.completedAt || data.operatorResolvedAt),
    scheduledDate: serializeScheduledDate(data.scheduledDate),
    scheduledTime: (data.scheduledTime as string) || null,
    customerName: (data.customerName as string) || (data.userEmail as string) || null,
    addressLine1: (data.addressLine1 as string) || null,
    addressLine2: (data.addressLine2 as string) || null,
    city: (data.city as string) || null,
    state: (data.state as string) || null,
    zipCode: (data.zipCode as string) || null,
    status: (data.status as string) || (data.jobStatus as string) || null,
    operatorSkipPhotos: data.operatorSkipPhotos === true,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const searchParams = req.nextUrl.searchParams;
    const cleaningId = searchParams.get("cleaningId");
    const todayOnly = searchParams.get("todayOnly") !== "0";

    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getAdminFirestore();

    if (cleaningId) {
      const cleaningSnap = await db.collection("scheduledCleanings").doc(cleaningId).get();

      if (!cleaningSnap.exists) {
        return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
      }

      const proof = await buildProofRecord(cleaningId, cleaningSnap.data() || {});
      return NextResponse.json({ proof });
    }

    const today = getTodayDateString();
    const snapshot = await db
      .collection("scheduledCleanings")
      .where("assignedEmployeeId", "==", employeeId)
      .get();

    const proofCandidates = snapshot.docs
      .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      }))
      .filter(({ data }: { data: Record<string, unknown> }) => isCompletedCleaning(data))
      .filter(({ data }: { data: Record<string, unknown> }) => {
        const scheduledDate = serializeScheduledDate(data.scheduledDate);
        return todayOnly ? scheduledDate === today : true;
      })
      .sort(
        (
          a: { data: Record<string, unknown> },
          b: { data: Record<string, unknown> }
        ) => {
          const aTime =
            parseFirestoreTimestamp(a.data.completedAt || a.data.operatorResolvedAt)?.getTime() || 0;
          const bTime =
            parseFirestoreTimestamp(b.data.completedAt || b.data.operatorResolvedAt)?.getTime() || 0;
          return bTime - aTime;
        }
      );

    const proofs = await Promise.all(
      proofCandidates.map(({ id, data }: { id: string; data: Record<string, unknown> }) =>
        buildProofRecord(id, data)
      )
    );

    return NextResponse.json({ proofs });
  } catch (error: unknown) {
    console.error("Error getting proof:", error);
    const message = error instanceof Error ? error.message : "Failed to get proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { cleaningId, photoUrl, note, isOperatorOverride } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
        { status: 400 }
      );
    }

    if (!photoUrl && !isOperatorOverride) {
      return NextResponse.json(
        { error: "Photo is required unless operator override is provided" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const cleaningRef = db.collection("scheduledCleanings").doc(cleaningId);
    const cleaningSnap = await cleaningRef.get();

    if (!cleaningSnap.exists) {
      return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (photoUrl && isValidPhotoUrl(photoUrl)) {
      updateData.completionPhotoUrl = photoUrl;
    }

    if (note) {
      if (isOperatorOverride) {
        updateData.operatorNotes = note;
        updateData.proofOperatorOverride = true;
      } else {
        updateData.employeeNotes = note;
      }
    }

    await cleaningRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Proof uploaded successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading proof:", error);
    const message = error instanceof Error ? error.message : "Failed to upload proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
