"use client";

import { QuoteFormData } from "../CustomQuoteWizard";

const SUPPORT_PHONE = "(470) 305-0823";
const SUPPORT_PHONE_TEL = "+14703050823";
const SUPPORT_EMAIL = "binblastcompany@gmail.com";

interface QuoteStepSuccessProps {
  formData: QuoteFormData;
  quoteId: string;
  requiresManualReview: boolean;
  onClose: () => void;
}

function buildCalendlyUrl(formData: QuoteFormData, quoteId: string): string | null {
  const base = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim();
  if (!base) return null;

  const params = new URLSearchParams();
  if (formData.name) params.set("name", formData.name);
  if (formData.email) params.set("email", formData.email);
  params.set("a1", quoteId);
  if (formData.phone) params.set("a2", formData.phone);

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${params.toString()}`;
}

export function QuoteStepSuccess({
  formData,
  quoteId,
  requiresManualReview,
  onClose,
}: QuoteStepSuccessProps) {
  const calendlyUrl = buildCalendlyUrl(formData, quoteId);
  const contactWindow = formData.bestTimeToContact || "your preferred time";

  return (
    <div className="quote-step">
      <div
        style={{
          textAlign: "center",
          padding: "1.5rem 1rem",
          background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
          borderRadius: "12px",
          border: "2px solid #16a34a",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: "700", color: "#166534" }}>
          {requiresManualReview ? "Quote submitted for custom review" : "Quote request submitted"}
        </h3>
        <p style={{ margin: 0, fontSize: "0.9375rem", color: "#15803d", lineHeight: 1.6 }}>
          {requiresManualReview
            ? "Our team will review your property details and prepare a tailored offer. Reference #" +
              quoteId.slice(0, 8).toUpperCase()
            : "We received your request and will follow up shortly."}
        </p>
      </div>

      <div className="quote-step__summary-card" style={{ marginBottom: "1rem" }}>
        <div className="quote-step__summary-title">What happens next</div>
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            color: "#374151",
            fontSize: "0.9375rem",
            lineHeight: 1.5,
          }}
        >
          <li>
            {requiresManualReview
              ? "A Bin Blast specialist reviews your quote (usually within 24 hours)."
              : "We confirm your details and send a final quote."}
          </li>
          <li>
            We&apos;ll reach you via {formData.preferredContact || "email"} during {contactWindow}.
          </li>
          <li>After you approve pricing, you&apos;ll receive a secure link to sign up and pay.</li>
        </ol>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
          Want to talk sooner?
        </p>

        {calendlyUrl ? (
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="quote-step__btn quote-step__btn--primary"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              padding: "0.875rem 1.25rem",
            }}
          >
            Schedule a 15-minute call
          </a>
        ) : null}

        <a
          href={`tel:${SUPPORT_PHONE_TEL}`}
          className="quote-step__btn"
          style={{
            display: "block",
            textAlign: "center",
            textDecoration: "none",
            padding: "0.875rem 1.25rem",
            background: "#ffffff",
            border: "2px solid #16a34a",
            color: "#16a34a",
            borderRadius: "8px",
            fontWeight: "600",
          }}
        >
          Call {SUPPORT_PHONE}
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Custom quote follow-up — ${formData.name || "Quote"} (${quoteId.slice(0, 8)})`)}`}
          style={{
            display: "block",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#2563eb",
            textDecoration: "none",
          }}
        >
          Email {SUPPORT_EMAIL}
        </a>
      </div>

      <button
        type="button"
        className="quote-step__btn quote-step__btn--back"
        onClick={onClose}
        style={{ width: "100%" }}
      >
        Done
      </button>
    </div>
  );
}
