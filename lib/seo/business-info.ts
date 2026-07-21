import { SITE_NAME, SITE_URL } from "@/lib/site-metadata";
import { BUSINESS_HOURS_LINES } from "@/lib/business-hours";

export const BUSINESS_PHONE = "(470) 305-0823";
export const BUSINESS_PHONE_TEL = "+14703050823";
export const BUSINESS_EMAIL = "support@binblastco.com";

export const PRIORITY_CITY_PAGES = [
  { city: "Fayetteville", state: "GA", slug: "trash-can-cleaning-fayetteville-ga" },
  { city: "Peachtree City", state: "GA", slug: "trash-can-cleaning-peachtree-city-ga" },
  { city: "Tyrone", state: "GA", slug: "trash-can-cleaning-tyrone-ga" },
  { city: "Newnan", state: "GA", slug: "trash-can-cleaning-newnan-ga" },
  { city: "Senoia", state: "GA", slug: "trash-can-cleaning-senoia-ga" },
  { city: "Sharpsburg", state: "GA", slug: "trash-can-cleaning-sharpsburg-ga" },
  { city: "Jonesboro", state: "GA", slug: "trash-can-cleaning-jonesboro-ga" },
  { city: "Hampton", state: "GA", slug: "trash-can-cleaning-hampton-ga" },
  { city: "Stockbridge", state: "GA", slug: "trash-can-cleaning-stockbridge-ga" },
  { city: "McDonough", state: "GA", slug: "trash-can-cleaning-mcdonough-ga" },
  { city: "East Point", state: "GA", slug: "trash-can-cleaning-east-point-ga" },
  { city: "Atlanta", state: "GA", slug: "trash-can-cleaning-atlanta-ga" },
] as const;

export const SERVICE_PAGE_SLUGS = [
  "residential-trash-can-cleaning",
  "hoa-trash-can-cleaning",
  "commercial-trash-bin-cleaning",
  "restaurant-trash-bin-cleaning",
  "trash-can-sanitizing",
  "one-time-trash-can-cleaning",
  "recurring-trash-can-cleaning",
] as const;

export const BUSINESS_PROFILE = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  email: BUSINESS_EMAIL,
  telephone: BUSINESS_PHONE_TEL,
  priceRange: "$$",
  description:
    "Bin Blast Co. provides professional trash can cleaning, sanitizing, deodorizing, and pressure washing for residential, HOA, restaurant, apartment, and commercial customers across South Metro Atlanta.",
  areaServed: PRIORITY_CITY_PAGES.map((entry) => `${entry.city}, ${entry.state}`),
  hoursText: BUSINESS_HOURS_LINES,
  openingHoursSpecification: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      dayOfWeek: ["Saturday"],
      opens: "08:00",
      closes: "14:00",
    },
  ],
} as const;

export function cityPageHref(slug: string): string {
  return `/${slug}`;
}

export function servicePageHref(slug: string): string {
  return `/${slug}`;
}
