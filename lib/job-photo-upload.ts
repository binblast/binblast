// lib/job-photo-upload.ts
// Utility functions for uploading job photos to Firebase Storage and managing photo metadata

import { getStorageInstance } from "./firebase-client";
import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

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

/**
 * Extract GPS coordinates from image EXIF data (client-side only)
 * Note: This requires browser APIs and won't work server-side
 */
export async function extractGPSFromImage(file: File): Promise<GPSCoordinates | null> {
  // This would require a library like exif-js or piexifjs
  // For now, return null - GPS will be captured via browser geolocation API
  return null;
}

/**
 * Upload a job photo to Firebase Storage and create metadata document
 * @param jobId - The job ID
 * @param photoType - Type of photo (inside, outside, etc.)
 * @param file - Photo file to upload
 * @param employeeId - Employee ID uploading the photo
 * @param jobData - Job data containing customer info and address
 * @param gpsCoordinates - Optional GPS coordinates
 * @returns Upload result with photo ID and storage URL
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
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return {
        success: false,
        error: "File must be an image",
      };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: "Image must be less than 5MB",
      };
    }

    const storage = await getStorageInstance();
    if (!storage) {
      return {
        success: false,
        error: "Firebase Storage is not available",
      };
    }

    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

    // Create storage path: job-photos/{jobId}/{photoType}/{timestamp}-{randomId}.jpg
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const storagePath = `job-photos/${jobId}/${photoType}/${timestamp}-${randomId}.${fileExtension}`;

    const storageRef = ref(storage, storagePath);

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, fileBuffer, {
      contentType: file.type,
    });

    // Get download URL
    const storageUrl = await getDownloadURL(storageRef);

    // Get image dimensions if possible (would need canvas API on client-side)
    const metadata: PhotoMetadata = {
      fileSize: file.size,
      mimeType: file.type,
    };

    // Create photo metadata document in Firestore
    const db = await getDbInstance();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
      };
    }

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp } = firestore;

    const photoData: Omit<JobPhoto, "id" | "timestamp"> & { timestamp: any } = {
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
      timestamp: serverTimestamp(),
      metadata,
    };

    if (gpsCoordinates) {
      photoData.gpsCoordinates = gpsCoordinates;
    }

    const photosRef = collection(db, "jobPhotos");
    const photoDocRef = await addDoc(photosRef, photoData);

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
 * @param jobId - The job ID
 * @returns Array of job photos
 */
export async function getJobPhotos(jobId: string): Promise<JobPhoto[]> {
  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    const photosRef = collection(db, "jobPhotos");
    const photosQuery = query(
      photosRef,
      where("jobId", "==", jobId),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(photosQuery);
    const photos: JobPhoto[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      photos.push({
        id: doc.id,
        jobId: data.jobId,
        customerId: data.customerId,
        employeeId: data.employeeId,
        address: data.address,
        photoType: data.photoType,
        storageUrl: data.storageUrl,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        gpsCoordinates: data.gpsCoordinates,
        metadata: data.metadata,
      });
    });

    return photos;
  } catch (error: any) {
    console.error("[Job Photo Upload] Error getting job photos:", error);
    throw error;
  }
}

/**
 * Delete a job photo (operators/admins only)
 * @param photoId - The photo document ID
 * @returns Success status
 */
export async function deleteJobPhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDbInstance();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
      };
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, deleteDoc } = firestore;

    // Get photo document to retrieve storage URL
    const photoRef = doc(db, "jobPhotos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      return {
        success: false,
        error: "Photo not found",
      };
    }

    const photoData = photoDoc.data();
    const storageUrl = photoData.storageUrl;

    // Delete from Firebase Storage
    if (storageUrl) {
      try {
        const storage = await getStorageInstance();
        if (storage) {
          const { ref, deleteObject } = await import("firebase/storage");
          // Extract path from URL
          const urlParts = storageUrl.split("/job-photos/");
          if (urlParts.length > 1) {
            const storagePath = `job-photos/${urlParts[1].split("?")[0]}`;
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
          }
        }
      } catch (storageError: any) {
        console.error("[Job Photo Upload] Error deleting from storage:", storageError);
        // Continue to delete Firestore document even if storage delete fails
      }
    }

    // Delete Firestore document
    await deleteDoc(photoRef);

    return { success: true };
  } catch (error: any) {
    console.error("[Job Photo Upload] Error deleting photo:", error);
    return {
      success: false,
      error: error.message || "Failed to delete photo",
    };
  }
}
