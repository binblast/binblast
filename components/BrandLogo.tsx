import Image from "next/image";
import Link from "next/link";
import { BRAND_MASCOT_SRC } from "@/lib/brand";

type BrandLogoVariant = "nav" | "hero" | "footer" | "sidebar";
type BrandLogoTone = "light" | "dark" | "hero" | "none";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  href?: string;
  className?: string;
  priority?: boolean;
}

const VARIANTS: Record<
  BrandLogoVariant,
  { width: number; height: number; className: string }
> = {
  nav: { width: 128, height: 128, className: "brand-logo brand-logo--nav" },
  hero: { width: 256, height: 256, className: "brand-logo brand-logo--hero" },
  footer: { width: 256, height: 256, className: "brand-logo brand-logo--footer" },
  sidebar: { width: 160, height: 160, className: "brand-logo brand-logo--sidebar" },
};

export function BrandLogo({
  variant = "nav",
  tone = "dark",
  href,
  className = "",
  priority = false,
}: BrandLogoProps) {
  const config = VARIANTS[variant];
  const toneClass =
    tone === "light"
      ? "brand-logo--on-light"
      : tone === "dark"
        ? "brand-logo--on-dark"
        : tone === "hero"
          ? "brand-logo--on-hero"
          : "brand-logo--plain";

  const image = (
    <span className={`${config.className} ${toneClass} ${className}`.trim()}>
      <Image
        src={BRAND_MASCOT_SRC}
        alt="Bin Blast Co. mascot logo"
        width={config.width}
        height={config.height}
        priority={priority}
        quality={100}
        unoptimized
        className="brand-logo__image"
        style={{ background: "transparent" }}
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="brand-logo__link" aria-label="Bin Blast Co. home">
        {image}
      </Link>
    );
  }

  return image;
}
