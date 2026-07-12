"use client";

import {
  formatReferralCodeGroups,
  isReferralCodeDigit,
  normalizeReferralCode,
} from "@/lib/referral-code-format";

interface ReferralCodeDisplayProps {
  code: string;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
  grouped?: boolean;
}

const SIZE_STYLES = {
  sm: { fontSize: "0.8125rem", letterSpacing: "0.1em" },
  md: { fontSize: "1rem", letterSpacing: "0.12em" },
  lg: { fontSize: "1.125rem", letterSpacing: "0.14em" },
};

export function ReferralCodeDisplay({
  code,
  size = "md",
  showLegend = false,
  grouped = true,
}: ReferralCodeDisplayProps) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const sizeStyle = SIZE_STYLES[size];

  return (
    <span>
      <span
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontWeight: 700,
          ...sizeStyle,
        }}
        aria-label={`Referral code ${normalized.split("").join(" ")}`}
      >
        {normalized.split("").map((char, index) => (
          <span key={`${char}-${index}`}>
            <span
              style={{
                color: isReferralCodeDigit(char) ? "#047857" : "#1d4ed8",
              }}
            >
              {char}
            </span>
            {grouped && (index + 1) % 4 === 0 && index < normalized.length - 1 ? (
              <span style={{ color: "#9ca3af", fontWeight: 500 }}>-</span>
            ) : null}
          </span>
        ))}
      </span>
      {showLegend && (
        <span
          style={{
            display: "block",
            marginTop: "0.35rem",
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          <span style={{ color: "#047857", fontWeight: 600 }}>Green</span> = number,{" "}
          <span style={{ color: "#1d4ed8", fontWeight: 600 }}>Blue</span> = letter
          {grouped ? ` · Shown as ${formatReferralCodeGroups(normalized)}` : ""}
        </span>
      )}
    </span>
  );
}
