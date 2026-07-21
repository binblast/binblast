import { NextRequest, NextResponse } from "next/server";
import { createBinBlasterApplication } from "@/lib/bin-blaster-server";
import { validateBinBlasterForm } from "@/lib/bin-blaster-application";
import type { BinBlasterApplicationFormData } from "@/lib/bin-blaster-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BinBlasterApplicationFormData;
    const validationError = validateBinBlasterForm(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const application = await createBinBlasterApplication(body);

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: "Application received.",
    });
  } catch (error: unknown) {
    console.error("[Bin Blaster Applications POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit application. Please try again.";
    const status = message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
