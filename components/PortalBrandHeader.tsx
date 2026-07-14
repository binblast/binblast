import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface PortalBrandHeaderProps {
  portalTitle: string;
  subtitle?: string;
  homeHref?: string;
  compact?: boolean;
  onDark?: boolean;
}

export function PortalBrandHeader({
  portalTitle,
  subtitle,
  homeHref = "/",
  compact = false,
  onDark = false,
}: PortalBrandHeaderProps) {
  return (
    <div className={`portal-brand-header${compact ? " portal-brand-header--compact" : ""}${onDark ? " portal-brand-header--on-dark" : ""}`}>
      <Link href={homeHref} className="portal-brand-header__logo" aria-label="Bin Blast Co. home">
        <BrandLogo variant="sidebar" tone="none" priority />
      </Link>
      <div className="portal-brand-header__copy">
        <div className="portal-brand-header__company">Bin Blast Co.</div>
        <h1 className="portal-brand-header__title">{portalTitle}</h1>
        {subtitle ? <p className="portal-brand-header__subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function PortalBrandMark({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <Link href={homeHref} className="portal-brand-mark" aria-label="Bin Blast Co. home">
      <BrandLogo variant="sidebar" tone="none" priority />
      <span className="portal-brand-mark__name">Bin Blast Co.</span>
    </Link>
  );
}
