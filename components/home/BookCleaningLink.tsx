"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildAttributedHomeHref } from "@/lib/referral-attribution";
import { requestHomeSectionScroll } from "@/lib/home-section-scroll";

type BookCleaningLinkProps = {
  className?: string;
  large?: boolean;
  style?: React.CSSProperties;
};

export function BookCleaningLink({
  className = "",
  large = true,
  style,
}: BookCleaningLinkProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const href = isHomePage ? "#pricing" : buildAttributedHomeHref("pricing");
  const classes = [
    "btn",
    "btn-primary",
    "btn-book-cleaning",
    large ? "btn-large" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={classes}
      style={style}
      scroll={false}
      onClick={(event) => {
        if (!isHomePage) return;
        event.preventDefault();
        requestHomeSectionScroll("pricing");
      }}
    >
      Book Your Cleaning
    </Link>
  );
}
