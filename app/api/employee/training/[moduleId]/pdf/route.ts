// app/api/employee/training/[moduleId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
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

    // Return a PDF URL only when a real hosted URL is configured.
    // Markdown is the source of truth until PDFs are uploaded to Firebase Storage.
    const pdfUrl = module.pdfUrl || "";
    
    // Optionally include styled PDF URL as fallback
    const baseUrl = req.nextUrl.origin;
    const styledPdfUrl = `${baseUrl}/api/training/modules/${moduleId}/generate-pdf`;

    // Mark as viewed if requested
    if (markViewed && employeeId) {
      try {
        const db = await getAdminFirestore();
        const admin = await import("firebase-admin");
        const snapshot = await db
          .collection("employeeTraining")
          .where("employeeId", "==", employeeId)
          .where("moduleId", "==", moduleId)
          .get();

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            pdfViewed: true,
            pdfViewedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await db.collection("employeeTraining").add({
            employeeId,
            moduleId,
            moduleName: module.name,
            pdfViewed: true,
            pdfViewedAt: admin.firestore.FieldValue.serverTimestamp(),
            completed: false,
            progress: 0,
            certificationStatus: "in_progress",
          });
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

