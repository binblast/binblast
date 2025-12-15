// components/EmployeeDashboard/PhotoExamples.tsx
// Component showing good vs bad photo examples for employee guidance

"use client";

interface PhotoExamplesProps {
  photoType: "inside" | "outside" | "dumpster_pad" | "sticker_placement";
}

export function PhotoExamples({ photoType }: PhotoExamplesProps) {
  const getExamples = () => {
    switch (photoType) {
      case "inside":
        return {
          title: "Inside Bin Photo",
          good: {
            title: "Good Example",
            description: "Clear, well-lit, close-up view showing clean base and walls",
            tips: [
              "Camera angled downward",
              "Good lighting",
              "Close enough to see details",
              "Clean interior visible",
            ],
          },
          bad: {
            title: "Bad Example",
            description: "Blurry, dark, or too far away",
            tips: [
              "Too blurry to verify cleanliness",
              "Too dark to see details",
              "Too far away",
              "Wrong angle",
            ],
          },
        };
      case "outside":
        return {
          title: "Outside Bin Photo",
          description: "Full bin visible with sticker and clean exterior",
          good: {
            title: "Good Example",
            description: "Full bin visible, sticker placement clear, clean exterior",
            tips: [
              "Entire bin in frame",
              "Sticker clearly visible",
              "Good lighting",
              "Clean exterior visible",
            ],
          },
          bad: {
            title: "Bad Example",
            description: "Missing parts, poor lighting, or unclear",
            tips: [
              "Bin cut off in frame",
              "Too dark to see details",
              "Sticker not visible",
              "Blurry or out of focus",
            ],
          },
        };
      case "dumpster_pad":
        return {
          title: "Dumpster Pad Photo",
          good: {
            title: "Good Example",
            description: "Clear view of clean pad area",
            tips: [
              "Full pad area visible",
              "Good lighting",
              "Clean area clearly shown",
            ],
          },
          bad: {
            title: "Bad Example",
            description: "Unclear or incomplete view",
            tips: [
              "Too dark",
              "Area not fully visible",
              "Blurry",
            ],
          },
        };
      case "sticker_placement":
        return {
          title: "Sticker Placement Photo",
          good: {
            title: "Good Example",
            description: "Close-up of sticker placement",
            tips: [
              "Sticker clearly visible",
              "Placement location shown",
              "Good lighting",
            ],
          },
          bad: {
            title: "Bad Example",
            description: "Sticker not visible or unclear",
            tips: [
              "Too far away",
              "Sticker not visible",
              "Poor lighting",
            ],
          },
        };
      default:
        return null;
    }
  };

  const examples = getExamples();
  if (!examples) return null;

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "#111827",
          marginBottom: "0.75rem",
        }}
      >
        Photo Examples: {examples.title}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Good Example */}
        <div
          style={{
            padding: "0.75rem",
            background: "#ffffff",
            border: "2px solid #16a34a",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: "#16a34a",
              marginBottom: "0.5rem",
            }}
          >
            ✓ {examples.good.title}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            {examples.good.description}
          </div>
          <ul
            style={{
              fontSize: "0.7rem",
              color: "#374151",
              margin: 0,
              paddingLeft: "1.25rem",
              listStyleType: "disc",
            }}
          >
            {examples.good.tips.map((tip, idx) => (
              <li key={idx} style={{ marginBottom: "0.25rem" }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Bad Example */}
        <div
          style={{
            padding: "0.75rem",
            background: "#ffffff",
            border: "2px solid #dc2626",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: "#dc2626",
              marginBottom: "0.5rem",
            }}
          >
            ✗ {examples.bad.title}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            {examples.bad.description}
          </div>
          <ul
            style={{
              fontSize: "0.7rem",
              color: "#374151",
              margin: 0,
              paddingLeft: "1.25rem",
              listStyleType: "disc",
            }}
          >
            {examples.bad.tips.map((tip, idx) => (
              <li key={idx} style={{ marginBottom: "0.25rem" }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
