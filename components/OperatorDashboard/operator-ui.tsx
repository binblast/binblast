"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode, SelectHTMLAttributes } from "react";

type ActionVariant = "primary" | "success" | "danger" | "neutral" | "ghost";

const variantStyles: Record<ActionVariant, CSSProperties> = {
  primary: {
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.18)",
  },
  success: {
    background: "#16a34a",
    color: "#ffffff",
    border: "1px solid #15803d",
    boxShadow: "0 1px 2px rgba(22, 163, 74, 0.18)",
  },
  danger: {
    background: "#dc2626",
    color: "#ffffff",
    border: "1px solid #b91c1c",
    boxShadow: "0 1px 2px rgba(220, 38, 38, 0.18)",
  },
  neutral: {
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  ghost: {
    background: "#f8fafc",
    color: "#475569",
    border: "1px solid #e2e8f0",
    boxShadow: "none",
  },
};

const baseButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.35rem",
  borderRadius: "10px",
  fontWeight: 600,
  lineHeight: 1.2,
  cursor: "pointer",
  transition: "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
  whiteSpace: "nowrap",
};

export const operatorActionLayouts = {
  toolbar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.25rem",
  } satisfies CSSProperties,
  stopActions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    minWidth: "210px",
  } satisfies CSSProperties,
  stopActionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    alignItems: "center",
  } satisfies CSSProperties,
};

interface OperatorActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
  children: ReactNode;
}

export function OperatorActionButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: OperatorActionButtonProps) {
  const sizeStyle: CSSProperties =
    size === "sm"
      ? { padding: "0.42rem 0.7rem", fontSize: "0.75rem", minHeight: "32px" }
      : { padding: "0.7rem 1rem", fontSize: "0.8125rem", minHeight: "42px" };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...baseButtonStyle,
        ...sizeStyle,
        ...variantStyles[variant],
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

interface OperatorPrioritySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
}

export function OperatorPrioritySelect({
  fullWidth = false,
  style,
  ...props
}: OperatorPrioritySelectProps) {
  return (
    <select
      style={{
        minHeight: "32px",
        padding: "0.42rem 0.65rem",
        borderRadius: "10px",
        border: "1px solid #d1d5db",
        background: "#ffffff",
        color: "#374151",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: "pointer",
        width: fullWidth ? "100%" : "auto",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        ...style,
      }}
      {...props}
    />
  );
}

export function OperatorActionToolbar({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        ...operatorActionLayouts.toolbar,
        paddingTop: "1rem",
        borderTop: "1px solid #f1f5f9",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
