// components/EmployeeDashboard/Toast.tsx
"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getStyles = () => {
    switch (toast.type) {
      case "error":
        return {
          bg: "#fee2e2",
          border: "#fecaca",
          text: "#991b1b",
          icon: "❌",
        };
      case "info":
        return {
          bg: "#dbeafe",
          border: "#bae6fd",
          text: "#1e40af",
          icon: "ℹ️",
        };
      default: // success
        return {
          bg: "#d1fae5",
          border: "#86efac",
          text: "#065f46",
          icon: "✅",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        background: styles.bg,
        border: `2px solid ${styles.border}`,
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginBottom: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.875rem",
        fontWeight: "600",
        color: styles.text,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        animation: "slideIn 0.3s ease-out",
        maxWidth: "100%",
      }}
    >
      <span style={{ fontSize: "1.25rem" }}>{styles.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "transparent",
          border: "none",
          color: styles.text,
          cursor: "pointer",
          fontSize: "1.25rem",
          padding: "0",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
      >
        ×
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "100px",
        right: "1rem",
        zIndex: 10000,
        maxWidth: "400px",
        width: "calc(100% - 2rem)",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

