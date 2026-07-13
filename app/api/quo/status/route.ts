import { NextResponse } from "next/server";
import { getQuoConfigStatus } from "@/lib/quo-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getQuoConfigStatus();

  return NextResponse.json({
    success: true,
    service: "Bin Blast QUO Integration",
    ...config,
    ready: config.apiKeyConfigured && config.webhookSecretConfigured,
    actionsUrl: "/api/quo/actions",
    webhookUrl: "/api/webhooks/quo",
    message: config.apiKeyConfigured
      ? "QUO API key is configured on the server."
      : "QUO_API_KEY is missing or empty in Vercel. Add the value and redeploy.",
  });
}
