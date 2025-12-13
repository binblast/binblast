// components/OperatorDashboard/EmployeeDetail/ZonesCountiesPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { georgiaCounties } from "@/data/gaCounties";
import { metroAtlZones } from "@/data/metroAtlZones";

interface ZonesCountiesPanelProps {
  employeeId: string;
}

export function ZonesCountiesPanel({ employeeId }: ZonesCountiesPanelProps) {
  const [counties, setCounties] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCoverage();
  }, [employeeId]);

  const loadCoverage = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/coverage`);
      if (response.ok) {
        const data = await response.json();
        setCounties(data.counties || []);
        setZones(data.zones || []);
      }
    } catch (error) {
      console.error("Error loading coverage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/coverage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counties, zones }),
      });

      if (!response.ok) {
        throw new Error("Failed to save coverage");
      }

      alert("Coverage updated successfully");
    } catch (error: any) {
      alert(error.message || "Failed to save coverage");
    } finally {
      setSaving(false);
    }
  };

  const toggleCounty = (countyName: string) => {
    setCounties(prev => 
      prev.includes(countyName)
        ? prev.filter(c => c !== countyName)
        : [...prev, countyName]
    );
  };

  const toggleZone = (zoneName: string) => {
    setZones(prev => 
      prev.includes(zoneName)
        ? prev.filter(z => z !== zoneName)
        : [...prev, zoneName]
    );
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading coverage...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Zones & Coverage
      </h3>

      {/* Counties Section */}
      <div style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "0.75rem", fontSize: "1rem", fontWeight: "600", color: "#374151" }}>
          Georgia Counties ({counties.length} selected)
        </label>
        <div style={{
          maxHeight: "300px",
          overflowY: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1rem",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "0.5rem",
          }}>
            {georgiaCounties.map((county) => (
              <label
                key={county.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  cursor: "pointer",
                  borderRadius: "4px",
                  background: counties.includes(county.name) ? "#f0fdf4" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={counties.includes(county.name)}
                  onChange={() => toggleCounty(county.name)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                  {county.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Zones Section */}
      <div style={{ marginBottom: "2rem" }}>
        <label style={{ display: "block", marginBottom: "0.75rem", fontSize: "1rem", fontWeight: "600", color: "#374151" }}>
          Metro Atlanta Zones ({zones.length} selected)
        </label>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}>
          {metroAtlZones.map((zone) => (
            <label
              key={zone}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: "pointer",
                background: zones.includes(zone) ? "#f0fdf4" : "#ffffff",
              }}
            >
              <input
                type="checkbox"
                checked={zones.includes(zone)}
                onChange={() => toggleZone(zone)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", color: "#374151", fontWeight: zones.includes(zone) ? "600" : "400" }}>
                {zone}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.75rem 1.5rem",
          background: saving ? "#9ca3af" : "#16a34a",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.95rem",
          fontWeight: "600",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.5 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Coverage"}
      </button>
    </div>
  );
}

