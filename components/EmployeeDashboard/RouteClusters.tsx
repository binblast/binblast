"use client";

import { RouteCluster } from "@/lib/employee-route";

interface RouteClustersProps {
  clusters: RouteCluster[];
  nextStopId?: string | null;
  onStopClick?: (stopId: string) => void;
}

export function RouteClusters({
  clusters,
  nextStopId,
  onStopClick,
}: RouteClustersProps) {
  if (clusters.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "0.75rem",
        }}
      >
        Nearby Groups
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "999px",
                    background: cluster.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.9375rem" }}>
                    {cluster.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {cluster.stopCount} stop{cluster.stopCount !== 1 ? "s" : ""}
                    {cluster.spanMiles > 0
                      ? ` · within ${cluster.spanMiles.toFixed(1)} mi`
                      : ""}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "0.5rem" }}>
              {cluster.stops.map((stop) => {
                const isNext = stop.id === nextStopId;
                const address = `${stop.addressLine1}${
                  stop.addressLine2 ? `, ${stop.addressLine2}` : ""
                }`;

                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => onStopClick?.(stop.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.625rem 0.75rem",
                      border: "none",
                      borderRadius: "8px",
                      background: isNext ? "#f0fdf4" : "transparent",
                      cursor: onStopClick ? "pointer" : "default",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: "0.875rem",
                            marginBottom: "0.15rem",
                          }}
                        >
                          {stop.customerName || stop.userEmail || "Customer"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={address}
                        >
                          {address}
                        </div>
                      </div>
                      {isNext && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            color: "#16a34a",
                            background: "#dcfce7",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Next
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
