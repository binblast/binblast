// app/api/admin/training/verify-pdfs/route.ts
// API route to verify all module PDFs

import { NextRequest, NextResponse } from "next/server";
import { verifyModulePDFs } from "@/lib/training-verification";

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/training/verify-pdfs
 * Verify all active modules have valid PDF URLs
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin/operator

    const results = await verifyModulePDFs();

    const summary = {
      total: results.length,
      valid: results.filter((r) => r.isValid).length,
      invalid: results.filter((r) => !r.isValid).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error: any) {
    console.error("[Admin Training API] Error verifying PDFs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify PDFs" },
      { status: 500 }
    );
  }
}
