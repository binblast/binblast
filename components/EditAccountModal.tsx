"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  onUpdated: (data: { firstName: string; lastName: string; phone: string }) => void;
}

export function EditAccountModal({
  isOpen,
  onClose,
  userId,
  initialData,
  onUpdated,
}: EditAccountModalProps) {
  const isMobile = useIsMobile();
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [phone, setPhone] = useState(initialData.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName(initialData.firstName);
    setLastName(initialData.lastName);
    setPhone(initialData.phone || "");
    setError(null);
    setSuccess(false);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function getAuthToken(): Promise<string | null> {
    try {
      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      const user = auth?.currentUser;
      if (!user || user.uid !== userId) return null;
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("You must be signed in to update your account.");
      }

      const response = await fetch("/api/account/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update account");
      }

      try {
        const { getAuthInstance, updateProfile } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: `${firstName.trim()} ${lastName.trim()}`,
          });
        }
      } catch {
        // Non-blocking if auth profile update fails
      }

      setSuccess(true);
      onUpdated({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "16px",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      className={isMobile ? "mobile-modal-overlay" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : "1rem",
      }}
      onClick={onClose}
    >
      <div
        className={isMobile ? "mobile-modal-content" : undefined}
        style={{
          background: "#ffffff",
          borderRadius: isMobile ? "16px 16px 0 0" : "12px",
          padding: isMobile
            ? "1.25rem 1rem calc(1.25rem + env(safe-area-inset-bottom))"
            : "2rem",
          maxWidth: isMobile ? "100%" : "480px",
          width: "100%",
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#111827" }}>
          Edit Account Info
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
          Update your contact details below.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Email
              </label>
              <input
                type="email"
                readOnly
                value={initialData.email}
                style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280" }}
              />
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.375rem" }}>
                Email cannot be changed here. Contact support if you need to update it.
              </p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "8px",
                color: "#166534",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              Account updated successfully.
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexDirection: isMobile ? "column-reverse" : "row" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "0.75rem 1rem",
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "0.75rem 1rem",
                background: loading ? "#9ca3af" : "#16a34a",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
