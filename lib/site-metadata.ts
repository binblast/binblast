import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.binblastco.com";

export const SITE_NAME = "Bin Blast Co.";

export const DEFAULT_TITLE =
  "Trash Bin Cleaning in Metro Atlanta | Bin Blast Co.";

export const DEFAULT_DESCRIPTION =
  "Bin Blast Co. provides professional residential, HOA, restaurant, apartment, and commercial trash bin cleaning throughout Metro Atlanta. Book curbside service or request a commercial quote.";

export const DEFAULT_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Bin Blast Co. — We make dirty bins look new. Professional bin cleaning in Metro Atlanta.",
} as const;

export function buildSiteMetadata(overrides?: Metadata): Metadata {
  const title = overrides?.title ?? DEFAULT_TITLE;
  const description = overrides?.description ?? DEFAULT_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      title: typeof title === "string" ? title : DEFAULT_TITLE,
      description: typeof description === "string" ? description : DEFAULT_DESCRIPTION,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [DEFAULT_OG_IMAGE],
      locale: "en_US",
      type: "website",
      ...overrides?.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: typeof title === "string" ? title : DEFAULT_TITLE,
      description: typeof description === "string" ? description : DEFAULT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE.url],
      ...overrides?.twitter,
    },
    ...overrides,
  };
}
