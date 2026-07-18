"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  formatRecurringScheduleSummary,
  getPlanRecurringFrequencyLabel,
} from "@/lib/recurring-preference";
import { getLoyaltyRankSummary } from "@/lib/loyalty-badges";

interface NextCleaningSummary {
  dateLabel: string;
  timeWindow?: string;
  recurringDay?: string;
}

interface CustomerDashboardHeroProps {
  firstName?: string;
  planLabel?: string;
  paymentStatus?: string;
  cleaningCredits?: number;
  completedCleanings?: number;
  nextCleaning?: NextCleaningSummary | null;
  recurringDay?: string;
  planId?: string | null;
  onViewRankClick?: () => void;
}

export function CustomerDashboardHero({
  firstName,
  planLabel = "No plan yet",
  paymentStatus,
  cleaningCredits = 0,
  completedCleanings = 0,
  nextCleaning,
  recurringDay,
  planId,
  onViewRankClick,
}: CustomerDashboardHeroProps) {
  const rawName = firstName?.trim();
  const displayName = rawName
    ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
    : "there";
  const hasPlan = planLabel !== "No plan yet";
  const isPaid = paymentStatus === "paid";
  const recurringScheduleSummary = formatRecurringScheduleSummary(planId, recurringDay);
  const planFrequencyLabel = getPlanRecurringFrequencyLabel(planId);
  const rankSummary = getLoyaltyRankSummary(completedCleanings);

  return (
    <section className="customer-dash-hero" aria-label="Dashboard overview">
      <div className="customer-dash-hero__main">
        <Link href="/" className="customer-dash-hero__logo" aria-label="Bin Blast Co. home">
          <BrandLogo variant="sidebar" tone="none" priority className="customer-dash-hero__mascot" />
        </Link>
        <div className="customer-dash-hero__copy">
          <p className="customer-dash-hero__eyebrow">Bin Blast Co.</p>
          <h1 className="customer-dash-hero__title">Customer Dashboard</h1>
          <p className="customer-dash-hero__subtitle">
            Welcome back, {displayName}! Here&apos;s a quick look at your bin cleaning status.
          </p>
        </div>
      </div>

      <div className="customer-dash-stats">
        <article className="customer-dash-stat">
          <span className="customer-dash-stat__label">Next cleaning</span>
          <strong className="customer-dash-stat__value">
            {nextCleaning ? nextCleaning.dateLabel : "Not scheduled"}
          </strong>
          {!nextCleaning && recurringScheduleSummary ? (
            <span className="customer-dash-stat__meta">{recurringScheduleSummary}</span>
          ) : !nextCleaning ? (
            <span className="customer-dash-stat__meta">Book a visit when you&apos;re ready</span>
          ) : null}
        </article>

        <article className="customer-dash-stat">
          <span className="customer-dash-stat__label">Your plan</span>
          <strong className="customer-dash-stat__value">{planLabel}</strong>
          <span className={`customer-dash-stat__badge${isPaid ? " customer-dash-stat__badge--paid" : ""}`}>
            {hasPlan ? (isPaid ? "Active & paid" : "Payment pending") : "Choose a plan"}
          </span>
          {planFrequencyLabel ? (
            <span className="customer-dash-stat__meta">{planFrequencyLabel}</span>
          ) : null}
        </article>

        <article className="customer-dash-stat">
          <span className="customer-dash-stat__label">Cleaning credits</span>
          <strong className="customer-dash-stat__value">{cleaningCredits}</strong>
          <span className="customer-dash-stat__meta">
            {cleaningCredits > 0 ? "Ready to redeem on your next visit" : "Earn credits through referrals"}
          </span>
        </article>

        <article
          className="customer-dash-stat customer-dash-stat--rank"
          style={{
            background: rankSummary.bgColor,
            borderColor: rankSummary.unlocked ? rankSummary.color : "#e5e7eb",
          }}
        >
          <span className="customer-dash-stat__label">Current rank</span>
          <strong
            className="customer-dash-stat__value customer-dash-stat__value--rank"
            style={{ color: rankSummary.color }}
          >
            {rankSummary.rankLevel ? (
              <>
                <span className="customer-dash-stat__rank-level">Level {rankSummary.rankLevel}</span>
                <span className="customer-dash-stat__rank-name">{rankSummary.shortTitle}</span>
              </>
            ) : (
              rankSummary.title
            )}
          </strong>
          <span className="customer-dash-stat__meta">{rankSummary.meta}</span>
          {onViewRankClick ? (
            <button
              type="button"
              className="customer-dash-stat__link customer-dash-stat__link--action"
              onClick={onViewRankClick}
            >
              View badges & progress
            </button>
          ) : null}
          {!hasPlan ? (
            <Link href="/#pricing" className="customer-dash-stat__link customer-dash-stat__link--muted">
              View plans
            </Link>
          ) : null}
        </article>
      </div>
    </section>
  );
}
