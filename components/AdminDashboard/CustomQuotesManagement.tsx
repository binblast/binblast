// components/AdminDashboard/CustomQuotesManagement.tsx
"use client";

import { useState, useEffect } from "react";

interface CustomQuote {
  id: string;
  propertyType: "residential" | "commercial" | "hoa";
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "pending" | "contacted" | "quoted" | "converted";
  estimatedPrice?: number;
  submittedAt: any;
  [key: string]: any;
}

export function CustomQuotesManagement() {
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<CustomQuote | null>(null);

  useEffect(() => {
    loadQuotes();
  }, [filterStatus]);

  const loadQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes/list?status=${filterStatus}`);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      }
    } catch (error) {
      console.error("Error loading quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await loadQuotes();
        if (selectedQuote?.id === quoteId) {
          setSelectedQuote({ ...selectedQuote, status: newStatus as any });
        }
      }
    } catch (error) {
      console.error("Error updating quote status:", error);
      alert("Failed to update quote status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "contacted":
        return "#2563eb";
      case "quoted":
        return "#9333ea";
      case "converted":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "pending":
        return "#fef3c7";
      case "contacted":
        return "#dbeafe";
      case "quoted":
        return "#f3e8ff";
      case "converted":
        return "#dcfce7";
      default:
        return "#f3f4f6";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case "residential":
        return "Residential";
      case "commercial":
        return "Commercial";
      case "hoa":
        return "HOA / Neighborhood";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading custom quotes...
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      padding: "clamp(1rem, 4vw, 2rem)",
      border: "1px solid #e5e7eb",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      marginBottom: "2rem"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <h3 style={{
          fontSize: "clamp(1.125rem, 3vw, 1.25rem)",
          fontWeight: "700",
          color: "var(--text-dark)",
          margin: 0
        }}>
          Custom Quote Requests
        </h3>
        <div style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap"
        }}>
          {["all", "pending", "contacted", "quoted", "converted"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: "0.5rem 1rem",
                background: filterStatus === status
                  ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                  : "#f9fafb",
                border: `2px solid ${filterStatus === status ? "#16a34a" : "#e5e7eb"}`,
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: filterStatus === status ? "#ffffff" : "#6b7280",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s ease"
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {quotes.length === 0 ? (
        <div style={{
          padding: "3rem",
          textAlign: "center",
          color: "#6b7280"
        }}>
          No custom quotes found{filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}.
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          {quotes.map((quote) => (
            <div
              key={quote.id}
              style={{
                padding: "1.25rem",
                background: "#f9fafb",
                borderRadius: "12px",
                border: "2px solid #e5e7eb",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => setSelectedQuote(selectedQuote?.id === quote.id ? null : quote)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "1rem"
              }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.5rem"
                  }}>
                    <div style={{
                      fontSize: "clamp(1rem, 3vw, 1.125rem)",
                      fontWeight: "700",
                      color: "var(--text-dark)"
                    }}>
                      {quote.name}
                    </div>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: getStatusBg(quote.status),
                      color: getStatusColor(quote.status)
                    }}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.25rem"
                  }}>
                    {quote.email} • {quote.phone}
                  </div>
                  <div style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.5rem"
                  }}>
                    {getPropertyTypeLabel(quote.propertyType)} • {quote.address}
                  </div>
                  {quote.estimatedPrice && (
                    <div style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#16a34a"
                    }}>
                      Est. Price: ${quote.estimatedPrice.toLocaleString()}/month
                    </div>
                  )}
                  <div style={{
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    marginTop: "0.5rem"
                  }}>
                    Submitted: {formatDate(quote.submittedAt)}
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap"
                }}>
                  {quote.status !== "converted" && (
                    <select
                      value={quote.status}
                      onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "0.5rem 0.75rem",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: "#ffffff",
                        minHeight: "36px"
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="converted">Converted</option>
                    </select>
                  )}
                  <a
                    href={`mailto:${quote.email}?subject=Custom Quote Request - ${quote.name}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#2563eb",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "inline-block",
                      minHeight: "36px",
                      lineHeight: "1.5"
                    }}
                  >
                    Email
                  </a>
                  <a
                    href={`tel:${quote.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "inline-block",
                      minHeight: "36px",
                      lineHeight: "1.5"
                    }}
                  >
                    Call
                  </a>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedQuote?.id === quote.id && (
                <div style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "2px solid #e5e7eb",
                  animation: "fadeInUp 0.3s ease-out"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1rem"
                  }}>
                    {quote.propertyType === "residential" && (
                      <>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Bins</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.residentialBins || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Frequency</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.residentialFrequency || "N/A"}
                          </div>
                        </div>
                        {quote.residentialSpecialRequirements && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Special Requirements</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {quote.residentialSpecialRequirements}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {quote.propertyType === "commercial" && (
                      <>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Property Type</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.commercialType || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Bins/Dumpsters</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.commercialBins || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Dumpster Pad Cleaning</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.dumpsterPadCleaning ? "Yes" : "No"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Frequency</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.commercialFrequency || "N/A"}
                          </div>
                        </div>
                        {quote.commercialSpecialRequirements && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Special Requirements</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {quote.commercialSpecialRequirements}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {quote.propertyType === "hoa" && (
                      <>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Units/Homes</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.hoaUnits || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Total Bins</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.hoaBins || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Frequency</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.hoaFrequency || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Bulk Pricing</div>
                          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            {quote.bulkPricing ? "Yes" : "No"}
                          </div>
                        </div>
                        {quote.communityAccessRequirements && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Access Requirements</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {quote.communityAccessRequirements}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Preferred Contact</div>
                      <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        {quote.preferredContact || "N/A"}
                      </div>
                    </div>
                    {quote.bestTimeToContact && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Best Time</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          {quote.bestTimeToContact}
                        </div>
                      </div>
                    )}
                    {quote.timeline && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Timeline</div>
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          {quote.timeline}
                        </div>
                      </div>
                    )}
                    {quote.specialInstructions && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Special Instructions</div>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                          {quote.specialInstructions}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

