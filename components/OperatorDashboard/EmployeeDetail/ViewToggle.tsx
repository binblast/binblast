// components/OperatorDashboard/EmployeeDetail/ViewToggle.tsx
"use client";

interface ViewToggleProps {
  currentView: "list" | "map" | "nearby";
  onViewChange: (view: "list" | "map" | "nearby") => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div style={{
      display: "flex",
      gap: "0.5rem",
      marginBottom: "1rem",
      borderBottom: "2px solid #e5e7eb",
    }}>
      <button
        onClick={() => onViewChange("list")}
        style={{
          padding: "0.5rem 1rem",
          border: "none",
          background: currentView === "list" ? "#10b981" : "transparent",
          color: currentView === "list" ? "#ffffff" : "#6b7280",
          fontWeight: currentView === "list" ? "600" : "400",
          cursor: "pointer",
          borderBottom: currentView === "list" ? "2px solid #10b981" : "2px solid transparent",
          marginBottom: "-2px",
          transition: "all 0.2s",
        }}
      >
        List
      </button>
      <button
        onClick={() => onViewChange("map")}
        style={{
          padding: "0.5rem 1rem",
          border: "none",
          background: currentView === "map" ? "#10b981" : "transparent",
          color: currentView === "map" ? "#ffffff" : "#6b7280",
          fontWeight: currentView === "map" ? "600" : "400",
          cursor: "pointer",
          borderBottom: currentView === "map" ? "2px solid #10b981" : "2px solid transparent",
          marginBottom: "-2px",
          transition: "all 0.2s",
        }}
      >
        Map
      </button>
      <button
        onClick={() => onViewChange("nearby")}
        style={{
          padding: "0.5rem 1rem",
          border: "none",
          background: currentView === "nearby" ? "#10b981" : "transparent",
          color: currentView === "nearby" ? "#ffffff" : "#6b7280",
          fontWeight: currentView === "nearby" ? "600" : "400",
          cursor: "pointer",
          borderBottom: currentView === "nearby" ? "2px solid #10b981" : "2px solid transparent",
          marginBottom: "-2px",
          transition: "all 0.2s",
        }}
      >
        Nearby
      </button>
    </div>
  );
}
