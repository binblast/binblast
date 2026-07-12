/** Crockford-style alphabet — excludes 0/O, 1/I/L to avoid confusion. */
export const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const AMBIGUOUS_CHAR_ALTERNATES: Record<string, string[]> = {
  "0": ["0", "O"],
  O: ["0", "O"],
  "1": ["1", "I", "L"],
  I: ["1", "I", "L"],
  L: ["1", "I", "L"],
};

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function formatReferralCodeGroups(code: string, groupSize = 4): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";

  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += groupSize) {
    groups.push(normalized.slice(i, i + groupSize));
  }
  return groups.join("-");
}

export function isReferralCodeDigit(char: string): boolean {
  return /\d/.test(char);
}

export function getReferralCodeVariants(code: string, maxVariants = 32): string[] {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return [];

  let variants = [normalized];

  for (let i = 0; i < normalized.length; i++) {
    const alts = AMBIGUOUS_CHAR_ALTERNATES[normalized[i]];
    if (!alts) continue;

    const next = new Set<string>();
    for (const variant of variants) {
      for (const alt of alts) {
        next.add(variant.slice(0, i) + alt + variant.slice(i + 1));
      }
    }
    variants = [...next];
    if (variants.length > maxVariants) break;
  }

  return variants;
}

export function generateReadableReferralCode(length = 12): string {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => REFERRAL_CODE_ALPHABET[byte % REFERRAL_CODE_ALPHABET.length]).join("");
  }

  let code = "";
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_ALPHABET[Math.floor(Math.random() * REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}
