// components/EmployeeDashboard/MarkdownCallout.tsx
// Callout box component for highlighting important information in markdown

"use client";

interface MarkdownCalloutProps {
  type?: "info" | "warning" | "success" | "important";
  title?: string;
  children: React.ReactNode;
}

export function MarkdownCallout({ type = "info", title, children }: MarkdownCalloutProps) {
  const styles = {
    info: {
      background: "#eff6ff",
      border: "2px solid #3b82f6",
      iconColor: "#2563eb",
      titleColor: "#1e40af",
    },
    warning: {
      background: "#fef3c7",
      border: "2px solid #f59e0b",
      iconColor: "#d97706",
      titleColor: "#92400e",
    },
    success: {
      background: "#d1fae5",
      border: "2px solid #16a34a",
      iconColor: "#065f46",
      titleColor: "#047857",
    },
    important: {
      background: "#fee2e2",
      border: "2px solid #dc2626",
      iconColor: "#991b1b",
      titleColor: "#b91c1c",
    },
  };

  const style = styles[type];
  const icons = {
    info: "ℹ️",
    warning: "⚠️",
    success: "✓",
    important: "❗",
  };

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        background: style.background,
        border: style.border,
        borderRadius: "8px",
        margin: "1rem 0",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            fontWeight: "700",
            fontSize: "0.875rem",
            color: style.titleColor,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ fontSize: "1rem" }}>{icons[type]}</span>
          <span>{title}</span>
        </div>
      )}
      <div
        style={{
          fontSize: "0.9375rem",
          lineHeight: "1.6",
          color: "#111827",
        }}
      >
        {children}
      </div>
    </div>
  );
}
