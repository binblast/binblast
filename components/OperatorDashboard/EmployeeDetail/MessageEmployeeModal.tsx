// components/OperatorDashboard/EmployeeDetail/MessageEmployeeModal.tsx
"use client";

import { useState } from "react";

interface MessageEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
}

export function MessageEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeEmail,
}: MessageEmployeeModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          priority,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess(true);
      setTimeout(() => {
        setSubject("");
        setMessage("");
        setPriority("normal");
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            Message Employee
          </h2>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: "#6b7280",
              cursor: sending ? "not-allowed" : "pointer",
              padding: "0.25rem 0.5rem",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            To: <strong>{employeeName}</strong> ({employeeEmail})
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Subject *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter message subject..."
            disabled={sending}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            disabled={sending}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Message *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={8}
            disabled={sending}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "0.75rem",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: "0.75rem",
            background: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}>
            Message sent successfully!
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: sending || !subject.trim() || !message.trim() ? "#9ca3af" : "#3b82f6",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: sending || !subject.trim() || !message.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

