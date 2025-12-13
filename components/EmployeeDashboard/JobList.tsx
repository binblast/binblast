// components/EmployeeDashboard/JobList.tsx
"use client";

interface Job {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  binCount?: number;
  planType?: string;
  notes?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  flags?: string[];
}

interface JobListProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  isClockedIn: boolean;
}

export function JobList({ jobs, onJobClick, isClockedIn }: JobListProps) {
  if (!isClockedIn) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Clock in to see your jobs
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        No jobs assigned for today
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", text: "#065f46", border: "#bbf7d0" };
      case "in_progress":
        return { bg: "#dbeafe", text: "#1e40af", border: "#bae6fd" };
      default:
        return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
    }
  };

  const getPlanTypeLabel = (planType?: string) => {
    if (!planType) return "Residential";
    if (planType.toLowerCase().includes("commercial")) return "Commercial";
    return "Residential";
  };

  const openMap = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(address);
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let mapUrl: string;
    if (isIOS) {
      mapUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
    } else if (isMobile) {
      mapUrl = `https://maps.google.com/?q=${encodedAddress}`;
    } else {
      mapUrl = `https://maps.google.com/?q=${encodedAddress}`;
    }
    
    window.open(mapUrl, "_blank");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {jobs.map((job) => {
        const statusColors = getStatusColor(job.jobStatus);
        const fullAddress = `${job.addressLine1}${
          job.addressLine2 ? `, ${job.addressLine2}` : ""
        }, ${job.city}, ${job.state} ${job.zipCode}`;

        return (
          <div
            key={job.id}
            onClick={() => onJobClick(job)}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              border: `1px solid ${statusColors.border}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                    color: "#111827",
                  }}
                >
                  {job.customerName || job.userEmail || "Customer"}
                </div>
                <div
                  onClick={(e) => openMap(fullAddress, e)}
                  style={{
                    fontSize: "0.875rem",
                    color: "#2563eb",
                    marginBottom: "0.5rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                  title="Tap to open in maps"
                >
                  {fullAddress}
                </div>
              </div>
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  textTransform: "capitalize",
                  background: statusColors.bg,
                  color: statusColors.text,
                }}
              >
                {job.jobStatus || "pending"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                fontSize: "0.875rem",
                color: "#6b7280",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>Bins:</strong> {job.binCount || "N/A"}
              </div>
              <div>
                <strong>Type:</strong> {getPlanTypeLabel(job.planType)}
              </div>
              {job.flags && job.flags.length > 0 && (
                <div style={{ color: "#dc2626" }}>
                  <strong>Flags:</strong> {job.flags.length}
                </div>
              )}
            </div>

            {job.notes && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <strong>Notes:</strong> {job.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

