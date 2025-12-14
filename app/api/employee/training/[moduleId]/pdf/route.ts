// app/api/employee/training/[moduleId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getModuleById } from "@/lib/training-modules";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const markViewed = searchParams.get("markViewed") === "true";

    const module = getModuleById(moduleId);
    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // For now, return a placeholder URL. In production, this would be a Firebase Storage URL
    const pdfUrl = module.pdfUrl || `/training-modules/${moduleId}/${module.pdfFileName || `${moduleId}.pdf`}`;

    // Mark as viewed if requested
    if (markViewed && employeeId) {
      try {
        const db = await getDbInstance();
        if (db) {
          const firestore = await safeImportFirestore();
          const { collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } = firestore;

          const trainingRef = collection(db, "employeeTraining");
          const trainingQuery = query(
            trainingRef,
            where("employeeId", "==", employeeId),
            where("moduleId", "==", moduleId)
          );
          const snapshot = await getDocs(trainingQuery);

          if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            await updateDoc(docRef, {
              pdfViewed: true,
              pdfViewedAt: serverTimestamp(),
            });
          } else {
            await addDoc(trainingRef, {
              employeeId,
              moduleId,
              moduleName: module.name,
              pdfViewed: true,
              pdfViewedAt: serverTimestamp(),
              completed: false,
              progress: 0,
              certificationStatus: "in_progress",
            });
          }
        }
      } catch (error) {
        console.error("Error marking PDF as viewed:", error);
        // Don't fail the request if marking as viewed fails
      }
    }

    return NextResponse.json({
      moduleId,
      pdfUrl,
      pdfFileName: module.pdfFileName || `${moduleId}.pdf`,
    });
  } catch (error: any) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}

