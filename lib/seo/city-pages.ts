import type { SeoPageDefinition } from "@/lib/seo/service-pages";
import { PRICING_ANSWER } from "@/lib/seo/faq-data";

function cityPage(params: Omit<SeoPageDefinition, "type">): SeoPageDefinition {
  return { ...params, type: "city" };
}

export const CITY_PAGES: SeoPageDefinition[] = [
  cityPage({
    slug: "trash-can-cleaning-fayetteville-ga",
    title: "Trash Can Cleaning in Fayetteville, GA | Bin Blast Co.",
    description:
      "Professional trash can cleaning in Fayetteville, GA. Residential, HOA, and commercial bin sanitizing from a Fayette County-based team.",
    keywords: ["trash can cleaning Fayetteville GA", "garbage can cleaning Fayetteville", "bin cleaning Fayette County"],
    h1: "Trash Can Cleaning in Fayetteville, GA",
    intro:
      "Bin Blast Co. is based in Fayette County and provides curbside trash can cleaning throughout Fayetteville for homeowners, neighborhoods, restaurants, and local businesses who want fresher bins without the hassle.",
    sections: [
      {
        heading: "Residential Trash Can Cleaning in Fayetteville",
        paragraphs: [
          "Fayetteville homeowners use Bin Blast Co. for recurring and one-time garbage can cleaning that removes odor-causing residue after pickup day. We clean trash and recycling bins curbside so you do not have to scrub containers yourself.",
        ],
      },
      {
        heading: "HOA and Commercial Service",
        paragraphs: [
          "We also support HOA communities and commercial properties in Fayetteville with scheduled bin sanitizing and deodorizing. Request a quote for neighborhood programs or business waste areas.",
        ],
      },
      {
        heading: "Nearby Communities We Serve",
        paragraphs: [
          "From Fayetteville, we regularly serve nearby South Metro Atlanta communities including Tyrone, Peachtree City, Brooks, and Sharpsburg.",
        ],
      },
    ],
    faqs: [
      { question: "Does Bin Blast Co. serve Fayetteville, GA?", answer: "Yes. Fayetteville is part of our primary service area in Fayette County." },
      { question: "How much does trash can cleaning cost in Fayetteville?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-tyrone-ga", label: "Tyrone, GA" },
      { href: "/trash-can-cleaning-peachtree-city-ga", label: "Peachtree City, GA" },
    ],
    primaryCta: { label: "Book Fayetteville Service", href: "/#pricing" },
    secondaryCta: { label: "Request a commercial quote", href: "/?openQuote=commercial#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-peachtree-city-ga",
    title: "Trash Can Cleaning in Peachtree City, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Peachtree City, GA for homes, golf-cart neighborhoods, HOAs, and businesses. Sanitize and deodorize curbside bins.",
    keywords: ["trash can cleaning Peachtree City GA", "Peachtree City bin cleaning", "HOA bin cleaning Peachtree City"],
    h1: "Trash Can Cleaning in Peachtree City, GA",
    intro:
      "Peachtree City homeowners and HOA communities choose Bin Blast Co. for professional trash bin cleaning that fits planned neighborhoods with high curb standards and active outdoor living.",
    sections: [
      {
        heading: "Neighborhood-Friendly Bin Cleaning",
        paragraphs: [
          "Peachtree City’s village layout and HOA-managed neighborhoods make clean curbs especially visible. Our recurring and one-time trash can cleaning helps residents keep bins fresh without storing dirty containers in garages or side yards.",
        ],
      },
      {
        heading: "Commercial and Multi-Unit Options",
        paragraphs: [
          "Retail, restaurant, and property management accounts in Peachtree City can request scheduled commercial bin cleaning tailored to container count and service frequency.",
        ],
      },
      {
        heading: "Nearby Areas",
        paragraphs: ["We also serve Fayetteville, Tyrone, Sharpsburg, and Newnan from our South Metro Atlanta routes."],
      },
    ],
    faqs: [
      { question: "Do you clean bins in Peachtree City HOAs?", answer: "Yes. We offer HOA and neighborhood programs as well as individual homeowner service." },
      { question: "How much does service cost in Peachtree City?", answer: PRICING_ANSWER },
    ],
    relatedServices: [
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
      { href: "/trash-can-cleaning-tyrone-ga", label: "Tyrone, GA" },
    ],
    primaryCta: { label: "Book Peachtree City Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-tyrone-ga",
    title: "Trash Can Cleaning in Tyrone, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Tyrone, GA for residential curbside bins, neighborhoods, and local businesses.",
    keywords: ["trash can cleaning Tyrone GA", "Tyrone garbage can cleaning"],
    h1: "Trash Can Cleaning in Tyrone, GA",
    intro:
      "Tyrone sits close to our Fayette County base, making it a natural fit for Bin Blast Co.’s residential and HOA trash can cleaning routes across South Metro Atlanta.",
    sections: [
      {
        heading: "Residential Service in Tyrone",
        paragraphs: [
          "Tyrone homeowners book Bin Blast Co. for garbage can cleaning that tackles sticky residue, strong odors, and seasonal buildup after holidays and yard projects.",
        ],
      },
      {
        heading: "Community and Business Cleaning",
        paragraphs: [
          "Neighborhood associations and Tyrone-area businesses can schedule recurring bin sanitizing to keep waste areas cleaner for residents, employees, and customers.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["Nearby service includes Fayetteville, Peachtree City, Sharpsburg, and Senoia."],
      },
    ],
    faqs: [
      { question: "Is Tyrone in your service area?", answer: "Yes. Tyrone is one of our primary South Metro Atlanta service communities." },
    ],
    relatedServices: [
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
      { href: "/trash-can-cleaning-senoia-ga", label: "Senoia, GA" },
    ],
    primaryCta: { label: "Book Tyrone Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-newnan-ga",
    title: "Trash Can Cleaning in Newnan, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Newnan, GA for homes, neighborhoods, restaurants, and commercial properties.",
    keywords: ["trash can cleaning Newnan GA", "Newnan bin sanitizing"],
    h1: "Trash Can Cleaning in Newnan, GA",
    intro:
      "Bin Blast Co. serves Newnan with curbside trash can cleaning for growing residential neighborhoods, local restaurants, and commercial operators who want cleaner waste areas.",
    sections: [
      {
        heading: "Residential Bin Cleaning in Newnan",
        paragraphs: [
          "Newnan homeowners use our service for one-time refreshes and recurring garbage can cleaning that keeps bins from becoming a source of driveway and garage odors.",
        ],
      },
      {
        heading: "Restaurant and Commercial Accounts",
        paragraphs: [
          "Newnan restaurants and businesses with exterior waste enclosures benefit from scheduled bin cleaning that targets grease, food residue, and heavy-use buildup.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["We also serve Sharpsburg, Senoia, Peachtree City, and Fayetteville."],
      },
    ],
    faqs: [
      { question: "Do you serve Newnan, GA?", answer: "Yes. Newnan is part of our approved South Metro Atlanta service area." },
    ],
    relatedServices: [
      { href: "/restaurant-trash-bin-cleaning", label: "Restaurant trash bin cleaning" },
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-sharpsburg-ga", label: "Sharpsburg, GA" },
      { href: "/trash-can-cleaning-senoia-ga", label: "Senoia, GA" },
    ],
    primaryCta: { label: "Book Newnan Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-senoia-ga",
    title: "Trash Can Cleaning in Senoia, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Senoia, GA for historic neighborhoods, residential streets, and local businesses.",
    keywords: ["trash can cleaning Senoia GA", "Senoia garbage can cleaning"],
    h1: "Trash Can Cleaning in Senoia, GA",
    intro:
      "Senoia’s walkable neighborhoods and strong community pride make clean curbs matter. Bin Blast Co. provides trash bin cleaning and sanitizing for Senoia homes and businesses.",
    sections: [
      {
        heading: "Residential Curbside Cleaning",
        paragraphs: [
          "Senoia homeowners choose Bin Blast Co. when bins start holding odors between pickup days or after busy weekends downtown and at home.",
        ],
      },
      {
        heading: "Business and Event Support",
        paragraphs: [
          "Local shops, restaurants, and event-heavy properties can schedule one-time or recurring bin cleaning to keep waste areas presentable.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["Nearby routes include Newnan, Sharpsburg, Tyrone, and Peachtree City."],
      },
    ],
    faqs: [
      { question: "Do you offer recurring service in Senoia?", answer: "Yes. Recurring and one-time trash can cleaning are available." },
    ],
    relatedServices: [
      { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-newnan-ga", label: "Newnan, GA" },
      { href: "/trash-can-cleaning-sharpsburg-ga", label: "Sharpsburg, GA" },
    ],
    primaryCta: { label: "Book Senoia Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-sharpsburg-ga",
    title: "Trash Can Cleaning in Sharpsburg, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Sharpsburg, GA for residential curbside bins and nearby commercial accounts.",
    keywords: ["trash can cleaning Sharpsburg GA", "Sharpsburg bin cleaning"],
    h1: "Trash Can Cleaning in Sharpsburg, GA",
    intro:
      "Sharpsburg customers along our Fayette County routes rely on Bin Blast Co. for convenient trash can cleaning that keeps residential bins sanitized and deodorized.",
    sections: [
      {
        heading: "Home Trash Can Cleaning",
        paragraphs: [
          "Sharpsburg homeowners book curbside garbage can cleaning to avoid storing dirty bins near the garage or side entry after trash day.",
        ],
      },
      {
        heading: "HOA and Local Business Options",
        paragraphs: [
          "Small commercial accounts and neighborhood groups near Sharpsburg can request recurring service or a one-time refresh before seasonal events.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["We also serve Newnan, Senoia, Peachtree City, and Fayetteville."],
      },
    ],
    faqs: [
      { question: "Is Sharpsburg in your service area?", answer: "Yes. Sharpsburg is part of our primary South Metro Atlanta coverage." },
    ],
    relatedServices: [
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
      { href: "/trash-can-sanitizing", label: "Trash can sanitizing" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-newnan-ga", label: "Newnan, GA" },
      { href: "/trash-can-cleaning-peachtree-city-ga", label: "Peachtree City, GA" },
    ],
    primaryCta: { label: "Book Sharpsburg Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-jonesboro-ga",
    title: "Trash Can Cleaning in Jonesboro, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Jonesboro, GA for homes, apartments, HOAs, and commercial properties in Clayton County.",
    keywords: ["trash can cleaning Jonesboro GA", "Jonesboro garbage can cleaning"],
    h1: "Trash Can Cleaning in Jonesboro, GA",
    intro:
      "Jonesboro homeowners, apartment communities, and businesses choose Bin Blast Co. for trash bin cleaning that helps control odors in high-traffic residential and commercial areas.",
    sections: [
      {
        heading: "Residential and Multi-Unit Service",
        paragraphs: [
          "Jonesboro properties with shared waste areas or individual curbside bins can schedule recurring or one-time cleaning based on container count and usage.",
        ],
      },
      {
        heading: "Commercial Bin Cleaning",
        paragraphs: [
          "Retail, restaurant, and property management teams in Jonesboro can request commercial trash bin cleaning tailored to exterior waste enclosures.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["Nearby service includes Hampton, Stockbridge, East Point, and Atlanta."],
      },
    ],
    faqs: [
      { question: "Do you serve Jonesboro, GA?", answer: "Yes. Jonesboro is included in our approved Metro Atlanta service area." },
    ],
    relatedServices: [
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-hampton-ga", label: "Hampton, GA" },
      { href: "/trash-can-cleaning-stockbridge-ga", label: "Stockbridge, GA" },
    ],
    primaryCta: { label: "Book Jonesboro Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-hampton-ga",
    title: "Trash Can Cleaning in Hampton, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Hampton, GA for residential curbside bins and local commercial accounts.",
    keywords: ["trash can cleaning Hampton GA", "Hampton bin sanitizing"],
    h1: "Trash Can Cleaning in Hampton, GA",
    intro:
      "Hampton residents and businesses along our South Metro Atlanta routes use Bin Blast Co. for professional trash can cleaning, sanitizing, and deodorizing.",
    sections: [
      {
        heading: "Residential Garbage Can Cleaning",
        paragraphs: [
          "Hampton homeowners schedule Bin Blast Co. when bins develop strong odors during warm months or after yard and renovation projects.",
        ],
      },
      {
        heading: "Business and Property Service",
        paragraphs: [
          "Local businesses and property managers in Hampton can request recurring bin cleaning to maintain cleaner exterior waste areas.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["We also serve Jonesboro, Stockbridge, McDonough, and Atlanta."],
      },
    ],
    faqs: [
      { question: "Is Hampton in your service area?", answer: "Yes. Hampton is included in our approved service-area list." },
    ],
    relatedServices: [
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
      { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-jonesboro-ga", label: "Jonesboro, GA" },
      { href: "/trash-can-cleaning-mcdonough-ga", label: "McDonough, GA" },
    ],
    primaryCta: { label: "Book Hampton Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-stockbridge-ga",
    title: "Trash Can Cleaning in Stockbridge, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Stockbridge, GA for homes, neighborhoods, restaurants, and commercial properties.",
    keywords: ["trash can cleaning Stockbridge GA", "Stockbridge garbage can cleaning"],
    h1: "Trash Can Cleaning in Stockbridge, GA",
    intro:
      "Stockbridge combines busy residential neighborhoods and commercial corridors that benefit from scheduled trash bin cleaning. Bin Blast Co. serves homes, HOAs, and businesses throughout the area.",
    sections: [
      {
        heading: "Residential Trash Can Cleaning",
        paragraphs: [
          "Stockbridge homeowners use Bin Blast Co. for curbside garbage can cleaning that removes residue before it becomes a persistent odor problem.",
        ],
      },
      {
        heading: "Commercial and Restaurant Cleaning",
        paragraphs: [
          "Restaurants and retail operators along Stockbridge commercial routes can request recurring bin sanitizing based on waste volume.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["Nearby routes include Jonesboro, McDonough, Hampton, and Atlanta."],
      },
    ],
    faqs: [
      { question: "Do you serve Stockbridge, GA?", answer: "Yes. Stockbridge is part of our approved Metro Atlanta service area." },
    ],
    relatedServices: [
      { href: "/restaurant-trash-bin-cleaning", label: "Restaurant trash bin cleaning" },
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-mcdonough-ga", label: "McDonough, GA" },
      { href: "/trash-can-cleaning-jonesboro-ga", label: "Jonesboro, GA" },
    ],
    primaryCta: { label: "Book Stockbridge Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-mcdonough-ga",
    title: "Trash Can Cleaning in McDonough, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in McDonough, GA for residential neighborhoods, HOAs, and commercial properties.",
    keywords: ["trash can cleaning McDonough GA", "McDonough bin cleaning"],
    h1: "Trash Can Cleaning in McDonough, GA",
    intro:
      "McDonough’s fast-growing neighborhoods make professional trash can cleaning a practical way to keep curbs clean as new homes and businesses continue to fill in Henry County.",
    sections: [
      {
        heading: "Residential and HOA Programs",
        paragraphs: [
          "McDonough HOAs and homeowners book Bin Blast Co. for recurring bin cleaning that supports cleaner community standards and less odor around driveways.",
        ],
      },
      {
        heading: "Commercial Service",
        paragraphs: [
          "Retail, office, and property management accounts in McDonough can request commercial trash bin cleaning on a recurring schedule.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["We also serve Stockbridge, Hampton, Jonesboro, and Atlanta."],
      },
    ],
    faqs: [
      { question: "Is McDonough in your service area?", answer: "Yes. McDonough is included in our approved service-area list." },
    ],
    relatedServices: [
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-stockbridge-ga", label: "Stockbridge, GA" },
      { href: "/trash-can-cleaning-hampton-ga", label: "Hampton, GA" },
    ],
    primaryCta: { label: "Book McDonough Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-east-point-ga",
    title: "Trash Can Cleaning in East Point, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in East Point, GA for homes, apartments, and commercial properties near Hartsfield-Jackson and South Atlanta.",
    keywords: ["trash can cleaning East Point GA", "East Point garbage can cleaning"],
    h1: "Trash Can Cleaning in East Point, GA",
    intro:
      "East Point properties near major South Atlanta corridors often need more frequent bin attention. Bin Blast Co. provides trash can cleaning for residential and commercial customers in East Point.",
    sections: [
      {
        heading: "Residential and Apartment Service",
        paragraphs: [
          "East Point homeowners and multi-unit communities can schedule curbside trash can cleaning to reduce odor and residue around dense residential blocks.",
        ],
      },
      {
        heading: "Commercial Bin Cleaning",
        paragraphs: [
          "Businesses and property managers in East Point can request recurring commercial trash bin cleaning based on container usage and location.",
        ],
      },
      {
        heading: "Nearby Communities",
        paragraphs: ["Nearby service includes Atlanta, Jonesboro, Hampton, and Stockbridge."],
      },
    ],
    faqs: [
      { question: "Do you serve East Point, GA?", answer: "Yes. East Point is included in our approved Metro Atlanta service area." },
    ],
    relatedServices: [
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
      { href: "/trash-can-sanitizing", label: "Trash can sanitizing" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-atlanta-ga", label: "Atlanta, GA" },
      { href: "/trash-can-cleaning-jonesboro-ga", label: "Jonesboro, GA" },
    ],
    primaryCta: { label: "Book East Point Service", href: "/#pricing" },
  }),
  cityPage({
    slug: "trash-can-cleaning-atlanta-ga",
    title: "Trash Can Cleaning in Atlanta, GA | Bin Blast Co.",
    description:
      "Trash can cleaning in Atlanta, GA for residential neighborhoods, restaurants, apartments, HOAs, and commercial properties.",
    keywords: ["trash can cleaning Atlanta GA", "Atlanta garbage can cleaning", "Metro Atlanta bin cleaning"],
    h1: "Trash Can Cleaning in Atlanta, GA",
    intro:
      "Bin Blast Co. serves Atlanta residential neighborhoods and commercial properties with curbside trash can cleaning, sanitizing, and deodorizing designed for busy urban and suburban waste areas.",
    sections: [
      {
        heading: "Residential Trash Can Cleaning in Atlanta",
        paragraphs: [
          "Atlanta homeowners and townhome communities use Bin Blast Co. when bins become a recurring odor issue or when they want a cleaner curb without manual scrubbing.",
        ],
      },
      {
        heading: "Restaurant, HOA, and Commercial Service",
        paragraphs: [
          "Atlanta restaurants, HOAs, apartment communities, and property managers can request custom recurring bin cleaning based on container count, access, and frequency.",
        ],
      },
      {
        heading: "South Metro Atlanta Routes",
        paragraphs: [
          "Our team is based in Fayette County and serves Atlanta alongside South Metro communities including East Point, Jonesboro, Stockbridge, and McDonough.",
        ],
      },
    ],
    faqs: [
      { question: "Do you serve Atlanta, GA?", answer: "Yes. Atlanta is part of our approved Metro Atlanta service area." },
      { question: "Can restaurants in Atlanta schedule service?", answer: "Yes. Request a commercial or restaurant quote for your location." },
    ],
    relatedServices: [
      { href: "/restaurant-trash-bin-cleaning", label: "Restaurant trash bin cleaning" },
      { href: "/commercial-trash-bin-cleaning", label: "Commercial trash bin cleaning" },
      { href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" },
    ],
    relatedCities: [
      { href: "/trash-can-cleaning-east-point-ga", label: "East Point, GA" },
      { href: "/trash-can-cleaning-fayetteville-ga", label: "Fayetteville, GA" },
    ],
    primaryCta: { label: "Book Atlanta Service", href: "/#pricing" },
    secondaryCta: { label: "Request a commercial quote", href: "/?openQuote=commercial#pricing" },
  }),
];

export function getCityPage(slug: string): SeoPageDefinition | undefined {
  return CITY_PAGES.find((page) => page.slug === slug);
}
