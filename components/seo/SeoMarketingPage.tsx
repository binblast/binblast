import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { FaqItem } from "@/lib/seo/faq-data";
import type { SeoPageDefinition } from "@/lib/seo/service-pages";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqPageSchema, serviceSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-metadata";
import "./seo-marketing.css";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function FaqList({ faqs }: { faqs: FaqItem[] }) {
  if (!faqs.length) return null;

  return (
    <section className="seo-section">
      <h2 className="seo-section__title">Frequently Asked Questions</h2>
      <div className="seo-faq">
        {faqs.map((faq) => (
          <details key={faq.question} className="seo-faq__item">
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function SeoMarketingPage({ page }: { page: SeoPageDefinition }) {
  const pageUrl = `${SITE_URL}/${page.slug}`;
  const breadcrumbs = [
    { name: "Home", url: SITE_URL },
    {
      name: page.type === "city" ? "Service Areas" : "Services",
      url: `${SITE_URL}/#service-areas`,
    },
    { name: page.h1, url: pageUrl },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumbs),
          serviceSchema({
            name: page.h1,
            description: page.description,
            url: pageUrl,
          }),
          faqPageSchema(page.faqs),
        ]}
      />
      <Navbar />
      <main className="seo-page">
        <div className="seo-page__container">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: page.h1 },
            ]}
          />

          <header className="seo-page__hero">
            {page.heroImage ? (
              <div className="seo-page__hero-image">
                <Image
                  src={page.heroImage}
                  alt={page.heroImageAlt ?? page.h1}
                  fill
                  sizes="(max-width: 860px) 100vw, 860px"
                  priority
                />
              </div>
            ) : null}
            <p className="seo-page__eyebrow">
              {page.type === "city" ? "South Metro Atlanta Service Area" : "Bin Blast Co. Services"}
            </p>
            <h1>{page.h1}</h1>
            <p className="seo-page__intro">{page.intro}</p>
            <div className="seo-page__actions">
              <Link href={page.primaryCta.href} className="btn btn-primary btn-large">
                {page.primaryCta.label}
              </Link>
              {page.secondaryCta ? (
                <Link href={page.secondaryCta.href} className="btn btn-secondary btn-large">
                  {page.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </header>

          {page.sections.map((section) => (
            <section key={section.heading} className="seo-section">
              <h2 className="seo-section__title">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="seo-section__text">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="seo-section__list">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <FaqList faqs={page.faqs} />

          {(page.relatedServices.length > 0 || (page.relatedCities?.length ?? 0) > 0) && (
            <section className="seo-section">
              <h2 className="seo-section__title">Related Pages</h2>
              <div className="seo-links-grid">
                {page.relatedServices.map((link) => (
                  <Link key={link.href} href={link.href} className="seo-link-card">
                    {link.label}
                  </Link>
                ))}
                {page.relatedCities?.map((link) => (
                  <Link key={link.href} href={link.href} className="seo-link-card">
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="seo-cta">
            <h2>Schedule Your Trash Can Cleaning</h2>
            <p>
              Book residential service online or request a commercial quote for HOAs, restaurants, apartments, and businesses.
            </p>
            <div className="seo-page__actions">
              <Link href="/#pricing" className="btn btn-primary btn-large">
                Book a Cleaning
              </Link>
              <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large">
                Request a Commercial Quote
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
