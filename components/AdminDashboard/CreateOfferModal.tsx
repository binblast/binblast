// components/AdminDashboard/CreateOfferModal.tsx
"use client";

import { useState, useEffect } from "react";

interface CustomQuote {
  id: string;
  propertyType: "residential" | "commercial" | "hoa";
  name: string;
  email: string;
  phone: string;
  address: string;
  estimatedPrice?: number;
  estimatedPriceLow?: number;
  estimatedPriceHigh?: number;
  commercialType?: string;
  commercialBins?: number;
  dumpsterPadCleaning?: boolean;
  commercialFrequency?: string;
  residentialBins?: number;
  residentialFrequency?: string;
  hoaUnits?: number;
  hoaBins?: number;
  hoaFrequency?: string;
  [key: string]: any;
}

interface CreateOfferModalProps {
  quote: CustomQuote;
  isOpen: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
}

export function CreateOfferModal({
  quote,
  isOpen,
  onClose,
  onOfferCreated,
}: CreateOfferModalProps) {
  const [formData, setFormData] = useState({
    customizedPrice: quote.estimatedPrice || quote.estimatedPriceLow || 0,
    customizedPriceLow: quote.estimatedPriceLow || 0,
    customizedPriceHigh: quote.estimatedPriceHigh || 0,
    customizedFrequency: quote.commercialFrequency || quote.residentialFrequency || quote.hoaFrequency || "Monthly",
    dumpsterCount: quote.commercialBins || 1,
    hasDumpsterPad: quote.dumpsterPadCleaning || false,
    residentialBins: quote.residentialBins || 1,
    hoaUnits: quote.hoaUnits || 1,
    hoaBins: quote.hoaBins || 1,
    specialNotes: "",
    timeline: "",
    termsAndConditions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  useEffect(() => {
    if (isOpen && quote) {
      setFormData({
        customizedPrice: quote.estimatedPrice || quote.estimatedPriceLow || 0,
        customizedPriceLow: quote.estimatedPriceLow || 0,
        customizedPriceHigh: quote.estimatedPriceHigh || 0,
        customizedFrequency: quote.commercialFrequency || quote.residentialFrequency || quote.hoaFrequency || "Monthly",
        dumpsterCount: quote.commercialBins || 1,
        hasDumpsterPad: quote.dumpsterPadCleaning || false,
        residentialBins: quote.residentialBins || 1,
        hoaUnits: quote.hoaUnits || 1,
        hoaBins: quote.hoaBins || 1,
        specialNotes: "",
        timeline: "",
        termsAndConditions: "",
      });
    }
  }, [isOpen, quote]);

  const handleSubmit = async (sendEmail: boolean) => {
    setIsSubmitting(true);
    try {
      const offerData = {
        quoteId: quote.id,
        customizedPrice: formData.customizedPrice,
        customizedPriceLow: formData.customizedPriceLow,
        customizedPriceHigh: formData.customizedPriceHigh,
        customizedFrequency: formData.customizedFrequency,
        customizedServices: {
          dumpsterCount: quote.propertyType === "commercial" ? formData.dumpsterCount : undefined,
          hasDumpsterPad: quote.propertyType === "commercial" ? formData.hasDumpsterPad : undefined,
          residentialBins: quote.propertyType === "residential" ? formData.residentialBins : undefined,
          hoaUnits: quote.propertyType === "hoa" ? formData.hoaUnits : undefined,
          hoaBins: quote.propertyType === "hoa" ? formData.hoaBins : undefined,
        },
        specialNotes: formData.specialNotes,
        timeline: formData.timeline,
        termsAndConditions: formData.termsAndConditions,
        sendEmail,
      };

      const response = await fetch(`/api/quotes/${quote.id}/create-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create offer");
      }

      const result = await response.json();
      
      if (sendEmail && result.offerId) {
        // Send email
        const emailResponse = await fetch(`/api/quotes/${quote.id}/send-offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerId: result.offerId }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send email, but offer was created");
        }
      }

      onOfferCreated();
      onClose();
    } catch (error: any) {
      console.error("Error creating offer:", error);
      alert(error.message || "Failed to create offer. Please try again.");
    } finally {
      setIsSubmitting(false);
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
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2rem)",
        overflowY: "auto",
        animation: "fadeIn 0.3s ease-out"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          position: "relative",
          animation: "slideUp 0.3s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "clamp(1.5rem, 4vw, 2rem)",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 10,
          borderRadius: "20px 20px 0 0"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h2 style={{
              fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
              fontWeight: "700",
              color: "var(--text-dark)",
              margin: 0
            }}>
              Create Custom Offer
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                color: "#6b7280",
                padding: "0.5rem",
                lineHeight: 1,
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginTop: "0.5rem"
          }}>
            For: {quote.name} • {quote.email}
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: "clamp(1.5rem, 4vw, 2rem)"
        }}>
          {/* Price Section */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem"
            }}>
              Monthly Price *
            </label>
            <div style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "1.25rem", color: "#6b7280" }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.customizedPrice}
                onChange={(e) => setFormData({ ...formData, customizedPrice: parseFloat(e.target.value) || 0 })}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  background: "#ffffff"
                }}
              />
            </div>
            <div style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.5rem"
            }}>
              Original estimate: ${quote.estimatedPriceLow?.toLocaleString() || 0} - ${quote.estimatedPriceHigh?.toLocaleString() || 0}/month
            </div>
          </div>

          {/* Frequency Section */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem"
            }}>
              Service Frequency *
            </label>
            <select
              value={formData.customizedFrequency}
              onChange={(e) => setFormData({ ...formData, customizedFrequency: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff",
                cursor: "pointer"
              }}
            >
              <option value="Monthly">Monthly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>

          {/* Services Section */}
          {quote.propertyType === "commercial" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.75rem"
              }}>
                Services
              </label>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem"
                  }}>
                    Number of Dumpsters
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.dumpsterCount}
                    onChange={(e) => setFormData({ ...formData, dumpsterCount: parseInt(e.target.value) || 1 })}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      background: "#ffffff"
                    }}
                  />
                </div>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={formData.hasDumpsterPad}
                    onChange={(e) => setFormData({ ...formData, hasDumpsterPad: e.target.checked })}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer"
                    }}
                  />
                  Include Dumpster Pad Cleaning (+$75/month)
                </label>
              </div>
            </div>
          )}

          {quote.propertyType === "residential" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem"
              }}>
                Number of Bins
              </label>
              <input
                type="number"
                min="1"
                value={formData.residentialBins}
                onChange={(e) => setFormData({ ...formData, residentialBins: parseInt(e.target.value) || 1 })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  background: "#ffffff"
                }}
              />
            </div>
          )}

          {quote.propertyType === "hoa" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--text-dark)",
                    marginBottom: "0.5rem"
                  }}>
                    Number of Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.hoaUnits}
                    onChange={(e) => setFormData({ ...formData, hoaUnits: parseInt(e.target.value) || 1 })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      background: "#ffffff"
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--text-dark)",
                    marginBottom: "0.5rem"
                  }}>
                    Total Bins
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.hoaBins}
                    onChange={(e) => setFormData({ ...formData, hoaBins: parseInt(e.target.value) || 1 })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      background: "#ffffff"
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem"
            }}>
              Special Notes / Instructions
            </label>
            <textarea
              value={formData.specialNotes}
              onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
              placeholder="Add any special instructions or notes for this offer..."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff",
                minHeight: "100px",
                resize: "vertical"
              }}
            />
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem"
            }}>
              Timeline / Start Date
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              placeholder="e.g., Start immediately, Start next month, etc."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff"
              }}
            />
          </div>

          {/* Terms and Conditions */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem"
            }}>
              Terms and Conditions
            </label>
            <textarea
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              placeholder="Add any custom terms and conditions..."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff",
                minHeight: "80px",
                resize: "vertical"
              }}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            paddingTop: "1rem",
            borderTop: "1px solid #e5e7eb"
          }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#f9fafb",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#6b7280",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#f3f4f6",
                border: "2px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#374151",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !formData.customizedPrice}
              style={{
                padding: "0.75rem 1.5rem",
                background: isSubmitting || !formData.customizedPrice
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "700",
                color: "#ffffff",
                cursor: isSubmitting || !formData.customizedPrice ? "not-allowed" : "pointer",
                boxShadow: isSubmitting || !formData.customizedPrice ? "none" : "0 4px 12px rgba(22, 163, 74, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {isSubmitting ? "Sending..." : "Send Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

