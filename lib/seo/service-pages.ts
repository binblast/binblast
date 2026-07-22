import type { FaqItem } from "@/lib/seo/faq-data";
import { PRICING_ANSWER } from "@/lib/seo/faq-data";

export interface SeoLink {
  href: string;
  label: string;
}

export interface SeoSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface SeoPageDefinition {
  slug: string;
  type: "service" | "city";
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  intro: string;
  sections: SeoSection[];
  faqs: FaqItem[];
  relatedServices: SeoLink[];
  relatedCities?: SeoLink[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  heroImage?: string;
  heroImageAlt?: string;
}

const sharedProcess: SeoSection = {
  heading: "Our Cleaning Process",
  paragraphs: [
    "Bin Blast Co. arrives with professional curbside equipment to deep clean, sanitize, and deodorize your containers. We remove residue that causes odors, pests, and buildup while keeping the process convenient for homeowners, communities, and businesses.",
  ],
  list: [
    "Inspect bins and prepare the work area",
    "High-pressure cleaning to remove grime and residue",
    "Sanitize and deodorize the interior and exterior",
    "Return bins clean, fresh, and ready for use",
  ],
};

const baseResidentialLinks: SeoLink[] = [
  { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
  { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
  { href: "/trash-can-sanitizing", label: "Trash can sanitizing and deodorizing" },
];

export const SERVICE_PAGES: SeoPageDefinition[] = [
  {
    slug: "residential-trash-can-cleaning",
    type: "service",
    title: "Residential Trash Can Cleaning | Bin Blast Co.",
    description:
      "Professional residential trash can cleaning, sanitizing, and deodorizing across South Metro Atlanta. Book curbside service for homes and townhomes.",
    keywords: ["residential trash can cleaning", "garbage can cleaning", "curbside bin cleaning"],
    h1: "Residential Trash Can Cleaning",
    intro:
      "Keep your home’s curbside containers fresh with professional residential trash can cleaning from Bin Blast Co. We clean, sanitize, and deodorize trash and recycling bins so odors, residue, and buildup do not follow you back to the garage or driveway.",
    sections: [
      {
        heading: "Who Residential Service Is For",
        paragraphs: [
          "Our residential bin cleaning is designed for homeowners, townhome residents, and households that want a cleaner curb without spending time scrubbing containers themselves.",
        ],
        list: [
          "Single-family homes and townhomes",
          "Households with recurring trash and recycling bins",
          "Customers who want one-time or recurring curbside service",
        ],
      },
      {
        heading: "Benefits of Professional Bin Cleaning",
        paragraphs: [
          "Regular garbage can cleaning helps control odors, keeps bins looking presentable, and reduces the residue that can attract pests around the curb.",
        ],
        list: [
          "Fresh, deodorized bins after every visit",
          "Convenient curbside service — no need to be home",
          "Options for trash, recycling, and specialty containers",
          "Recurring plans or one-time cleanings available",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Do I need to be home?", answer: "No. Leave bins curbside on your service day and we handle the rest." },
      { question: "How much does residential trash can cleaning cost?", answer: PRICING_ANSWER },
      { question: "Do you clean recycling bins too?", answer: "Yes. We clean trash, recycling, and many specialty curbside containers." },
    ],
    relatedServices: [
      ...baseResidentialLinks,
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
      { href: "/trash-can-cleaning-peachtree-city-ga", label: "Peachtree City, GA" },
    ],
    primaryCta: { label: "Book a Cleaning", href: "/#pricing" },
    secondaryCta: { label: "View recurring plans", href: "/recurring-trash-can-cleaning" },
    heroImage: "/residential-bin-service.jpg",
    heroImageAlt: "Bin Blast Co. technician power washing a residential trash bin at the curb",
  },
  {
    slug: "hoa-trash-can-cleaning",
    type: "service",
    title: "HOA Trash Can Cleaning | Bin Blast Co.",
    description:
      "HOA and neighborhood trash can cleaning programs across South Metro Atlanta. Community bin sanitizing with flexible resident signup options.",
    keywords: ["HOA trash can cleaning", "neighborhood bin cleaning", "community trash can service"],
    h1: "HOA and Neighborhood Trash Can Cleaning",
    intro:
      "Bin Blast Co. helps HOAs, neighborhoods, and community associations keep shared and individual curbside bins cleaner, fresher, and easier to manage with organized group service options.",
    sections: [
      {
        heading: "Built for Communities",
        paragraphs: [
          "HOA trash can cleaning reduces odor complaints, improves curb appeal, and gives boards a professional vendor option for recurring bin sanitizing across the neighborhood.",
        ],
        list: [
          "Preferred vendor arrangements for associations",
          "Resident signup options for group pricing",
          "Recurring service schedules for high-traffic communities",
        ],
      },
      {
        heading: "What We Clean",
        paragraphs: [
          "We service individual household bins and can discuss shared container needs based on your community layout and waste setup.",
        ],
        list: [
          "Residential curbside trash and recycling bins",
          "Community container areas where applicable",
          "Recurring or seasonal cleaning programs",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Can an entire HOA enroll?", answer: "Yes. Contact us for HOA pricing and community rollout options." },
      { question: "How much does HOA bin cleaning cost?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-peachtree-city-ga", label: "Peachtree City, GA" },
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
    ],
    primaryCta: { label: "Get an HOA Quote", href: "/?openQuote=commercial#pricing" },
    heroImage: "/hoa-neighborhood-service.jpg",
    heroImageAlt: "Bin Blast Co. branded trash bins lined up along a neighborhood curb for HOA service",
  },
  {
    slug: "commercial-trash-bin-cleaning",
    type: "service",
    title: "Commercial Trash Bin Cleaning | Bin Blast Co.",
    description:
      "Commercial trash bin cleaning for property managers, offices, retail, apartments, and businesses across South Metro Atlanta.",
    keywords: ["commercial trash bin cleaning", "commercial garbage can cleaning", "business bin sanitizing"],
    h1: "Commercial Trash Bin Cleaning",
    intro:
      "Businesses across South Metro Atlanta rely on Bin Blast Co. for scheduled commercial trash bin cleaning that supports cleaner properties, happier tenants, and more professional waste areas.",
    sections: [
      {
        heading: "Commercial Accounts We Serve",
        paragraphs: [
          "We work with property managers, retail locations, offices, apartment communities, and other commercial operators that need reliable bin cleaning on a recurring schedule.",
        ],
        list: [
          "Property managers and facility teams",
          "Retail and office locations",
          "Apartment and multi-unit communities",
          "Light industrial and service businesses",
        ],
      },
      {
        heading: "Why Schedule Commercial Bin Cleaning",
        paragraphs: [
          "Commercial containers often see heavier use, grease, and odor buildup. Professional cleaning helps maintain a cleaner site and a better experience for staff, tenants, and visitors.",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Do you service multi-location accounts?", answer: "Yes. Request a commercial quote with your locations and container details." },
      { question: "How is commercial pricing determined?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/restaurant-trash-bin-cleaning", label: "Restaurant trash bin cleaning" },
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
      { href: "/trash-can-sanitizing", label: "Trash can sanitizing" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-atlanta-ga", label: "Atlanta, GA" },
      { href: "/trash-can-cleaning-stockbridge-ga", label: "Stockbridge, GA" },
    ],
    primaryCta: { label: "Request a Commercial Quote", href: "/?openQuote=commercial#pricing" },
    heroImage: "/commercial-bin-service.jpg",
    heroImageAlt: "Bin Blast Co. technician power washing a row of commercial trash bins at a business property",
  },
  {
    slug: "restaurant-trash-bin-cleaning",
    type: "service",
    title: "Restaurant Trash Bin Cleaning | Bin Blast Co.",
    description:
      "Restaurant and food-service trash bin cleaning across South Metro Atlanta. Control grease, odors, and buildup with scheduled service.",
    keywords: ["restaurant trash bin cleaning", "food service bin cleaning", "grease bin cleaning"],
    h1: "Restaurant Trash Bin Cleaning",
    intro:
      "Restaurants and food-service businesses generate some of the toughest bin residue. Bin Blast Co. provides scheduled restaurant trash bin cleaning to help control grease, odors, flies, and buildup around waste areas.",
    sections: [
      {
        heading: "Designed for Food-Service Operations",
        paragraphs: [
          "Back-of-house and exterior containers need more frequent attention than typical residential bins. We help restaurants maintain cleaner waste areas with recurring service tailored to volume and schedule.",
        ],
        list: [
          "Restaurants and quick-service locations",
          "Catering and commissary operations",
          "Food halls and shared kitchen facilities",
        ],
      },
      {
        heading: "What Makes Restaurant Bins Different",
        paragraphs: [
          "Grease, food waste, and heavy daily use create odor and sanitation challenges. Professional bin cleaning supports a cleaner operation and a better experience for staff and guests.",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Can you handle heavy grease buildup?", answer: "Yes. Tell us about container condition and frequency so we can recommend the right service schedule." },
      { question: "How often should restaurants clean bins?", answer: "Many restaurants choose weekly or bi-weekly service depending on volume and local requirements." },
    ],
    relatedServices: [
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
      { href: "/trash-can-sanitizing", label: "Trash can sanitizing and deodorizing" },
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-atlanta-ga", label: "Atlanta, GA" },
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
    ],
    primaryCta: { label: "Request a Restaurant Quote", href: "/?openQuote=commercial#pricing" },
    heroImage: "/restaurant-bin-service.jpg",
    heroImageAlt: "Bin Blast Co. technician power washing a commercial dumpster behind a restaurant",
  },
  {
    slug: "trash-can-sanitizing",
    type: "service",
    title: "Trash Can Sanitizing and Deodorizing | Bin Blast Co.",
    description:
      "Professional trash can sanitizing and deodorizing for homes, HOAs, and businesses across South Metro Atlanta.",
    keywords: ["trash can sanitizing", "bin deodorizing", "garbage can sanitizing"],
    h1: "Trash Can Sanitizing and Deodorizing",
    intro:
      "Bin Blast Co. goes beyond a quick rinse with professional trash can sanitizing and deodorizing that targets the residue and odors left behind after pickup day.",
    sections: [
      {
        heading: "Sanitizing vs. Basic Rinsing",
        paragraphs: [
          "Household hoses often miss stuck-on waste and bacteria-harboring residue. Our equipment and process are built for curbside containers that need a deeper clean and lasting freshness.",
        ],
      },
      {
        heading: "Ideal For",
        paragraphs: [
          "Sanitizing and deodorizing is popular with homeowners after seasonal buildup, HOAs preparing for events, and businesses that need cleaner waste areas.",
        ],
        list: [
          "Homes with strong bin odors",
          "HOAs and neighborhoods",
          "Restaurants and commercial properties",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Do you sanitize and deodorize?", answer: "Yes. Sanitizing and deodorizing are core parts of our cleaning service." },
      { question: "How much does sanitizing cost?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
      { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
    ],
    primaryCta: { label: "Book a Cleaning", href: "/#pricing" },
  },
  {
    slug: "one-time-trash-can-cleaning",
    type: "service",
    title: "One-Time Trash Can Cleaning | Bin Blast Co.",
    description:
      "One-time trash can cleaning for move-ins, seasonal refreshes, and special events across South Metro Atlanta.",
    keywords: ["one-time trash can cleaning", "single bin cleaning", "move-in bin cleaning"],
    h1: "One-Time Trash Can Cleaning",
    intro:
      "Need a fresh start? Bin Blast Co. offers one-time trash can cleaning for move-ins, spring cleaning, post-event refreshes, and customers who want to try service before choosing a recurring plan.",
    sections: [
      {
        heading: "When One-Time Service Makes Sense",
        paragraphs: [
          "One-time garbage can cleaning is a simple way to reset bins that have gone too long between cleanings or to prepare a property for sale, move-in, or a community event.",
        ],
        list: [
          "Move-in or move-out refreshes",
          "Seasonal deep cleans",
          "Trial service before subscribing",
          "Special events and open houses",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "Can I switch to recurring service later?", answer: "Yes. Many customers start with a one-time cleaning and move to a recurring plan afterward." },
      { question: "How much does one-time cleaning cost?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
      { href: "/trash-can-sanitizing", label: "Trash can sanitizing" },
    ],
    primaryCta: { label: "Book a One-Time Cleaning", href: "/#pricing" },
  },
  {
    slug: "recurring-trash-can-cleaning",
    type: "service",
    title: "Recurring Trash Can Cleaning | Bin Blast Co.",
    description:
      "Recurring trash can cleaning plans for homes, HOAs, restaurants, and businesses across South Metro Atlanta.",
    keywords: ["recurring trash can cleaning", "monthly bin cleaning", "subscription trash can cleaning"],
    h1: "Recurring Trash Can Cleaning",
    intro:
      "Stop resetting bins only when odors get bad. Recurring trash can cleaning keeps residential and commercial containers fresh on a schedule that fits your property.",
    sections: [
      {
        heading: "Why Customers Choose Recurring Service",
        paragraphs: [
          "Recurring bin cleaning is the easiest way to maintain cleaner curbs, reduce odor complaints, and keep waste areas presentable without adding another chore to the week.",
        ],
        list: [
          "Predictable cleaning schedule",
          "Better odor control over time",
          "Convenient account management online",
          "Options for homes, HOAs, and businesses",
        ],
      },
      sharedProcess,
    ],
    faqs: [
      { question: "How often can I schedule recurring service?", answer: "Frequency depends on your plan and property type. View options during booking or request a quote." },
      { question: "Can businesses set up recurring service?", answer: "Yes. Commercial and restaurant accounts can schedule recurring bin cleaning." },
    ],
    relatedServices: [
      { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
    ],
    primaryCta: { label: "View Cleaning Plans", href: "/#pricing" },
  },
];

export function getServicePage(slug: string): SeoPageDefinition | undefined {
  return SERVICE_PAGES.find((page) => page.slug === slug);
}
