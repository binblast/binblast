// components/EmployeeDashboard/BinBlasterLevel.tsx
"use client";

interface BinBlasterLevelProps {
  lifetimeJobs: number;
  todayStreak?: number;
  badges?: string[];
}

interface LevelInfo {
  name: string;
  minJobs: number;
  color: string;
  bgColor: string;
  icon: string;
}

const LEVELS: LevelInfo[] = [
  {
    name: "Rookie",
    minJobs: 0,
    color: "#6b7280",
    bgColor: "#f3f4f6",
    icon: "",
  },
  {
    name: "Pro",
    minJobs: 25,
    color: "#2563eb",
    bgColor: "#dbeafe",
    icon: "",
  },
  {
    name: "Elite",
    minJobs: 100,
    color: "#7c3aed",
    bgColor: "#ede9fe",
    icon: "",
  },
  {
    name: "Master",
    minJobs: 250,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    icon: "",
  },
];

function getLevel(jobs: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (jobs >= LEVELS[i].minJobs) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

function getNextLevel(jobs: number): LevelInfo | null {
  const currentLevel = getLevel(jobs);
  const currentIndex = LEVELS.findIndex((l) => l.name === currentLevel.name);
  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1];
  }
  return null;
}

export function BinBlasterLevel({
  lifetimeJobs,
  todayStreak = 0,
  badges = [],
}: BinBlasterLevelProps) {
  const currentLevel = getLevel(lifetimeJobs);
  const nextLevel = getNextLevel(lifetimeJobs);
  const progressToNext =
    nextLevel
      ? Math.min(
          ((lifetimeJobs - currentLevel.minJobs) /
            (nextLevel.minJobs - currentLevel.minJobs)) *
            100,
          100
        )
      : 100;

  const commonBadges = [
    { name: "10 Jobs Day", icon: "", earned: lifetimeJobs >= 10 },
    {
      name: "Perfect Proof-of-Work",
      icon: "",
      earned: badges.includes("perfect_photos"),
    },
    {
      name: "On-time Streak",
      icon: "",
      earned: todayStreak >= 5,
    },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#111827",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        Bin Blaster Level
      </div>

      {/* Current Level */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {currentLevel.icon && (
          <div
            style={{
              fontSize: "2rem",
              lineHeight: "1",
            }}
          >
            {currentLevel.icon}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: currentLevel.color,
              marginBottom: "0.25rem",
            }}
          >
            {currentLevel.name}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            {lifetimeJobs} jobs completed lifetime
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            <span>Progress to {nextLevel.name}</span>
            <span>
              {lifetimeJobs} / {nextLevel.minJobs} jobs
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#f3f4f6",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressToNext}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${currentLevel.color} 0%, ${nextLevel.color} 100%)`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Today's Streak */}
      {todayStreak > 0 && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fef3c7",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#92400e",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {todayStreak} job{todayStreak !== 1 ? "s" : ""} completed today
        </div>
      )}

      {/* Badges */}
      {commonBadges.some((b) => b.earned) && (
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#6b7280",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Badges
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {commonBadges.map(
              (badge) =>
                badge.earned && (
                  <div
                    key={badge.name}
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: "#111827",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      border: "1px solid #e5e7eb",
                    }}
                    title={badge.name}
                  >
                    {badge.icon && <span>{badge.icon}</span>}
                    <span>{badge.name}</span>
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

