// components/OperatorDashboard/EmployeeDetail/JobPhotosViewer.tsx
// Component for viewing all job photos with thumbnails and expand view

"use client";

import { useState, useEffect } from "react";

interface JobPhoto {
  id: string;
  photoType: "inside" | "outside" | "dumpster_pad" | "sticker_placement";
  storageUrl: string;
  timestamp: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface JobPhotosViewerProps {
  cleaningId: string;
}

export function JobPhotosViewer({ cleaningId }: JobPhotosViewerProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [flaggedPhotos, setFlaggedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
    const interval = window.setInterval(loadPhotos, 15000);
    return () => window.clearInterval(interval);
  }, [cleaningId]);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/employee/jobs/${cleaningId}/photos`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error("Error loading job photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagPhoto = (photoId: string, issue: string) => {
    const newFlagged = new Set(flaggedPhotos);
    if (issue === "clear") {
      newFlagged.delete(photoId);
    } else {
      newFlagged.add(photoId);
    }
    setFlaggedPhotos(newFlagged);
    // In a real implementation, this would save to the backend
    console.log(`Flagged photo ${photoId} with issue: ${issue}`);
  };

  if (loading) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
        Loading photos...
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div
        style={{
          padding: "1rem",
          background: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          textAlign: "center",
          color: "#991b1b",
          marginBottom: "1rem",
        }}
      >
        No photos found for this job
      </div>
    );
  }

  // Group photos by type
  const requiredPhotos = photos.filter((p) => p.photoType === "inside" || p.photoType === "outside");
  const optionalPhotos = photos.filter((p) => p.photoType !== "inside" && p.photoType !== "outside");

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {requiredPhotos.length > 0 && (
        <PhotoGroupDropdown
          title={`Required Photos (${requiredPhotos.length})`}
          defaultOpen
          photos={requiredPhotos}
          expandedPhoto={expandedPhoto}
          onExpandPhoto={(photoId) =>
            setExpandedPhoto(expandedPhoto === photoId ? null : photoId)
          }
          flaggedPhotos={flaggedPhotos}
          onFlagPhoto={handleFlagPhoto}
        />
      )}

      {optionalPhotos.length > 0 && (
        <PhotoGroupDropdown
          title={`Optional Photos (${optionalPhotos.length})`}
          photos={optionalPhotos}
          expandedPhoto={expandedPhoto}
          onExpandPhoto={(photoId) =>
            setExpandedPhoto(expandedPhoto === photoId ? null : photoId)
          }
          flaggedPhotos={flaggedPhotos}
          onFlagPhoto={handleFlagPhoto}
        />
      )}

      {/* Expanded Photo Modal */}
      {expandedPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
          onClick={() => setExpandedPhoto(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedPhoto(null)}
              style={{
                position: "absolute",
                top: "-2.5rem",
                right: 0,
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "2rem",
                cursor: "pointer",
                padding: "0.5rem",
              }}
            >
              ×
            </button>
            <img
              src={photos.find((p) => p.id === expandedPhoto)?.storageUrl || ""}
              alt="Expanded view"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface PhotoGroupDropdownProps {
  title: string;
  photos: JobPhoto[];
  expandedPhoto: string | null;
  onExpandPhoto: (photoId: string) => void;
  flaggedPhotos: Set<string>;
  onFlagPhoto: (photoId: string, issue: string) => void;
  defaultOpen?: boolean;
}

function PhotoGroupDropdown({
  title,
  photos,
  expandedPhoto,
  onExpandPhoto,
  flaggedPhotos,
  onFlagPhoto,
  defaultOpen = false,
}: PhotoGroupDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: "0.75rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: isOpen ? "#f9fafb" : "#ffffff",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: "0.75rem 1rem 1rem",
            borderTop: "1px solid #e5e7eb",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              isExpanded={expandedPhoto === photo.id}
              onExpand={() => onExpandPhoto(photo.id)}
              isFlagged={flaggedPhotos.has(photo.id)}
              onFlag={onFlagPhoto}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: JobPhoto;
  isExpanded: boolean;
  onExpand: () => void;
  isFlagged: boolean;
  onFlag: (photoId: string, issue: string) => void;
}

function PhotoThumbnail({ photo, isExpanded, onExpand, isFlagged, onFlag }: PhotoThumbnailProps) {
  const [showFlagMenu, setShowFlagMenu] = useState(false);

  const getPhotoTypeLabel = (type: string) => {
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
  };

  return (
    <div
      style={{
        position: "relative",
        border: isFlagged ? "2px solid #dc2626" : "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "0.5rem",
          left: "0.5rem",
          background: "rgba(0, 0, 0, 0.7)",
          color: "#ffffff",
          padding: "0.25rem 0.5rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "600",
          zIndex: 10,
        }}
      >
        {getPhotoTypeLabel(photo.photoType)}
      </div>

      {isFlagged && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            background: "#dc2626",
            color: "#ffffff",
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: "600",
            zIndex: 10,
          }}
        >
          ⚠ Flagged
        </div>
      )}

      <div
        onClick={onExpand}
        style={{
          cursor: "pointer",
          position: "relative",
          paddingTop: "75%", // 4:3 aspect ratio
          background: "#f3f4f6",
        }}
      >
        <img
          src={photo.storageUrl}
          alt={getPhotoTypeLabel(photo.photoType)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <div
        style={{
          padding: "0.5rem",
          background: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          {photo.timestamp
            ? new Date(photo.timestamp).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "N/A"}
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFlagMenu(!showFlagMenu);
            }}
            style={{
              background: isFlagged ? "#fee2e2" : "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              cursor: "pointer",
              color: isFlagged ? "#dc2626" : "#6b7280",
            }}
          >
            {isFlagged ? "Flagged" : "Flag"}
          </button>
          {showFlagMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                right: 0,
                marginBottom: "0.25rem",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 20,
                minWidth: "180px",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFlag(photo.id, "missing");
                  setShowFlagMenu(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                Missing Photo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFlag(photo.id, "poor_quality");
                  setShowFlagMenu(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                Poor Quality
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFlag(photo.id, "wrong_location");
                  setShowFlagMenu(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                Wrong Location
              </button>
              {isFlagged && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlag(photo.id, "clear");
                    setShowFlagMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    color: "#dc2626",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  Clear Flag
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {photo.gpsCoordinates && (
        <div
          style={{
            padding: "0.25rem 0.5rem",
            fontSize: "0.7rem",
            color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          📍 GPS: {photo.gpsCoordinates.latitude.toFixed(4)}, {photo.gpsCoordinates.longitude.toFixed(4)}
        </div>
      )}
    </div>
  );
}
