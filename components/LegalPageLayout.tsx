import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of Service", shortLabel: "Terms" },
  { href: "/privacy", label: "Privacy Policy", shortLabel: "Privacy" },
  { href: "/cancellation", label: "Cancellation & Refunds", shortLabel: "Refunds" },
] as const;

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  activePath: "/terms" | "/privacy" | "/cancellation";
  children: ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated,
  activePath,
  children,
}: LegalPageLayoutProps) {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <header className="legal-hero">
          <div className="legal-hero__inner">
            <Link href="/" className="legal-hero__back">
              ← Back to home
            </Link>

            <div className="legal-hero__brand-row">
              <BrandLogo variant="hero" tone="hero" href="/" priority />
              <div className="legal-hero__brand-copy">
                <span className="legal-hero__eyebrow">Bin Blast Co.</span>
                <h1 className="legal-hero__title">{title}</h1>
                {lastUpdated && <p className="legal-hero__meta">Last updated: {lastUpdated}</p>}
              </div>
            </div>
          </div>
        </header>

        <nav className="legal-mobile-nav" aria-label="Legal documents">
          <div className="legal-mobile-nav__inner">
            {LEGAL_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={`legal-mobile-nav__pill${
                  activePath === page.href ? " legal-mobile-nav__pill--active" : ""
                }`}
                aria-current={activePath === page.href ? "page" : undefined}
              >
                <span className="legal-mobile-nav__label-full">{page.label}</span>
                <span className="legal-mobile-nav__label-short">{page.shortLabel}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="legal-page__body">
          <aside className="legal-sidebar" aria-label="Legal documents">
            <div className="legal-sidebar__card">
              <div className="legal-sidebar__brand">
                <BrandLogo variant="sidebar" tone="light" href="/" />
              </div>
              <p className="legal-sidebar__label">Legal documents</p>
              <nav className="legal-sidebar__nav">
                {LEGAL_PAGES.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={`legal-sidebar__link${
                      activePath === page.href ? " legal-sidebar__link--active" : ""
                    }`}
                    aria-current={activePath === page.href ? "page" : undefined}
                  >
                    {page.label}
                  </Link>
                ))}
              </nav>
              <div className="legal-sidebar__cta">
                <p>Ready to book your next cleaning?</p>
                <Link href="/#pricing">View plans &amp; pricing</Link>
              </div>
            </div>
          </aside>

          <article className="legal-content-card">
            {children}
          </article>
        </div>

        <footer className="legal-page-footer">
          <div className="legal-page-footer__inner">
            <BrandLogo variant="footer" tone="dark" href="/" />
            <div className="legal-page-footer__links">
              {LEGAL_PAGES.map((page) => (
                <Link key={page.href} href={page.href}>
                  {page.label}
                </Link>
              ))}
              <Link href="/">Home</Link>
              <Link href="/#pricing">Pricing</Link>
            </div>
            <p className="legal-page-footer__copy">
              &copy; {new Date().getFullYear()} Bin Blast Co. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
