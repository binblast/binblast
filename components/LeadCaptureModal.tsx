"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
    document.body.classList.add("lead-capture-open");
    return () => {
      document.body.classList.remove("lead-capture-open");
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
    <div className="lead-capture-overlay" onClick={handleDismiss}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-capture-title"
        className="lead-capture-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lead-capture-header">
          <div className="lead-capture-header-copy">
            <h2 id="lead-capture-title" className="lead-capture-title">
              Welcome to Bin Blast Co.
            </h2>
            <p className="lead-capture-subtitle">
              Quick intro so we can serve you better.
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

        <form onSubmit={handleSubmit} className="lead-capture-form-shell">
          <div className="lead-capture-body">
            <div className="lead-capture-form">
              <div className="lead-capture-field">
                <label className="lead-capture-label" htmlFor="lead-name">
                  Full Name
                </label>
                <input
                  id="lead-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="lead-capture-input"
                />
              </div>

              <div className="lead-capture-field">
                <label className="lead-capture-label" htmlFor="lead-email">
                  Email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="lead-capture-input"
                />
              </div>

              <div className="lead-capture-field">
                <label className="lead-capture-label" htmlFor="lead-phone">
                  Phone Number
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  required
                  className="lead-capture-input"
                />
              </div>

              <div className="lead-capture-field">
                <label className="lead-capture-label" htmlFor="lead-heard">
                  How did you hear about us?
                </label>
                <select
                  id="lead-heard"
                  value={heardAboutUs}
                  onChange={(e) => setHeardAboutUs(e.target.value)}
                  required
                  className="lead-capture-input lead-capture-select"
                >
                  <option value="">Select one</option>
                  {HEARD_ABOUT_US_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lead-capture-field">
                <label className="lead-capture-label" htmlFor="lead-referred">
                  Who referred you?
                </label>
                <input
                  id="lead-referred"
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="Friend name, business, or N/A"
                  required
                  className="lead-capture-input"
                />
              </div>

              {(attribution.referralCode || attribution.partnerCode) && (
                <div className="lead-capture-referral">
                  Referral detected: {attribution.referralCode || attribution.partnerCode}
                </div>
              )}

              {error && <div className="lead-capture-error">{error}</div>}
            </div>
          </div>

          <div className="lead-capture-footer">
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
            <button type="button" onClick={handleDismiss} className="lead-capture-skip">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
