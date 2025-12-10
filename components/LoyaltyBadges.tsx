// components/LoyaltyBadges.tsx
"use client";

import { useState, useEffect } from "react";
import { getDbInstance } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

interface LoyaltyBadgesProps {
  userId: string;
}

interface BadgeLevel {
  level: number;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  minServices: number;
}

const BADGE_LEVELS: BadgeLevel[] = [
  {
    level: 1,
    name: "Clean Freak",
    description: "Getting started!",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    icon: "",
    minServices: 1
  },
  {
    level: 2,
    name: "Bin Boss",
    description: "5+ cleanings completed",
    color: "#3b82f6",
    bgColor: "#dbeafe",
    icon: "",
    minServices: 5
  },
  {
    level: 3,
    name: "Sparkle Specialist",
    description: "15+ cleanings completed",
    color: "#8b5cf6",
    bgColor: "#ede9fe",
    icon: "",
    minServices: 15
  },
  {
    level: 4,
    name: "Sanitation Superstar",
    description: "30+ cleanings completed",
    color: "#f59e0b",
    bgColor: "#fef3c7",
    icon: "",
    minServices: 30
  },
  {
    level: 5,
    name: "Bin Royalty",
    description: "50+ cleanings completed",
    color: "#dc2626",
    bgColor: "#fee2e2",
    icon: "",
    minServices: 50
  }
];

export function LoyaltyBadges({ userId }: LoyaltyBadgesProps) {
  const [currentLevel, setCurrentLevel] = useState<BadgeLevel>(BADGE_LEVELS[0]);
  const [completedServices, setCompletedServices] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [nextLevel, setNextLevel] = useState<BadgeLevel | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    async function loadLoyaltyData() {
      try {
        const db = await getDbInstance();
        if (!db || !userId) return;

        // Count completed cleanings
        const cleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("userId", "==", userId),
          where("status", "==", "completed")
        );
        const cleaningsSnapshot = await getDocs(cleaningsQuery);
        const completedCount = cleaningsSnapshot.size;

        setCompletedServices(completedCount);

        // Determine current level
        let userLevel = BADGE_LEVELS[0];
        for (let i = BADGE_LEVELS.length - 1; i >= 0; i--) {
          if (completedCount >= BADGE_LEVELS[i].minServices) {
            userLevel = BADGE_LEVELS[i];
            break;
          }
        }

        setCurrentLevel(userLevel);

        // Find next level
        const nextLevelIndex = BADGE_LEVELS.findIndex(
          level => level.minServices > completedCount
        );
        if (nextLevelIndex !== -1) {
          setNextLevel(BADGE_LEVELS[nextLevelIndex]);
          
          // Calculate progress to next level
          const currentMin = userLevel.minServices;
          const nextMin = BADGE_LEVELS[nextLevelIndex].minServices;
          const progressValue = ((completedCount - currentMin) / (nextMin - currentMin)) * 100;
          setProgress(Math.max(0, Math.min(100, progressValue)));
        } else {
          setNextLevel(null);
          setProgress(100); // Max level reached
        }
      } catch (error) {
        console.error("Error loading loyalty data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadLoyaltyData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <p style={{ color: "var(--text-light)" }}>Loading loyalty badge...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2.5rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      marginBottom: "1.5rem"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "0.5rem" }}>
        Loyalty & Badges
      </h2>
      <p style={{ 
        fontSize: "0.95rem", 
        color: "#6b7280", 
        marginBottom: "1.5rem"
      }}>
        Earn badges as you keep your bins fresh. The more cleanings, the higher your level.
      </p>

      {/* Current Badge */}
      <div style={{
        background: currentLevel.bgColor,
        borderRadius: "16px",
        padding: "2rem",
        border: `2px solid ${currentLevel.color}`,
        textAlign: "center",
        marginBottom: "1.5rem"
      }}>
        <div style={{
          fontSize: "4rem",
          marginBottom: "1rem"
        }}>
          {currentLevel.icon}
        </div>
        <div style={{
          fontSize: "1.5rem",
          fontWeight: "700",
          color: currentLevel.color,
          marginBottom: "0.5rem"
        }}>
          Level {currentLevel.level} – {currentLevel.name}
        </div>
        <div style={{
          fontSize: "0.875rem",
          color: "#6b7280",
          marginBottom: "1rem"
        }}>
          {currentLevel.description}
        </div>
        <div style={{
          fontSize: "0.875rem",
          color: "#6b7280",
          fontWeight: "500"
        }}>
          {completedServices} {completedServices === 1 ? "cleaning" : "cleanings"} completed
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem"
          }}>
            <span style={{
              fontSize: "0.875rem",
              color: "var(--text-light)",
              fontWeight: "500"
            }}>
              Progress to Level {nextLevel.level} – {nextLevel.name}
            </span>
            <span style={{
              fontSize: "0.875rem",
              color: "var(--text-light)",
              fontWeight: "600"
            }}>
              {completedServices} / {nextLevel.minServices}
            </span>
          </div>
          <div style={{
            width: "100%",
            height: "12px",
            background: "#e5e7eb",
            borderRadius: "999px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${nextLevel.color}, ${nextLevel.color}dd)`,
              borderRadius: "999px",
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>
      )}

      {/* All Badge Levels */}
      <div style={{
        padding: "1rem",
        background: "#f9fafb",
        borderRadius: "12px",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "var(--text-dark)",
          marginBottom: "1rem"
        }}>
          All Badge Levels:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {BADGE_LEVELS.map((badge) => {
            const isUnlocked = completedServices >= badge.minServices;
            const isCurrent = badge.level === currentLevel.level;
            
            return (
              <div
                key={badge.level}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem",
                  background: isCurrent ? badge.bgColor : "#ffffff",
                  borderRadius: "8px",
                  border: `1px solid ${isCurrent ? badge.color : "#e5e7eb"}`,
                  opacity: isUnlocked ? 1 : 0.6
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>
                  {isUnlocked ? badge.icon : "🔒"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "0.875rem",
                    fontWeight: isCurrent ? "700" : "500",
                    color: isCurrent ? badge.color : "var(--text-dark)"
                  }}>
                    Level {badge.level} – {badge.name}
                  </div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "#6b7280"
                  }}>
                    {badge.minServices} {badge.minServices === 1 ? "cleaning" : "cleanings"}
                  </div>
                </div>
                {isCurrent && (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: badge.color,
                    padding: "0.25rem 0.75rem",
                    background: "#ffffff",
                    borderRadius: "999px"
                  }}>
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

