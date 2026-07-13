import { NextRequest } from "next/server";
import crypto from "node:crypto";

export function getQuoApiKey(): string | undefined {
  return process.env.QUO_API_KEY?.trim();
}

export function verifyQuoActionAuth(req: NextRequest): boolean {
  const apiKey = getQuoApiKey();
  if (!apiKey) return false;

  const authorization = req.headers.get("authorization")?.trim();
  const actionKey = req.headers.get("x-quo-action-key")?.trim();

  const candidates = [authorization, actionKey].filter(Boolean) as string[];

  return candidates.some((value) => {
    if (value === apiKey) return true;

    const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && bearerMatch[1].trim() === apiKey) return true;

    return false;
  });
}

export function verifyQuoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  signingSecret?: string
): boolean {
  const secret = signingSecret || process.env.QUO_WEBHOOK_SIGNING_SECRET?.trim();
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
