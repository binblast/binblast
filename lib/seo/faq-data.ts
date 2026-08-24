export interface FaqItem {
  question: string;
  answer: string;
}

export const PRICING_ANSWER =
  "Pricing depends on the number of bins, service frequency, location, and type of property. Customers can view available options or request a quote through the website.";

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How soon can I schedule my first cleaning?",
    answer:
      "First cleanings are scheduled 3–5 days from the day you book. Same-day and next-day bookings aren’t available so we can plan your route.",
  },
  {
    question: "Do I need to be home during service?",
    answer:
      "No. Leave your empty bins accessible at the curb or in an agreed location after trash collection. We notify you when the service is complete.",
  },
  {
    question: "How often should trash bins be cleaned?",
    answer:
      "Most homeowners choose monthly or bi-weekly service to keep odors and bacteria under control. Businesses with heavy use often schedule weekly or custom recurring plans.",
  },
  {
    question: "Do you clean inside and outside the bin?",
    answer:
      "Yes. We deep-clean both the interior and exterior, then sanitize and deodorize so your bins look and smell fresh.",
  },
  {
    question: "What areas do you service?",
    answer:
      "We serve select communities in South Metro Atlanta, including Fayetteville, Peachtree City, Tyrone, Newnan, Senoia, Sharpsburg, Jonesboro, Hampton, Stockbridge, McDonough, East Point, and Atlanta. Booking confirms availability for your address.",
  },
  {
    question: "How long does cleaning take?",
    answer:
      "Most curbside cleanings take about 10–15 minutes per bin, depending on size and condition.",
  },
  {
    question: "How does trash bin cleaning work?",
    answer:
      "Bin Blast Co. uses professional curbside equipment to deep clean, sanitize, and deodorize your bins at the agreed service location. We remove residue and odors so your containers stay fresher between collection days.",
  },
  {
    question: "Do you offer one-time cleaning?",
    answer:
      "Yes. One-time trash bin cleaning is available for move-ins, seasonal refreshes, special events, and first-time customers.",
  },
  {
    question: "Do you offer recurring cleaning?",
    answer:
      "Yes. Recurring plans are available for homeowners, HOAs, restaurants, apartments, and commercial properties based on your schedule and bin count.",
  },
  {
    question: "Do you clean bins for restaurants and businesses?",
    answer:
      "Yes. We serve restaurants, property managers, offices, retail locations, and other commercial accounts with scheduled bin cleaning.",
  },
  {
    question: "How much does trash bin cleaning cost?",
    answer: PRICING_ANSWER,
  },
];

export const OPERATIONS_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How long does the cleaning process take?",
    answer:
      "Most curbside cleanings take about 10–15 minutes per bin, depending on size and condition.",
  },
  {
    question: "What cleaning products do you use?",
    answer:
      "We use professional cleaning solutions selected for effective bin cleaning while remaining appropriate for residential and commercial curbside service.",
  },
  {
    question: "How do I cancel or reschedule my appointment?",
    answer:
      "You can reschedule an upcoming cleaning from your dashboard when it is more than 24 hours away. Within 24 hours, rescheduling and cancellation are locked. Plan upgrades may still be available until 4 hours before your visit.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept major credit and debit cards. Subscription plans can be set up with automatic billing for convenience.",
  },
];
