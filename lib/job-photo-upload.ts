// lib/job-photo-upload.ts
// Utility functions for uploading job photos to Firebase Storage and managing photo metadata

import { randomUUID } from "crypto";
import { getStorageInstance } from "./firebase-client";
import { getAdminFirestore, getAdminStorageBucket } from "./firebase-admin";

export interface PhotoMetadata {
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  customerId: string;
  employeeId: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  photoType: "inside" | "outside" | "dumpster_pad" | "sticker_placement";
  storageUrl: string;
  timestamp: Date;
  gpsCoordinates?: GPSCoordinates;
  metadata?: PhotoMetadata;
}

export interface UploadPhotoResult {
  success: boolean;
  photoId?: string;
  storageUrl?: string;
  error?: string;
}

function buildFirebaseDownloadUrl(bucketName: string, storagePath: string, token: string): string {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

async function uploadBufferToStorage(
  storagePath: string,
  fileBuffer: Uint8Array,
  contentType: string
): Promise<string> {
  const bucket = await getAdminStorageBucket();
  const downloadToken = randomUUID();

  await bucket.file(storagePath).save(Buffer.from(fileBuffer), {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return buildFirebaseDownloadUrl(bucket.name, storagePath, downloadToken);
}

async function deleteStorageObject(storagePath: string): Promise<void> {
  const bucket = await getAdminStorageBucket();
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

/**
 * Extract GPS coordinates from image EXIF data (client-side only)
 * Note: This requires browser APIs and won't work server-side
 */
export async function extractGPSFromImage(file: File): Promise<GPSCoordinates | null> {
  return null;
}

/**
 * Upload a job photo to Firebase Storage and create metadata document
 */
export async function uploadJobPhoto(
  jobId: string,
  photoType: "inside" | "outside" | "dumpster_pad" | "sticker_placement",
  file: File,
  employeeId: string,
  jobData: {
    customerId?: string;
    userId?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
  },
  gpsCoordinates?: GPSCoordinates
): Promise<UploadPhotoResult> {
  try {
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be less than 5MB" };
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const storagePath = `job-photos/${jobId}/${photoType}/${timestamp}-${randomId}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    let storageUrl: string;

    if (typeof window === "undefined") {
      storageUrl = await uploadBufferToStorage(storagePath, fileBuffer, file.type);
    } else {
      const storage = await getStorageInstance();
      if (!storage) {
        return { success: false, error: "Firebase Storage is not available" };
      }

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, fileBuffer, { contentType: file.type });
      storageUrl = await getDownloadURL(storageRef);
    }

    const metadata: PhotoMetadata = {
      fileSize: file.size,
      mimeType: file.type,
    };

    const photoData: Record<string, unknown> = {
      jobId,
      customerId: jobData.customerId || jobData.userId || "",
      employeeId,
      address: {
        line1: jobData.addressLine1,
        line2: jobData.addressLine2,
        city: jobData.city,
        state: jobData.state,
        zipCode: jobData.zipCode,
      },
      photoType,
      storageUrl,
      timestamp: new Date(),
      metadata,
    };

    if (gpsCoordinates) {
      photoData.gpsCoordinates = gpsCoordinates;
    }

    const db = await getAdminFirestore();
    const photoDocRef = await db.collection("jobPhotos").add(photoData);

    return {
      success: true,
      photoId: photoDocRef.id,
      storageUrl,
    };
  } catch (error: any) {
    console.error("[Job Photo Upload] Error uploading photo:", error);
    return {
      success: false,
      error: error.message || "Failed to upload photo",
    };
  }
}

/**
 * Get all photos for a job
 */
export async function getJobPhotos(jobId: string): Promise<JobPhoto[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db
      .collection("jobPhotos")
      .where("jobId", "==", jobId)
      .get();

    const photos: JobPhoto[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : new Date(data.timestamp || Date.now());

      return {
        id: doc.id,
        jobId: data.jobId,
        customerId: data.customerId,
        employeeId: data.employeeId,
        address: data.address,
        photoType: data.photoType,
        storageUrl: data.storageUrl,
        timestamp,
        gpsCoordinates: data.gpsCoordinates,
        metadata: data.metadata,
      };
    });

    photos.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return photos;
  } catch (error: any) {
    console.error("[Job Photo Upload] Error getting job photos:", error);
    throw error;
  }
}

/**
 * Delete a job photo (operators/admins only)
 */
export async function deleteJobPhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getAdminFirestore();
    const photoRef = db.collection("jobPhotos").doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      return { success: false, error: "Photo not found" };
    }

    const photoData = photoDoc.data();
    const storageUrl = photoData?.storageUrl as string | undefined;

    if (storageUrl) {
      try {
        const urlParts = storageUrl.split("/job-photos/");
        if (urlParts.length > 1) {
          const storagePath = `job-photos/${urlParts[1].split("?")[0]}`;
          if (typeof window === "undefined") {
            await deleteStorageObject(storagePath);
          } else {
            const storage = await getStorageInstance();
            if (storage) {
              const { ref, deleteObject } = await import("firebase/storage");
              const storageRef = ref(storage, storagePath);
              await deleteObject(storageRef);
            }
          }
        }
      } catch (storageError: any) {
        console.error("[Job Photo Upload] Error deleting from storage:", storageError);
      }
    }

    await photoRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error("[Job Photo Upload] Error deleting photo:", error);
    return {
      success: false,
      error: error.message || "Failed to delete photo",
    };
  }
}
