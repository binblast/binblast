"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  formatRecurringScheduleSummary,
  getPlanRecurringFrequencyLabel,
} from "@/lib/recurring-preference";

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
  nextCleaning?: NextCleaningSummary | null;
  recurringDay?: string;
  planId?: string | null;
  onScheduleClick?: () => void;
}

export function CustomerDashboardHero({
  firstName,
  planLabel = "No plan yet",
  paymentStatus,
  cleaningCredits = 0,
  nextCleaning,
  recurringDay,
  planId,
  onScheduleClick,
}: CustomerDashboardHeroProps) {
  const rawName = firstName?.trim();
  const displayName = rawName
    ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
    : "there";
  const hasPlan = planLabel !== "No plan yet";
  const isPaid = paymentStatus === "paid";
  const recurringScheduleSummary = formatRecurringScheduleSummary(planId, recurringDay);
  const planFrequencyLabel = getPlanRecurringFrequencyLabel(planId);

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
          {nextCleaning?.timeWindow ? (
            <span className="customer-dash-stat__meta">
              {nextCleaning.timeWindow}
              {recurringScheduleSummary ? ` · ${recurringScheduleSummary}` : ""}
            </span>
          ) : recurringScheduleSummary ? (
            <span className="customer-dash-stat__meta">{recurringScheduleSummary}</span>
          ) : (
            <span className="customer-dash-stat__meta">Book a visit when you&apos;re ready</span>
          )}
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

        <div className="customer-dash-stat customer-dash-stat--action">
          {onScheduleClick ? (
            <button type="button" className="customer-dash-stat__cta" onClick={onScheduleClick}>
              Schedule cleaning
            </button>
          ) : null}
          {!hasPlan ? (
            <Link href="/#pricing" className="customer-dash-stat__cta customer-dash-stat__cta--secondary">
              View plans
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
