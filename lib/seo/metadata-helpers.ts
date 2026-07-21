import type { Metadata } from "next";
import { buildSiteMetadata, SITE_URL } from "@/lib/site-metadata";

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export function buildPageMetadata(params: {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const canonical = `${SITE_URL}${params.path.startsWith("/") ? params.path : `/${params.path}`}`;

  return buildSiteMetadata({
    title: params.title,
    description: params.description,
    keywords: params.keywords,
    alternates: { canonical },
    openGraph: {
      title: params.title,
      description: params.description,
      url: canonical,
    },
    twitter: {
      title: params.title,
      description: params.description,
    },
    ...(params.noIndex ? NOINDEX_METADATA : {}),
  });
}
