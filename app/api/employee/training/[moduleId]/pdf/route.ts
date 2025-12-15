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
    const generateStyled = searchParams.get("generateStyled") === "true";

    const module = getModuleById(moduleId);
    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // If generateStyled is requested, redirect to PDF generation endpoint
    if (generateStyled) {
      const baseUrl = req.nextUrl.origin;
      return NextResponse.json({
        moduleId,
        pdfUrl: `${baseUrl}/api/training/modules/${moduleId}/generate-pdf`,
        pdfFileName: module.pdfFileName || `${moduleId}.pdf`,
        generated: true,
      });
    }

    // Return PDF URL - can be:
    // 1. module.pdfUrl (if set in training-modules.ts) - e.g., Firebase Storage URL
    // 2. Relative path to public folder: /training-modules/${moduleId}/${pdfFileName}
    // 3. Generated styled PDF URL (optional fallback)
    // Note: If PDFs are stored in Firebase Storage, update module.pdfUrl in training-modules.ts
    // If PDFs are in public/training-modules/, ensure the files exist at that path
    const pdfUrl = module.pdfUrl || `/training-modules/${moduleId}/${module.pdfFileName || `${moduleId}.pdf`}`;
    
    // Optionally include styled PDF URL as fallback
    const baseUrl = req.nextUrl.origin;
    const styledPdfUrl = `${baseUrl}/api/training/modules/${moduleId}/generate-pdf`;

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
      styledPdfUrl, // Optional styled PDF URL for fallback
    });
  } catch (error: any) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}

