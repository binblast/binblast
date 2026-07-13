"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  HEARD_ABOUT_US_OPTIONS,
  getSiteLeadAttribution,
  markSiteLeadCaptureDismissed,
  markSiteLeadCaptureSubmitted,
  persistCapturedReferralCode,
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
  minHeight: "44px",
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
    persistCapturedReferralCode(attribution.referralCode);
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
      if (attribution.referralCode) {
        persistCapturedReferralCode(attribution.referralCode);
      }
      onClose();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="lead-capture-overlay"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-capture-title"
        className="lead-capture-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lead-capture-header">
          <div>
            <h2 id="lead-capture-title" className="lead-capture-title">
              Welcome to Bin Blast Co.
            </h2>
            <p className="lead-capture-subtitle">
              Before you explore, tell us a little about yourself so we can serve you better.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close and continue without entering information"
            className="lead-capture-close"
          >
            ×
          </button>
        </div>

        <div className="lead-capture-body">
          <form onSubmit={handleSubmit} className="lead-capture-form">
          <div>
            <label className="lead-capture-label">
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

          <div className="lead-capture-form-grid">
            <div>
              <label className="lead-capture-label">
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
              <label className="lead-capture-label">
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
            <label className="lead-capture-label">
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
            <label className="lead-capture-label">
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
            <div className="lead-capture-referral">
              Referral detected: {attribution.referralCode || attribution.partnerCode}
            </div>
          )}

          {error && (
            <div className="lead-capture-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="lead-capture-submit"
            style={{
              background: loading ? "#86efac" : "#16a34a",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Continue to Site"}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="lead-capture-skip"
          >
            Skip for now
          </button>
          </form>
        </div>
      </div>
    </div>
  );
}
