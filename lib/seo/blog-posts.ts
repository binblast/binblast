export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  h1: string;
  datePublished: string;
  dateModified: string;
  sections: Array<{ heading: string; paragraphs: string[]; list?: string[] }>;
  relatedLinks: Array<{ href: string; label: string }>;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-often-should-you-clean-your-trash-can",
    title: "How Often Should You Clean Your Trash Can? | Bin Blast Co.",
    description:
      "Learn how often homeowners, HOAs, and businesses should professionally clean trash cans in Metro Atlanta.",
    h1: "How Often Should You Clean Your Trash Can?",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Residential Trash Cans",
        paragraphs: [
          "Most homeowners benefit from professional trash can cleaning every four to eight weeks, depending on heat, diet waste, and how quickly odors return after pickup day.",
        ],
      },
      {
        heading: "HOAs and Businesses",
        paragraphs: [
          "HOAs, restaurants, and commercial properties often need weekly or bi-weekly service because of higher volume and grease buildup.",
        ],
      },
    ],
    relatedLinks: [
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
      { href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" },
    ],
  },
  {
    slug: "how-to-get-rid-of-maggots-in-a-trash-can",
    title: "How to Get Rid of Maggots in a Trash Can | Bin Blast Co.",
    description:
      "Practical steps to remove maggots from a trash can and prevent them from returning.",
    h1: "How to Get Rid of Maggots in a Trash Can",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Start With a Deep Clean",
        paragraphs: [
          "Maggots usually appear when food residue stays inside the bin. Remove visible waste, rinse the container, and dry it thoroughly before the next pickup cycle.",
        ],
      },
      {
        heading: "When to Call a Professional",
        paragraphs: [
          "If odors and residue keep returning, professional trash can cleaning can remove buildup that household rinsing misses.",
        ],
      },
    ],
    relatedLinks: [{ href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" }],
  },
  {
    slug: "why-does-my-garbage-can-smell-so-bad",
    title: "Why Does My Garbage Can Smell So Bad? | Bin Blast Co.",
    description:
      "Common reasons trash cans smell bad and what you can do about it.",
    h1: "Why Does My Garbage Can Smell So Bad?",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Residue Builds Up Over Time",
        paragraphs: [
          "Liquids, food scraps, and bag leaks leave residue on the bin walls. Warm weather makes those odors stronger between pickup days.",
        ],
      },
    ],
    relatedLinks: [{ href: "/trash-can-sanitizing", label: "Trash can sanitizing and deodorizing" }],
  },
  {
    slug: "do-dirty-trash-cans-attract-flies-and-rodents",
    title: "Do Dirty Trash Cans Attract Flies and Rodents? | Bin Blast Co.",
    description:
      "How dirty bins can contribute to pests around the curb and what helps reduce the problem.",
    h1: "Do Dirty Trash Cans Attract Flies and Rodents?",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Why Pests Show Up",
        paragraphs: [
          "Food residue and strong odors can attract flies and make bins more appealing to rodents searching for food sources near the home.",
        ],
      },
    ],
    relatedLinks: [{ href: "/residential-trash-can-cleaning", label: "Residential trash can cleaning" }],
  },
  {
    slug: "is-professional-trash-can-cleaning-worth-it",
    title: "Is Professional Trash Can Cleaning Worth It? | Bin Blast Co.",
    description:
      "Compare DIY bin cleaning with professional curbside trash can cleaning.",
    h1: "Is Professional Trash Can Cleaning Worth It?",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Time and Equipment",
        paragraphs: [
          "Professional service uses equipment designed for curbside containers and saves homeowners from handling dirty bins, harsh residue, and garage storage odors.",
        ],
      },
    ],
    relatedLinks: [{ href: "/#pricing", label: "View cleaning plans" }],
  },
  {
    slug: "how-to-keep-a-trash-can-smelling-fresh",
    title: "How to Keep a Trash Can Smelling Fresh | Bin Blast Co.",
    description:
      "Simple habits and professional service options to keep garbage cans smelling fresh.",
    h1: "How to Keep a Trash Can Smelling Fresh",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Between Cleanings",
        paragraphs: [
          "Use tight bags, keep lids closed, and avoid leaving liquids at the bottom of the bin whenever possible.",
        ],
      },
    ],
    relatedLinks: [{ href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" }],
  },
  {
    slug: "why-hoas-should-offer-community-bin-cleaning",
    title: "Why HOAs Should Offer Community Bin Cleaning | Bin Blast Co.",
    description:
      "Benefits of HOA trash can cleaning programs for neighborhoods and boards.",
    h1: "Why HOAs Should Offer Community Bin Cleaning",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Cleaner Curbs, Fewer Complaints",
        paragraphs: [
          "Community bin cleaning can reduce odor complaints and improve curb appeal across the neighborhood with one organized vendor program.",
        ],
      },
    ],
    relatedLinks: [{ href: "/hoa-trash-can-cleaning", label: "HOA trash can cleaning" }],
  },
  {
    slug: "trash-bin-cleaning-for-restaurants",
    title: "Trash Bin Cleaning for Restaurants | Bin Blast Co.",
    description:
      "Why restaurants schedule professional trash bin cleaning and how often to do it.",
    h1: "Trash Bin Cleaning for Restaurants",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Grease and Food Waste",
        paragraphs: [
          "Restaurant bins see heavy grease and food residue. Scheduled cleaning helps control odors and keeps waste areas cleaner for staff and guests.",
        ],
      },
    ],
    relatedLinks: [{ href: "/restaurant-trash-bin-cleaning", label: "Restaurant trash bin cleaning" }],
  },
  {
    slug: "how-to-clean-a-trash-can-safely",
    title: "How to Clean a Trash Can Safely | Bin Blast Co.",
    description:
      "Safety tips for cleaning a trash can at home and when professional service makes sense.",
    h1: "How to Clean a Trash Can Safely",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "Use the Right Setup",
        paragraphs: [
          "Wear gloves, choose a well-ventilated area, and avoid mixing household chemicals. For stuck-on residue, professional curbside cleaning may be safer and more effective.",
        ],
      },
    ],
    relatedLinks: [{ href: "/trash-can-sanitizing", label: "Trash can sanitizing" }],
  },
  {
    slug: "one-time-vs-recurring-trash-can-cleaning",
    title: "One-Time vs. Recurring Trash Can Cleaning | Bin Blast Co.",
    description:
      "Choose between one-time and recurring trash can cleaning based on your property and usage.",
    h1: "One-Time vs. Recurring Trash Can Cleaning",
    datePublished: "2026-03-21",
    dateModified: "2026-03-21",
    sections: [
      {
        heading: "When One-Time Service Fits",
        paragraphs: [
          "One-time cleaning works well for move-ins, seasonal refreshes, and first-time customers who want to test the service.",
        ],
      },
      {
        heading: "When Recurring Service Fits",
        paragraphs: [
          "Recurring plans are best when odors return quickly or when HOAs and businesses need predictable maintenance.",
        ],
      },
    ],
    relatedLinks: [
      { href: "/one-time-trash-can-cleaning", label: "One-time trash can cleaning" },
      { href: "/recurring-trash-can-cleaning", label: "Recurring trash can cleaning" },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
