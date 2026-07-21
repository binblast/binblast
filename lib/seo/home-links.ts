import { PRIORITY_CITY_PAGES } from "@/lib/seo/business-info";
import { SERVICE_PAGES } from "@/lib/seo/service-pages";

export const CITY_NAME_TO_SEO_SLUG = Object.fromEntries(
  PRIORITY_CITY_PAGES.map((entry) => [entry.city, entry.slug])
) as Record<string, string>;

export const HOME_SERVICE_LINKS = SERVICE_PAGES.map((page) => ({
  href: `/${page.slug}`,
  label: page.h1,
}));

export const HOME_CITY_LINKS = PRIORITY_CITY_PAGES.map((entry) => ({
  href: `/${entry.slug}`,
  label: `${entry.city}, ${entry.state}`,
}));
