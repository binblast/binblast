import { BUSINESS_PROFILE } from "@/lib/seo/business-info";
import { SITE_NAME, SITE_URL } from "@/lib/site-metadata";
import type { FaqItem } from "@/lib/seo/faq-data";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS_PROFILE.name,
    url: BUSINESS_PROFILE.url,
    logo: BUSINESS_PROFILE.logo,
    email: BUSINESS_PROFILE.email,
    telephone: BUSINESS_PROFILE.telephone,
    description: BUSINESS_PROFILE.description,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: BUSINESS_PROFILE.logo,
    },
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: BUSINESS_PROFILE.name,
    url: BUSINESS_PROFILE.url,
    logo: BUSINESS_PROFILE.logo,
    image: BUSINESS_PROFILE.logo,
    telephone: BUSINESS_PROFILE.telephone,
    email: BUSINESS_PROFILE.email,
    priceRange: BUSINESS_PROFILE.priceRange,
    description: BUSINESS_PROFILE.description,
    areaServed: BUSINESS_PROFILE.areaServed.map((name) => ({
      "@type": "City",
      name,
    })),
    openingHoursSpecification: BUSINESS_PROFILE.openingHoursSpecification.map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: entry.dayOfWeek,
      opens: entry.opens,
      closes: entry.closes,
    })),
  };
}

export function serviceSchema(params: {
  name: string;
  description: string;
  url: string;
  areaServed?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: params.name,
    description: params.description,
    provider: {
      "@type": "ProfessionalService",
      name: BUSINESS_PROFILE.name,
      url: BUSINESS_PROFILE.url,
      telephone: BUSINESS_PROFILE.telephone,
    },
    areaServed: (params.areaServed || BUSINESS_PROFILE.areaServed).map((name) => ({
      "@type": "City",
      name,
    })),
    url: params.url,
  };
}

export function faqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleSchema(params: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: BUSINESS_PROFILE.logo,
      },
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified,
    mainEntityOfPage: params.url,
  };
}

export function globalSchemas() {
  return [organizationSchema(), websiteSchema(), localBusinessSchema()];
}
