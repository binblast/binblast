import { NextRequest, NextResponse } from "next/server";
import { verifyQuoActionAuth, buildQuoUnauthorizedResponse } from "@/lib/quo-auth";
import {
  QUO_ACTION_DEFINITIONS,
  QuoActionName,
  executeQuoAction,
} from "@/lib/quo-platform-actions";
import { getServiceAreasPayload } from "@/lib/service-areas";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set<string>(QUO_ACTION_DEFINITIONS.map((item) => item.action));

export async function GET(req: NextRequest) {
  if (!verifyQuoActionAuth(req)) {
    return NextResponse.json(buildQuoUnauthorizedResponse(req), { status: 401 });
  }

  return NextResponse.json({
    success: true,
    service: "Bin Blast QUO Platform Actions",
    website: process.env.NEXT_PUBLIC_APP_URL || "https://www.binblastco.com",
    serviceAreas: getServiceAreasPayload(),
    actions: QUO_ACTION_DEFINITIONS,
    auth: {
      headers: ["Authorization", "Authorization: Bearer", "x-quo-action-key", "x-api-key"],
      note: "Use the same QUO API key value stored in Vercel as QUO_API_KEY.",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyQuoActionAuth(req)) {
      return NextResponse.json(buildQuoUnauthorizedResponse(req), { status: 401 });
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          error: "Invalid action",
          allowedActions: [...ALLOWED_ACTIONS],
        },
        { status: 400 }
      );
    }

    const payload =
      body.payload && typeof body.payload === "object" ? body.payload : body;

    const result = await executeQuoAction(action as QuoActionName, payload);

    return NextResponse.json({
      success: true,
      action,
      result,
    });
  } catch (error: unknown) {
    console.error("[Quo Actions] Error:", error);
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
