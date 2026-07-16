"use client";

import type { CSSProperties, ReactNode } from "react";

const panelStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  padding: "1rem",
  height: "100%",
  minHeight: "260px",
  display: "flex",
  flexDirection: "column",
  gap: "0.65rem",
  overflow: "hidden",
};

const chip = (label: string, active = false, color?: string): ReactNode => (
  <span
    key={label}
    style={{
      padding: "0.3rem 0.65rem",
      borderRadius: "999px",
      fontSize: "0.65rem",
      fontWeight: 600,
      background: active ? (color || "#16a34a") : "#f3f4f6",
      color: active ? "#ffffff" : "#6b7280",
      border: active ? "none" : "1px solid #e5e7eb",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

const miniCard = (title: string, value: string, color: string): ReactNode => (
  <div
    key={title}
    style={{
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      padding: "0.65rem 0.75rem",
      flex: 1,
      minWidth: "70px",
    }}
  >
    <div style={{ fontSize: "0.6rem", color: "#6b7280", marginBottom: "0.2rem" }}>{title}</div>
    <div style={{ fontSize: "1.1rem", fontWeight: 700, color }}>{value}</div>
  </div>
);

const exampleRow = (scenario: string, action: string, tone: string): ReactNode => (
  <div
    key={scenario}
    style={{
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      padding: "0.65rem 0.75rem",
      fontSize: "0.68rem",
      lineHeight: 1.45,
    }}
  >
    <div style={{ color: "#374151", marginBottom: "0.25rem" }}>
      <span style={{ color: tone, fontWeight: 700 }}>Example: </span>
      {scenario}
    </div>
    <div style={{ color: "#6b7280" }}>
      <span style={{ color: "#60a5fa", fontWeight: 600 }}>→ </span>
      {action}
    </div>
  </div>
);

const PREVIEWS: Record<string, () => ReactNode> = {
  welcome: () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.65rem", color: "#6b7280", letterSpacing: "0.08em", fontWeight: 700 }}>
        BLAST COMMAND
      </div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
        Your daily operations hub
      </div>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {chip("Overview", true)}
        {chip("Employees")}
        {chip("Customers")}
        {chip("Schedule")}
        {chip("Messages")}
      </div>
      <div
        style={{
          flex: 1,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #dcfce7 0%, #dbeafe 100%)",
          border: "1px solid #bbf7d0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#166534",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        Map · Fleet · Routes · Pay — all in one place
      </div>
    </div>
  ),

  tabs: () => (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {chip("Overview", true, "#16a34a")}
        {chip("Employees")}
        {chip("Customers")}
        {chip("Schedule")}
        {chip("Messages")}
      </div>
      {exampleRow(
        "7:00 AM status check",
        "Overview → Live Map, then Schedule → Today",
        "#fbbf24"
      )}
      {exampleRow(
        "Driver stuck on a stop",
        "Employees → find driver → Messages to reply",
        "#f87171"
      )}
    </div>
  ),

  "live-map": () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Live Fleet Map</div>
      <div
        style={{
          flex: 1,
          borderRadius: "10px",
          background: "linear-gradient(180deg, #1e3a5f 0%, #0f2744 100%)",
          border: "1px solid rgba(96,165,250,0.2)",
          position: "relative",
          minHeight: "140px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "28%",
            left: "22%",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "#3b82f6",
            boxShadow: "0 0 0 4px rgba(59,130,246,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: "58%",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#16a34a",
            boxShadow: "0 0 0 3px rgba(22,163,74,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "72%",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#16a34a",
            boxShadow: "0 0 0 3px rgba(22,163,74,0.3)",
          }}
        />
        <div style={{ position: "absolute", bottom: "8px", left: "8px", fontSize: "0.6rem", color: "#93c5fd" }}>
          ● Driver on shift &nbsp; ● Stop location
        </div>
      </div>
      {exampleRow("3 drivers on map, 4 scheduled", "Employees → Not Started → call missing driver", "#fbbf24")}
    </div>
  ),

  "overview-stats": () => (
    <div style={panelStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {miniCard("Direct Customers", "142", "#111827")}
        {miniCard("Upcoming", "18", "#60a5fa")}
        {miniCard("Completed Week", "87", "#4ade80")}
        {miniCard("Open Issues", "3", "#f87171")}
      </div>
      {exampleRow("Open Issues jumped to 3", "Employees → Has Flags → resolve each", "#f87171")}
    </div>
  ),

  "fleet-status": () => (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        {chip("Fleet Status", true, "#111827")}
        {chip("Hours & Pay")}
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {miniCard("On Shift", "1", "#4ade80")}
        {miniCard("Not Started", "0", "#f87171")}
        {miniCard("Open Flags", "0", "#fbbf24")}
      </div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "#111827", fontWeight: 700, fontSize: "0.8rem" }}>James Robert</span>
          <span style={{ color: "#86efac", fontSize: "0.65rem", fontWeight: 600 }}>Clocked In · 3:45 PM</span>
        </div>
        <div style={{ background: "rgba(22,163,74,0.2)", color: "#86efac", fontSize: "0.65rem", padding: "0.3rem 0.5rem", borderRadius: "6px", marginBottom: "0.5rem" }}>
          Route complete
        </div>
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.65rem", color: "#6b7280" }}>
          <span>Assigned: <strong style={{ color: "#374151" }}>4</strong></span>
          <span>Done: <strong style={{ color: "#4ade80" }}>4</strong></span>
          <span>Left: <strong style={{ color: "#374151" }}>0</strong></span>
        </div>
      </div>
    </div>
  ),

  "employee-card": () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Employee profile actions</div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {chip("Open Route", true, "#2563eb")}
        {chip("Photos")}
        {chip("Adjust Pay")}
        {chip("Message")}
      </div>
      {exampleRow("Driver missing a stop", "Profile → Stop List → confirm assignment", "#fbbf24")}
      {exampleRow("Heavy cleaning bonus needed", "Profile → stop → Adjust Pay", "#60a5fa")}
    </div>
  ),

  "open-flags": () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 700 }}>⚑ Open Flags (2)</div>
      <div
        style={{
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
          color: "#fecaca",
        }}
      >
        Missing after photo — 123 Oak St
        <div style={{ color: "#6b7280", marginTop: "0.2rem" }}>James Robert · Today 2:15 PM</div>
      </div>
      <div
        style={{
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
          color: "#fde68a",
        }}
      >
        Gate locked — cannot access bins
        <div style={{ color: "#6b7280", marginTop: "0.2rem" }}>Maria Lopez · Today 11:00 AM</div>
      </div>
      {exampleRow("Missing photo flag", "Message driver to re-upload → mark resolved", "#f87171")}
    </div>
  ),

  "hours-pay": () => (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        {chip("Fleet Status")}
        {chip("Hours & Pay", true, "#111827")}
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {miniCard("Bins Today", "12", "#111827")}
        {miniCard("Pay Today", "$68", "#4ade80")}
        {miniCard("Week Pay", "$312", "#4ade80")}
      </div>
      <div
        style={{
          fontSize: "0.68rem",
          color: "#6b7280",
          background: "#f9fafb",
          borderRadius: "8px",
          padding: "0.6rem 0.75rem",
          lineHeight: 1.5,
        }}
      >
        <div style={{ color: "#374151", marginBottom: "0.25rem", fontWeight: 600 }}>Per-bin example</div>
        2-bin stop = $8 + $2 = <span style={{ color: "#4ade80", fontWeight: 700 }}>$10.00</span>
        <br />
        4-bin commercial = $8 + $2 + $2 + $2 = <span style={{ color: "#4ade80", fontWeight: 700 }}>$14.00</span>
      </div>
    </div>
  ),

  "schedule-board": () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Schedule & Route Board</div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", marginBottom: "0.35rem" }}>
          <span>456 Pine Ave — 2 bins</span>
          <span style={{ color: "#f87171", fontWeight: 600 }}>Unassigned</span>
        </div>
        <div style={{ color: "#6b7280", fontSize: "0.62rem" }}>Today · Residential</div>
      </div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", marginBottom: "0.35rem" }}>
          <span>789 Elm St — 1 bin</span>
          <span style={{ color: "#4ade80", fontWeight: 600 }}>James R.</span>
        </div>
        <div style={{ color: "#6b7280", fontSize: "0.62rem" }}>Today · In Progress</div>
      </div>
      {exampleRow("4 jobs still unassigned", "Unassigned filter → assign each before dispatch", "#f87171")}
    </div>
  ),

  "schedule-filters": () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.65rem", color: "#6b7280", marginBottom: "0.15rem" }}>Morning workflow</div>
      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
        {chip("Unassigned", true, "#dc2626")}
        {chip("Today", true, "#2563eb")}
        {chip("Ready Today")}
        {chip("In Progress")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.25rem" }}>
        {[
          { step: "1", label: "Unassigned = 0", done: true },
          { step: "2", label: "Today count matches map", done: true },
          { step: "3", label: "Ready Today cleared", done: false },
        ].map((item) => (
          <div
            key={item.step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.68rem",
              color: item.done ? "#86efac" : "#6b7280",
            }}
          >
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: item.done ? "#16a34a" : "#e5e7eb",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.done ? "✓" : item.step}
            </span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  ),

  customers: () => (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
        {chip("Quote Leads")}
        {chip("Residential", true, "#111827")}
        {chip("Commercial")}
      </div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
        }}
      >
        <div style={{ color: "#374151", fontWeight: 600 }}>Sarah Mitchell</div>
        <div style={{ color: "#4ade80", fontSize: "0.62rem" }}>Active · Sparkle Plan</div>
        <div style={{ color: "#fbbf24", marginTop: "0.35rem", fontSize: "0.62rem" }}>
          Note: Gate code 4521 — bins behind garage
        </div>
      </div>
      {exampleRow("Paused account still on schedule", "Remove from schedule or contact customer", "#f87171")}
    </div>
  ),

  quotes: () => (
    <div style={panelStyle}>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)",
          border: "1px solid rgba(251,191,36,0.3)",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
          color: "#fde68a",
        }}
      >
        🔔 2 New Custom Quote Requests
      </div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.65rem 0.75rem",
          fontSize: "0.68rem",
        }}
      >
        <div style={{ color: "#374151", fontWeight: 600 }}>Oakwood HOA — 40 units</div>
        <div style={{ color: "#6b7280", fontSize: "0.62rem" }}>Commercial · Pending review</div>
      </div>
      {exampleRow("New commercial lead", "Review bins & access → create offer same day", "#fbbf24")}
    </div>
  ),

  messages: () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Team Messages</div>
      <div
        style={{
          background: "rgba(37,99,235,0.1)",
          border: "1px solid rgba(37,99,235,0.2)",
          borderRadius: "10px 10px 10px 2px",
          padding: "0.6rem 0.75rem",
          fontSize: "0.68rem",
          color: "#bfdbfe",
          alignSelf: "flex-start",
          maxWidth: "85%",
        }}
      >
        Customer not home, bins in backyard — what should I do?
        <div style={{ color: "#6b7280", fontSize: "0.58rem", marginTop: "0.2rem" }}>James · 2:34 PM</div>
      </div>
      <div
        style={{
          background: "rgba(22,163,74,0.15)",
          border: "1px solid rgba(22,163,74,0.25)",
          borderRadius: "10px 10px 2px 10px",
          padding: "0.6rem 0.75rem",
          fontSize: "0.68rem",
          color: "#bbf7d0",
          alignSelf: "flex-end",
          maxWidth: "85%",
        }}
      >
        Check side gate — code is on the stop notes. Call me if still blocked.
        <div style={{ color: "#6b7280", fontSize: "0.58rem", marginTop: "0.2rem" }}>You · 2:35 PM</div>
      </div>
    </div>
  ),

  checklist: () => (
    <div style={panelStyle}>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Morning checklist (~10 min)</div>
      {[
        "Live Map — all drivers clocked in?",
        "Unassigned — every job has a driver?",
        "Today / Ready Today — route count right?",
        "Has Flags — issues cleared?",
        "Quote Leads — new requests answered?",
      ].map((item, i) => (
        <div
          key={item}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.68rem",
            color: "#cbd5e1",
            background: "#f9fafb",
            borderRadius: "8px",
            padding: "0.45rem 0.6rem",
          }}
        >
          <span
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.55rem",
              color: "#6b7280",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          {item}
        </div>
      ))}
    </div>
  ),

  complete: () => (
    <div style={panelStyle}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>✓</div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>You're all set</div>
        <div style={{ fontSize: "0.72rem", color: "#6b7280", lineHeight: 1.5, maxWidth: "220px" }}>
          Reopen anytime with <strong style={{ color: "#374151" }}>? Take a Tour</strong> in the dashboard header
        </div>
      </div>
    </div>
  ),
};

interface OperatorTourSlidePreviewProps {
  previewId: string;
}

export function OperatorTourSlidePreview({ previewId }: OperatorTourSlidePreviewProps) {
  const render = PREVIEWS[previewId] || PREVIEWS.welcome;
  return <>{render()}</>;
}
