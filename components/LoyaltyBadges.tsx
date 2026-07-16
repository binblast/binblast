// components/LoyaltyBadges.tsx
"use client";

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useFirebase } from "@/lib/firebase-context";
import { BRAND_MASCOT_SRC } from "@/lib/brand";
import {
  BADGE_LEVELS,
  getLoyaltyRankSummary,
} from "@/lib/loyalty-badges";

interface LoyaltyBadgesProps {
  userId: string;
}

export function LoyaltyBadges({ userId }: LoyaltyBadgesProps) {
  const [completedServices, setCompletedServices] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isReady: firebaseReady } = useFirebase();

  useEffect(() => {
    if (!firebaseReady || !userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadLoyaltyData() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const db = await getDbInstance();
        if (!db || !userId) return;

        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, where, getDocs } = firestore;

        const cleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("userId", "==", userId)
        );
        const cleaningsSnapshot = await getDocs(cleaningsQuery);
        const completedCount = cleaningsSnapshot.docs.filter((doc) => {
          const data = doc.data();
          return data.status === "completed" || data.jobStatus === "completed";
        }).length;

        if (mounted) {
          setCompletedServices(completedCount);
        }
      } catch (error) {
        console.error("Error loading loyalty data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLoyaltyData();

    return () => {
      mounted = false;
    };
  }, [firebaseReady, userId]);

  const rankSummary = useMemo(() => getLoyaltyRankSummary(completedServices), [completedServices]);
  const unlockedLevel = rankSummary.unlocked;
  const nextLevel = rankSummary.next;
  const progressPercent = rankSummary.progressPercent;

  const displayTitle = unlockedLevel
    ? `Level ${unlockedLevel.level} – ${unlockedLevel.name}`
    : "Getting Started";
  const displayDescription = unlockedLevel
    ? unlockedLevel.description
    : "Complete your first cleaning to unlock your first badge.";
  const displayColor = unlockedLevel?.color ?? "#6b7280";
  const displayBg = unlockedLevel?.bgColor ?? "#f9fafb";

  if (loading) {
    return (
      <div className="customer-dash-card loyalty-card">
        <p className="loyalty-card__loading">Loading loyalty badges...</p>
      </div>
    );
  }

  return (
    <div className="customer-dash-card loyalty-card">
      <div className="customer-dash-card__header">
        <h2 className="customer-dash-card__title">Loyalty & Badges</h2>
        <p className="customer-dash-card__subtitle">
          Earn badges as you keep your bins fresh. The more cleanings, the higher your level.
        </p>
      </div>

      <div
        className="loyalty-card__current"
        style={{
          background: displayBg,
          borderColor: displayColor,
        }}
      >
        <p className="loyalty-card__current-label" style={{ color: displayColor }}>
          {displayTitle}
        </p>
        <p className="loyalty-card__current-desc">{displayDescription}</p>
        <p className="loyalty-card__current-count">
          {completedServices} {completedServices === 1 ? "cleaning" : "cleanings"} completed
        </p>
      </div>

      {nextLevel ? (
        <div className="loyalty-progress">
          <div className="loyalty-progress__meta">
            <span>
              Progress to Level {nextLevel.level} – {nextLevel.name}
            </span>
            <span>
              {completedServices} / {nextLevel.minServices}
            </span>
          </div>
          <div
            className="loyalty-progress__track"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${nextLevel.name}`}
          >
            <div
              className="loyalty-progress__fill"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${nextLevel.color}, ${nextLevel.color}cc)`,
              }}
            />
            <img
              src={BRAND_MASCOT_SRC}
              alt=""
              aria-hidden="true"
              className="loyalty-progress__mascot"
              style={{ left: `clamp(0px, calc(${progressPercent}% - 20px), calc(100% - 40px))` }}
            />
          </div>
        </div>
      ) : (
        <div className="loyalty-progress loyalty-progress--max">
          <div className="loyalty-progress__track" aria-label="Maximum loyalty level reached">
            <div className="loyalty-progress__fill loyalty-progress__fill--max" />
            <img
              src={BRAND_MASCOT_SRC}
              alt=""
              aria-hidden="true"
              className="loyalty-progress__mascot loyalty-progress__mascot--max"
            />
          </div>
          <p className="loyalty-progress__max-label">Maximum level reached — you&apos;re Bin Royalty!</p>
        </div>
      )}

      <div className="loyalty-levels">
        <p className="loyalty-levels__title">All badge levels</p>
        <ul className="loyalty-levels__list">
          {BADGE_LEVELS.map((badge) => {
            const isUnlocked = completedServices >= badge.minServices;
            const isCurrent = unlockedLevel?.level === badge.level;

            return (
              <li
                key={badge.level}
                className={`loyalty-levels__item${isCurrent ? " loyalty-levels__item--current" : ""}${isUnlocked ? " loyalty-levels__item--unlocked" : ""}`}
                style={
                  isCurrent
                    ? ({
                        background: badge.bgColor,
                        borderColor: badge.color,
                      } as CSSProperties)
                    : undefined
                }
              >
                <span
                  className="loyalty-levels__dot"
                  style={{ background: isUnlocked ? badge.color : "#d1d5db" }}
                  aria-hidden="true"
                />
                <div className="loyalty-levels__copy">
                  <span className="loyalty-levels__name" style={isCurrent ? { color: badge.color } : undefined}>
                    Level {badge.level} – {badge.name}
                  </span>
                  <span className="loyalty-levels__req">
                    {badge.minServices} {badge.minServices === 1 ? "cleaning" : "cleanings"}
                  </span>
                </div>
                {isCurrent ? <span className="loyalty-levels__pill">Current</span> : null}
                {isUnlocked && !isCurrent ? (
                  <span className="loyalty-levels__pill loyalty-levels__pill--earned">Earned</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
