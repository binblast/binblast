// components/OperatorDashboard/EmployeeDetail/ProofOfWorkSection.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { parseFirestoreTimestamp } from "@/lib/employee-utils";
import { JobPhotosViewer } from "./JobPhotosViewer";

interface ProofPhoto {
  id: string;
  photoType: string;
  storageUrl: string;
  timestamp: string;
}

interface Proof {
  cleaningId: string;
  completionPhotoUrl: string | null;
  insidePhotoUrl?: string | null;
  outsidePhotoUrl?: string | null;
  previewPhotoUrl?: string | null;
  photos?: ProofPhoto[];
  photoCount?: number;
  employeeNotes: string | null;
  operatorNotes: string | null;
  flags: string[];
  completedAt: string | null;
  scheduledDate: string | null;
  scheduledTime?: string | null;
  customerName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  operatorSkipPhotos?: boolean;
}

interface ProofOfWorkSectionProps {
  employeeId: string;
  cleaningId?: string;
  refreshKey?: number;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompletedAt(value: string | null | undefined): string {
  const date = value ? parseFirestoreTimestamp(value) : null;
  if (!date) return "Completion time unavailable";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAddress(proof: Proof): string {
  return [proof.addressLine1, proof.addressLine2, proof.city, proof.state, proof.zipCode]
    .filter(Boolean)
    .join(", ");
}

function getPhotoTypeLabel(type: string): string {
  switch (type) {
    case "inside":
      return "Inside";
    case "outside":
      return "Outside";
    case "dumpster_pad":
      return "Dumpster Pad";
    case "sticker_placement":
      return "Sticker";
    default:
      return type;
  }
}

export function ProofOfWorkSection({
  employeeId,
  cleaningId,
  refreshKey = 0,
}: ProofOfWorkSectionProps) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadProof = useCallback(async () => {
    try {
      const url = cleaningId
        ? `/api/operator/employees/${employeeId}/proof?cleaningId=${cleaningId}`
        : `/api/operator/employees/${employeeId}/proof?todayOnly=0`;

      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to load cleaning photos");
      }

      if (cleaningId) {
        setProof(data.proof || null);
      } else {
        setProofs(data.proofs || []);
      }

      setError(null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load cleaning photos");
    } finally {
      setLoading(false);
    }
  }, [employeeId, cleaningId]);

  useEffect(() => {
    setLoading(true);
    loadProof();
  }, [loadProof, refreshKey]);

  useEffect(() => {
    const pollInterval = window.setInterval(loadProof, 15000);
    return () => window.clearInterval(pollInterval);
  }, [loadProof]);

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading cleaning photos...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
            Cleaning Photos
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
            Photos employees take at each job to confirm the bins were cleaned. Review these to verify quality.
          </p>
        </div>
        {lastSync && (
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Updated {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {cleaningId && proof ? (
        <div>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
            Proof for This Stop
          </h4>
          <ProofDetailCard proof={proof} expanded onToggleExpand={() => undefined} />
        </div>
      ) : (
        <div>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
            Recent Proof ({proofs.length})
          </h4>
          {proofs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              No completed jobs with photos yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {proofs.slice(0, 20).map((item) => (
                <ProofDetailCard
                  key={item.cleaningId}
                  proof={item}
                  expanded={expandedProofId === item.cleaningId}
                  onToggleExpand={() =>
                    setExpandedProofId((current) =>
                      current === item.cleaningId ? null : item.cleaningId
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofDetailCard({
  proof,
  expanded,
  onToggleExpand,
}: {
  proof: Proof;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const photos = proof.photos || [];
  const hasPhotos = photos.length > 0 || !!proof.previewPhotoUrl;

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div style={{ fontSize: "1rem", fontWeight: "700", color: "#111827" }}>
            {proof.customerName || "Customer"}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.2rem" }}>
            {formatAddress(proof) || "Address unavailable"}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.8125rem", color: "#6b7280" }}>
          <div>
            <strong>Scheduled:</strong> {formatDateLabel(proof.scheduledDate)}
            {proof.scheduledTime ? ` · ${proof.scheduledTime}` : ""}
          </div>
          <div style={{ marginTop: "0.2rem" }}>
            <strong>Completed:</strong> {formatCompletedAt(proof.completedAt)}
          </div>
        </div>
      </div>

      {proof.operatorSkipPhotos && (
        <div
          style={{
            marginBottom: "0.75rem",
            padding: "0.65rem 0.75rem",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            color: "#92400e",
            fontSize: "0.8125rem",
            fontWeight: "600",
          }}
        >
          Cleared by operator — photos not required
        </div>
      )}

      {!hasPhotos && !proof.operatorSkipPhotos ? (
        <div
          style={{
            padding: "1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            textAlign: "center",
            color: "#991b1b",
            fontSize: "0.875rem",
          }}
        >
          No photos uploaded for this stop.
        </div>
      ) : photos.length > 0 ? (
        expanded ? (
          <JobPhotosViewer cleaningId={proof.cleaningId} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {photos.slice(0, 4).map((photo) => (
              <ProofPhotoThumbnail key={photo.id} photo={photo} />
            ))}
          </div>
        )
      ) : proof.previewPhotoUrl ? (
        <ProofPhotoThumbnail
          photo={{
            id: proof.cleaningId,
            photoType: "proof",
            storageUrl: proof.previewPhotoUrl,
            timestamp: proof.completedAt || "",
          }}
        />
      ) : null}

      {photos.length > 0 && (
        <button
          type="button"
          onClick={onToggleExpand}
          style={{
            marginTop: "0.75rem",
            padding: "0.45rem 0.75rem",
            background: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            fontWeight: "600",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          {expanded ? "Show photo previews" : `View all ${photos.length} photos`}
        </button>
      )}

      {(proof.employeeNotes || proof.operatorNotes) && (
        <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
          {proof.employeeNotes && (
            <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
              <strong>Employee notes:</strong> {proof.employeeNotes}
            </div>
          )}
          {proof.operatorNotes && (
            <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
              <strong>Operator notes:</strong> {proof.operatorNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofPhotoThumbnail({ photo }: { photo: ProofPhoto }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          position: "relative",
          paddingTop: "75%",
          background: "#f3f4f6",
        }}
      >
        {!failed ? (
          <img
            src={photo.storageUrl}
            alt={getPhotoTypeLabel(photo.photoType)}
            onError={() => setFailed(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#991b1b",
            }}
          >
            Photo unavailable
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "0.4rem",
            left: "0.4rem",
            background: "rgba(17, 24, 39, 0.78)",
            color: "#ffffff",
            padding: "0.2rem 0.45rem",
            borderRadius: "4px",
            fontSize: "0.7rem",
            fontWeight: "600",
          }}
        >
          {getPhotoTypeLabel(photo.photoType)}
        </div>
      </div>
      {photo.timestamp && (
        <div style={{ padding: "0.45rem 0.5rem", fontSize: "0.7rem", color: "#6b7280" }}>
          {formatCompletedAt(photo.timestamp)}
        </div>
      )}
    </div>
  );
}
