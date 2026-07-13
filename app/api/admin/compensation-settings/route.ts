import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import {
  buildCompensationPreview,
  buildCommercialCompensationPreview,
  COMPENSATION_PAY_MODELS,
  DEFAULT_COMPENSATION_SETTINGS,
  loadCompensationSettings,
  mergeCompensationSettings,
  saveCompensationSettings,
  type CompensationSettings,
} from "@/lib/employee-compensation";

export const dynamic = "force-dynamic";

function sanitizeSettingsInput(input: unknown): { settings: CompensationSettings; error?: string } {
  if (!input || typeof input !== "object") {
    return { settings: DEFAULT_COMPENSATION_SETTINGS, error: "Invalid compensation payload" };
  }

  const raw = (input as { settings?: unknown }).settings ?? input;
  if (!raw || typeof raw !== "object") {
    return { settings: DEFAULT_COMPENSATION_SETTINGS, error: "Settings object is required" };
  }

  const settings = mergeCompensationSettings(raw as Partial<CompensationSettings>);

  if (settings.residentialFirstBinPay <= 0) {
    return { settings, error: "Residential first bin pay must be greater than 0" };
  }

  if (settings.residentialAdditionalBinPay < 0) {
    return { settings, error: "Residential additional bin pay cannot be negative" };
  }

  if (settings.commercialFirstContainerPay <= 0) {
    return { settings, error: "Commercial first container pay must be greater than 0" };
  }

  if (settings.commercialAdditionalContainerPay < 0) {
    return { settings, error: "Commercial additional container pay cannot be negative" };
  }

  return { settings };
}

export async function GET() {
  try {
    const settings = await loadCompensationSettings();
    const preview = buildCompensationPreview(settings);
    const commercialPreview = buildCommercialCompensationPreview(settings);

    return NextResponse.json({
      success: true,
      settings,
      preview,
      commercialPreview,
      payModels: COMPENSATION_PAY_MODELS,
      defaults: DEFAULT_COMPENSATION_SETTINGS,
    });
  } catch (error: unknown) {
    console.error("[Admin Compensation Settings GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load compensation settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { settings, error } = sanitizeSettingsInput(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const savedSettings = await saveCompensationSettings(settings, userId || "owner");
    const preview = buildCompensationPreview(savedSettings);
    const commercialPreview = buildCommercialCompensationPreview(savedSettings);

    await logAdminAction("update_compensation_settings", userId || "owner", {
      payModel: savedSettings.payModel,
      residentialFirstBinPay: savedSettings.residentialFirstBinPay,
      residentialAdditionalBinPay: savedSettings.residentialAdditionalBinPay,
      commercialFirstContainerPay: savedSettings.commercialFirstContainerPay,
      commercialAdditionalContainerPay: savedSettings.commercialAdditionalContainerPay,
    });

    return NextResponse.json({
      success: true,
      settings: savedSettings,
      preview,
      commercialPreview,
      message:
        "Employee compensation updated. New rates apply to future completed jobs immediately.",
    });
  } catch (error: unknown) {
    console.error("[Admin Compensation Settings PUT] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to save compensation settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
