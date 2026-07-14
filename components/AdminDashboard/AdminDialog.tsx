"use client";

import { useState } from "react";
import "./partner-program.css";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const btnClass =
    variant === "danger" ? "pp-btn-danger" : variant === "warning" ? "pp-btn-warning" : "pp-btn-primary";

  return (
    <div className="pp-dialog-backdrop" onClick={onClose}>
      <div className="pp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="pp-dialog-actions">
          <button type="button" className="pp-btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReasonDialog({
  title,
  description,
  placeholder,
  confirmLabel,
  required = true,
  variant = "danger",
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  placeholder: string;
  confirmLabel: string;
  required?: boolean;
  variant?: "danger" | "warning" | "primary";
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const btnClass =
    variant === "danger" ? "pp-btn-danger" : variant === "warning" ? "pp-btn-warning" : "pp-btn-primary";
  const canSubmit = required ? value.trim().length > 0 : true;

  return (
    <div className="pp-dialog-backdrop" onClick={onClose}>
      <div className="pp-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
        <div className="pp-dialog-actions">
          <button type="button" className="pp-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit(value.trim());
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
