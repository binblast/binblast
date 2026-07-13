"use client";

import { formatTime } from "@/lib/employee-utils";

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
  binsCount?: number;
  planType?: string;
  completedAt?: { toDate?: () => Date; seconds?: number } | string | Date;
  hasRequiredPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
}

interface CompletedJobsHistoryProps {
  jobs: Job[];
  payRatePerJob: number;
  onJobClick?: (job: Job) => void;
}

function getCompletedTimestamp(job: Job): number {
  const { completedAt } = job;
  if (!completedAt) return 0;
  if (typeof completedAt === "object" && "toDate" in completedAt && completedAt.toDate) {
    return completedAt.toDate().getTime();
  }
  if (typeof completedAt === "object" && "seconds" in completedAt && completedAt.seconds) {
    return completedAt.seconds * 1000;
  }
  return new Date(completedAt as string | Date).getTime();
}

function isPayEligible(job: Job): boolean {
  if (job.hasRequiredPhotos === true) return true;
  return Boolean(job.insidePhotoUrl && job.outsidePhotoUrl);
}

export function CompletedJobsHistory({
  jobs,
  payRatePerJob,
  onJobClick,
}: CompletedJobsHistoryProps) {
  const sortedJobs = [...jobs].sort(
    (a, b) => getCompletedTimestamp(b) - getCompletedTimestamp(a)
  );

  return (
    <div
      style={{
        marginTop: "1.5rem",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "clamp(1rem, 4vw, 1.25rem)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontSize: "clamp(1rem, 4vw, 1.125rem)",
            fontWeight: "700",
            color: "#111827",
            margin: 0,
          }}
        >
          Completed Today
        </h3>
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: "600",
            color: "#16a34a",
            background: "#dcfce7",
            padding: "0.25rem 0.625rem",
            borderRadius: "999px",
          }}
        >
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sortedJobs.length === 0 ? (
        <div
          style={{
            padding: "1.25rem",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "0.875rem",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          No jobs completed yet. Your history will appear here as you finish stops.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedJobs.map((job, index) => {
            const bins = job.binCount ?? job.binsCount ?? 1;
            const eligible = isPayEligible(job);
            const fullAddress = `${job.addressLine1}${
              job.addressLine2 ? `, ${job.addressLine2}` : ""
            }, ${job.city}, ${job.state}`;
            const completedTime = job.completedAt ? formatTime(job.completedAt) : "—";

            return (
              <div
                key={job.id}
                onClick={() => onJobClick?.(job)}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  padding: "0.875rem",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  cursor: onJobClick ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (onJobClick) e.currentTarget.style.background = "#f0fdf4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: "#16a34a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  {sortedJobs.length - index}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        color: "#111827",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {job.customerName || job.userEmail || "Customer"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {completedTime}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "#6b7280",
                      marginBottom: "0.5rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={fullAddress}
                  >
                    {fullAddress}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#374151",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      {bins} bin{bins !== 1 ? "s" : ""}
                    </span>

                    {eligible && payRatePerJob > 0 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "#16a34a",
                          background: "#dcfce7",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        +${payRatePerJob.toFixed(2)}
                      </span>
                    )}

                    {(job.insidePhotoUrl || job.outsidePhotoUrl) && (
                      <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                        {job.outsidePhotoUrl && (
                          <img
                            src={job.outsidePhotoUrl}
                            alt="Outside bin"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "4px",
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        )}
                        {job.insidePhotoUrl && (
                          <img
                            src={job.insidePhotoUrl}
                            alt="Inside bin"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "4px",
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
