export interface BadgeLevel {
  level: number;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  minServices: number;
}

export const BADGE_LEVELS: BadgeLevel[] = [
  {
    level: 1,
    name: "Clean Freak",
    description: "Your first cleaning milestone",
    color: "#16a34a",
    bgColor: "#ecfdf5",
    minServices: 1,
  },
  {
    level: 2,
    name: "Bin Boss",
    description: "5+ cleanings completed",
    color: "#2563eb",
    bgColor: "#eff6ff",
    minServices: 5,
  },
  {
    level: 3,
    name: "Sparkle Specialist",
    description: "15+ cleanings completed",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    minServices: 15,
  },
  {
    level: 4,
    name: "Sanitation Superstar",
    description: "30+ cleanings completed",
    color: "#d97706",
    bgColor: "#fffbeb",
    minServices: 30,
  },
  {
    level: 5,
    name: "Bin Royalty",
    description: "50+ cleanings completed",
    color: "#dc2626",
    bgColor: "#fef2f2",
    minServices: 50,
  },
];

export function getUnlockedLevel(completedServices: number): BadgeLevel | null {
  let unlocked: BadgeLevel | null = null;
  for (const badge of BADGE_LEVELS) {
    if (completedServices >= badge.minServices) {
      unlocked = badge;
    }
  }
  return unlocked;
}

export function getNextLevel(completedServices: number): BadgeLevel | null {
  return BADGE_LEVELS.find((badge) => completedServices < badge.minServices) ?? null;
}

export function getProgressPercent(
  completedServices: number,
  unlocked: BadgeLevel | null,
  next: BadgeLevel | null
): number {
  if (!next) return 100;
  if (!unlocked) {
    return Math.min(100, (completedServices / next.minServices) * 100);
  }
  const span = next.minServices - unlocked.minServices;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((completedServices - unlocked.minServices) / span) * 100));
}

export function getLoyaltyRankSummary(completedServices: number) {
  const unlocked = getUnlockedLevel(completedServices);
  const next = getNextLevel(completedServices);

  const title = unlocked
    ? `Level ${unlocked.level} · ${unlocked.name}`
    : "Getting Started";

  let meta: string;
  if (unlocked && !next) {
    meta = `${completedServices} cleanings · Top rank unlocked`;
  } else if (unlocked) {
    meta = `${completedServices} cleanings completed`;
  } else if (next) {
    meta = `${completedServices} of ${next.minServices} cleanings to ${next.name}`;
  } else {
    meta = "Complete your first cleaning to earn a badge";
  }

  return {
    title,
    shortTitle: unlocked?.name ?? "Getting Started",
    rankLevel: unlocked?.level ?? null,
    meta,
    color: unlocked?.color ?? "#6b7280",
    bgColor: unlocked?.bgColor ?? "#f9fafb",
    unlocked,
    next,
    progressPercent: getProgressPercent(completedServices, unlocked, next),
  };
}
