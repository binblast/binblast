export interface LocationSeoPage {
  slug: string;
  city: string;
  title: string;
  headline: string;
  description: string;
  keywords: string[];
}

export const LOCATION_SEO_PAGES: LocationSeoPage[] = [
  {
    slug: "fayetteville",
    city: "Fayetteville",
    title: "Fayetteville Trash Bin Cleaning | Bin Blast Co.",
    headline: "Fayetteville Trash Bin Cleaning",
    description:
      "Professional curbside trash bin cleaning, sanitizing, and deodorizing for Fayetteville homes, HOAs, and businesses. Based in Fayette County and serving south metro Atlanta.",
    keywords: ["Fayetteville trash bin cleaning", "curbside trash can cleaning", "residential bin cleaning"],
  },
  {
    slug: "peachtree-city",
    city: "Peachtree City",
    title: "Peachtree City Trash Bin Cleaning | Bin Blast Co.",
    headline: "Peachtree City Trash Bin Cleaning",
    description:
      "Recurring curbside bin cleaning for Peachtree City homeowners and communities. Fresh, sanitized, and odor-free bins on your schedule.",
    keywords: ["Peachtree City trash bin cleaning", "curbside trash can cleaning", "HOA bin cleaning"],
  },
  {
    slug: "atlanta",
    city: "Atlanta",
    title: "Atlanta Trash Bin Cleaning | Bin Blast Co.",
    headline: "Atlanta Trash Bin Cleaning",
    description:
      "Residential, restaurant, apartment, and commercial trash bin cleaning throughout Metro Atlanta. Request availability for your Atlanta property.",
    keywords: ["Atlanta trash can cleaning", "Metro Atlanta trash bin cleaning", "commercial bin cleaning"],
  },
  {
    slug: "newnan",
    city: "Newnan",
    title: "Newnan Trash Bin Cleaning | Bin Blast Co.",
    headline: "Newnan Trash Bin Cleaning",
    description:
      "Curbside trash can cleaning for Newnan homes and businesses. Bin Blast Co. is expanding routes across Metro Atlanta — request service for your address.",
    keywords: ["Newnan trash bin cleaning", "curbside trash can cleaning", "residential bin cleaning"],
  },
  {
    slug: "stockbridge",
    city: "Stockbridge",
    title: "Stockbridge Trash Bin Cleaning | Bin Blast Co.",
    headline: "Stockbridge Trash Bin Cleaning",
    description:
      "Professional bin cleaning for Stockbridge homeowners and commercial properties. Serving Metro Atlanta with recurring and one-time options.",
    keywords: ["Stockbridge trash bin cleaning", "Metro Atlanta trash bin cleaning", "commercial bin cleaning"],
  },
  {
    slug: "mcdonough",
    city: "McDonough",
    title: "McDonough Trash Bin Cleaning | Bin Blast Co.",
    headline: "McDonough Trash Bin Cleaning",
    description:
      "Trash bin cleaning, sanitizing, and deodorizing for McDonough homes and businesses. Request availability as we expand throughout Metro Atlanta.",
    keywords: ["McDonough trash bin cleaning", "curbside trash can cleaning", "residential bin cleaning"],
  },
];

export function getLocationSeoPage(slug: string): LocationSeoPage | undefined {
  return LOCATION_SEO_PAGES.find((page) => page.slug === slug);
}
