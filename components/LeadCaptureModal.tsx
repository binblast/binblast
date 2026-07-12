"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  HEARD_ABOUT_US_OPTIONS,
  getSiteLeadAttribution,
  markSiteLeadCaptureDismissed,
  markSiteLeadCaptureSubmitted,
  validateSiteLeadCapture,
} from "@/lib/site-leads";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

export function LeadCaptureModal({ isOpen, onClose }: LeadCaptureModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [heardAboutUs, setHeardAboutUs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attribution = useMemo(() => {
    if (typeof window === "undefined") return getSiteLeadAttribution("");
    return getSiteLeadAttribution(window.location.search);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !attribution.referralCode) return;
    setReferredBy((current) => current || attribution.referralCode);
  }, [isOpen, attribution.referralCode]);

  useEffect(() => {
    if (!isOpen || !attribution.partnerCode) return;
    setReferredBy((current) => current || attribution.partnerCode);
  }, [isOpen, attribution.partnerCode]);

  if (!isOpen) return null;

  function handleDismiss() {
    markSiteLeadCaptureDismissed();
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      name,
      email,
      phone,
      referredBy,
      heardAboutUs,
      ...attribution,
    };

    const validationError = validateSiteLeadCapture(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save your information");
      }

      markSiteLeadCaptureSubmitted();
      onClose();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-capture-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1002,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <div>
            <h2
              id="lead-capture-title"
              style={{ margin: 0, fontSize: "1.35rem", fontWeight: "700", color: "#ffffff" }}
            >
              Welcome to Bin Blast Co.
            </h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "#dcfce7", lineHeight: 1.5 }}>
              Before you explore, tell us a little about yourself so we can serve you better.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close and continue without entering information"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "999px",
              width: "36px",
              height: "36px",
              color: "#ffffff",
              fontSize: "1.35rem",
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.4rem", color: "#111827" }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.4rem", color: "#111827" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.4rem", color: "#111827" }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.4rem", color: "#111827" }}>
              How did you hear about us?
            </label>
            <select
              value={heardAboutUs}
              onChange={(e) => setHeardAboutUs(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Select one</option>
              {HEARD_ABOUT_US_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.4rem", color: "#111827" }}>
              Who referred you?
            </label>
            <input
              type="text"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="Friend name, business, or N/A"
              required
              style={inputStyle}
            />
          </div>

          {(attribution.referralCode || attribution.partnerCode) && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                color: "#166534",
              }}
            >
              Referral detected: {attribution.referralCode || attribution.partnerCode}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              borderRadius: "10px",
              border: "none",
              background: loading ? "#86efac" : "#16a34a",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Continue to Site"}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#6b7280",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
