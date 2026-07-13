import { NextRequest } from "next/server";
import crypto from "node:crypto";

function normalizeSecretValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || undefined;
  }

  return trimmed;
}

export function getQuoApiKey(): string | undefined {
  return normalizeSecretValue(process.env.QUO_API_KEY);
}

export function getQuoWebhookSigningSecret(): string | undefined {
  return normalizeSecretValue(process.env.QUO_WEBHOOK_SIGNING_SECRET);
}

export function getQuoConfigStatus() {
  return {
    apiKeyConfigured: Boolean(getQuoApiKey()),
    webhookSecretConfigured: Boolean(getQuoWebhookSigningSecret()),
  };
}

function extractProvidedApiKeys(req: NextRequest): string[] {
  const headerValues = [
    req.headers.get("authorization"),
    req.headers.get("x-quo-action-key"),
    req.headers.get("x-api-key"),
    req.headers.get("api-key"),
  ];

  const keys: string[] = [];

  for (const value of headerValues) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    keys.push(trimmed);

    const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      keys.push(bearerMatch[1].trim());
    }
  }

  return keys.filter(Boolean);
}

export function getQuoAuthFailureReason(
  req: NextRequest
): "missing_server_key" | "missing_client_key" | "invalid_key" {
  if (!getQuoApiKey()) return "missing_server_key";
  if (extractProvidedApiKeys(req).length === 0) return "missing_client_key";
  return "invalid_key";
}

export function verifyQuoActionAuth(req: NextRequest): boolean {
  const apiKey = getQuoApiKey();
  if (!apiKey) return false;

  return extractProvidedApiKeys(req).some((value) => value === apiKey);
}

export function buildQuoUnauthorizedResponse(req: NextRequest) {
  const reason = getQuoAuthFailureReason(req);

  const hints: Record<typeof reason, string> = {
    missing_server_key:
      "QUO_API_KEY is empty or missing in Vercel. Paste the key, save, then redeploy.",
    missing_client_key:
      "Send your QUO API key in Authorization, Authorization: Bearer <key>, x-quo-action-key, or x-api-key.",
    invalid_key:
      "The API key sent in the request does not match QUO_API_KEY in Vercel. Re-copy the key from QUO and redeploy.",
  };

  return {
    error: "Unauthorized" as const,
    reason,
    hint: hints[reason],
  };
}

export function verifyQuoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  signingSecret?: string
): boolean {
  const secret = signingSecret || getQuoWebhookSigningSecret();
  if (!secret || !signatureHeader) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    const fields = signatureHeader.split(";");
    if (fields.length < 4) return false;

    const timestamp = fields[2];
    const providedDigest = fields[3];
    const signedData = `${timestamp}.${rawBody}`;
    const signingKeyBinary = Buffer.from(secret, "base64").toString("binary");
    const computedDigest = crypto
      .createHmac("sha256", signingKeyBinary)
      .update(Buffer.from(signedData, "utf8"))
      .digest("base64");

    if (computedDigest.length !== providedDigest.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(computedDigest, "utf8"),
      Buffer.from(providedDigest, "utf8")
    );
  } catch {
    return false;
  }
}

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits ? `+${digits}` : phone;
}

export function phoneSearchVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const variants = new Set<string>();

  if (phone) variants.add(phone.trim());
  if (digits) variants.add(digits);
  if (last10) {
    variants.add(last10);
    variants.add(`+1${last10}`);
    variants.add(`1${last10}`);
    if (last10.length === 10) {
      variants.add(`(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`);
      variants.add(`${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`);
    }
  }

  return [...variants].filter(Boolean);
}
