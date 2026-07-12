import { NextRequest, NextResponse } from "next/server";
import { verifyQuoWebhookSignature } from "@/lib/quo-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { upsertQuoContact } from "@/lib/quo-client";
import { executeQuoAction, QuoActionName } from "@/lib/quo-platform-actions";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function storeWebhookEvent(eventType: string, payload: Record<string, unknown>) {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  await db.collection("quoWebhookEvents").add({
    eventType,
    payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function maybeExecuteSuggestedAction(payload: Record<string, unknown>) {
  const suggestedAction = asString(payload.suggestedAction) as QuoActionName;
  const actionPayload =
    payload.actionPayload && typeof payload.actionPayload === "object"
      ? (payload.actionPayload as Record<string, unknown>)
      : null;

  if (!suggestedAction || !actionPayload) return null;

  try {
    return await executeQuoAction(suggestedAction, actionPayload);
  } catch (error) {
    console.error("[Quo Webhook] Suggested action failed:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("openphone-signature");

    if (!verifyQuoWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType =
      asString(payload.type) ||
      asString(payload.event) ||
      asString(payload.eventType) ||
      "unknown";

    await storeWebhookEvent(eventType, payload);

    if (eventType === "call.summary.completed" || eventType === "call.transcript.completed") {
      await maybeExecuteSuggestedAction(payload);
    }

    if (eventType === "call.completed") {
      const callerPhone =
        asString((payload.data as Record<string, unknown> | undefined)?.from) ||
        asString(payload.from);
      const callerEmail = asString(payload.email);

      if (callerPhone) {
        try {
          await upsertQuoContact({
            phone: callerPhone,
            email: callerEmail || undefined,
            firstName: asString(payload.firstName) || "Bin Blast",
            lastName: asString(payload.lastName) || "Caller",
            externalId: callerPhone,
          });
        } catch (contactError) {
          console.warn("[Quo Webhook] Contact sync skipped:", contactError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("[Quo Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
