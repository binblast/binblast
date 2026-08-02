"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildAttributedHomeHref } from "@/lib/referral-attribution";
import { requestHomeSectionScroll } from "@/lib/home-section-scroll";

type HomeSectionLinkProps = {
  sectionId: string;
  className?: string;
  children: React.ReactNode;
};

export function HomeSectionLink({
  sectionId,
  className,
  children,
}: HomeSectionLinkProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const href = isHomePage ? `#${sectionId}` : buildAttributedHomeHref(sectionId);

  return (
    <Link
      href={href}
      className={className}
      scroll={false}
      onClick={(event) => {
        if (!isHomePage) return;
        event.preventDefault();
        requestHomeSectionScroll(sectionId);
      }}
    >
      {children}
    </Link>
  );
}
