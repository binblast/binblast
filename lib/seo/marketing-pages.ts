import { CITY_PAGES, getCityPage } from "@/lib/seo/city-pages";
import { SERVICE_PAGES, getServicePage } from "@/lib/seo/service-pages";
import type { SeoPageDefinition } from "@/lib/seo/service-pages";

export const MARKETING_PAGE_SLUGS = [
  ...SERVICE_PAGES.map((page) => page.slug),
  ...CITY_PAGES.map((page) => page.slug),
] as const;

export function getMarketingPageBySlug(slug: string): SeoPageDefinition | undefined {
  return getServicePage(slug) || getCityPage(slug);
}

export function getAllMarketingPages(): SeoPageDefinition[] {
  return [...SERVICE_PAGES, ...CITY_PAGES];
}
