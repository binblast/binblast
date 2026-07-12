"use client";

import { useEffect, useState } from "react";

interface ContactCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "email" | "call";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteId?: string;
  onEmailSent?: () => void;
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function getTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}

export function ContactCustomerModal({
  isOpen,
  onClose,
  mode,
  customerName,
  customerEmail,
  customerPhone,
  quoteId,
  onEmailSent,
}: ContactCustomerModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (isOpen && mode === "email") {
      setSubject(`Custom Quote Follow-up - ${customerName}`);
      setMessage(
        `Hi ${customerName},\n\nThank you for your interest in Bin Blast Co. I wanted to follow up on your custom quote request.\n\n`
      );
      setError(null);
      setSuccess(false);
    }
    if (isOpen && mode === "call") {
      setCopied(false);
      setError(null);
    }
    if (isOpen) {
      setIsMobile(isMobileDevice());
    }
  }, [isOpen, mode, customerName]);

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: customerEmail,
          subject: subject.trim(),
          text: message.trim(),
          recipientName: customerName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      if (quoteId) {
        await fetch(`/api/quotes/${quoteId}/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "contacted" }),
        }).catch(() => {});
      }

      setSuccess(true);
      onEmailSent?.();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleCopyPhone = async () => {
    const formatted = formatPhoneDisplay(customerPhone);
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy number. Please copy it manually.");
    }
  };

  if (!isOpen) return null;

  const formattedPhone = formatPhoneDisplay(customerPhone);
  const telHref = getTelHref(customerPhone);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
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
          maxWidth: mode === "email" ? "600px" : "440px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827", margin: 0 }}>
            {mode === "email" ? "Email Customer" : "Call Customer"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>
          <strong style={{ color: "#111827" }}>{customerName}</strong>
          {mode === "email" ? ` · ${customerEmail}` : ` · ${formattedPhone || "No phone on file"}`}
        </div>

        {mode === "email" ? (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending || success}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                disabled={sending || success}
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
              <div
                style={{
                  padding: "0.75rem",
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#d1fae5",
                  color: "#065f46",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                Email sent successfully to {customerEmail}!
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <a
                href={`mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
                style={{
                  padding: "0.75rem 1rem",
                  background: "#f3f4f6",
                  color: "#374151",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                Open in Mail App
              </a>
              <button
                onClick={handleSendEmail}
                disabled={sending || success || !subject.trim() || !message.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  background:
                    sending || success || !subject.trim() || !message.trim() ? "#9ca3af" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor:
                    sending || success || !subject.trim() || !message.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {sending ? "Sending..." : success ? "Sent!" : "Send Email"}
              </button>
            </div>
          </>
        ) : (
          <>
            {!customerPhone ? (
              <div
                style={{
                  padding: "1.5rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                No phone number on file for this customer.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "1.5rem",
                    background: "#f0fdf4",
                    border: "2px solid #86efac",
                    borderRadius: "12px",
                    textAlign: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#065f46", marginBottom: "0.5rem" }}>
                    Customer Phone Number
                  </div>
                  <div
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: "700",
                      color: "#111827",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {formattedPhone}
                  </div>
                </div>

                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  {isMobile
                    ? "Tap Call Now to dial from this phone."
                    : "On a computer, copy the number and call from your phone. If your computer is linked to your phone (FaceTime, iPhone, etc.), Call Now may open your calling app."}
                </p>

                {error && (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#fee2e2",
                      color: "#991b1b",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {telHref && (
                    <a
                      href={telHref}
                      style={{
                        display: "block",
                        padding: "1rem",
                        background: "#16a34a",
                        color: "#ffffff",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontWeight: "700",
                        textAlign: "center",
                        textDecoration: "none",
                      }}
                    >
                      {isMobile ? `Call ${formattedPhone}` : "Call Now"}
                    </a>
                  )}
                  <button
                    onClick={handleCopyPhone}
                    style={{
                      padding: "0.875rem 1rem",
                      background: copied ? "#d1fae5" : "#ffffff",
                      color: copied ? "#065f46" : "#374151",
                      border: `2px solid ${copied ? "#86efac" : "#e5e7eb"}`,
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "Number Copied!" : "Copy Phone Number"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
