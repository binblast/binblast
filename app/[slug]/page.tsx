import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoMarketingPage } from "@/components/seo/SeoMarketingPage";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { getMarketingPageBySlug, MARKETING_PAGE_SLUGS } from "@/lib/seo/marketing-pages";

interface MarketingSlugPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return MARKETING_PAGE_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: MarketingSlugPageProps): Metadata {
  const page = getMarketingPageBySlug(params.slug);
  if (!page) return {};

  return buildPageMetadata({
    path: `/${page.slug}`,
    title: page.title,
    description: page.description,
    keywords: page.keywords,
  });
}

export default function MarketingSlugPage({ params }: MarketingSlugPageProps) {
  const page = getMarketingPageBySlug(params.slug);
  if (!page) notFound();

  return <SeoMarketingPage page={page} />;
}
