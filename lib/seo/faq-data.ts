export interface FaqItem {
  question: string;
  answer: string;
}

export const PRICING_ANSWER =
  "Pricing depends on the number of bins, service frequency, location, and type of property. Customers can view available options or request a quote through the website.";

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does trash can cleaning work?",
    answer:
      "Bin Blast Co. uses professional curbside equipment to deep clean, sanitize, and deodorize your bins at the agreed service location. We remove residue and odors so your containers stay fresher between collection days.",
  },
  {
    question: "Do I need to be home during service?",
    answer:
      "No. Leave your bins accessible at the curb or in an agreed location after trash collection. We notify you when the service is complete.",
  },
  {
    question: "Do you offer one-time cleaning?",
    answer:
      "Yes. One-time trash can cleaning is available for move-ins, seasonal refreshes, special events, and first-time customers.",
  },
  {
    question: "Do you offer recurring cleaning?",
    answer:
      "Yes. Recurring plans are available for homeowners, HOAs, restaurants, apartments, and commercial properties based on your schedule and bin count.",
  },
  {
    question: "Can you clean more than one bin?",
    answer:
      "Yes. We clean multiple trash, recycling, and specialty bins at the same service location. Pricing depends on the number of bins and service frequency.",
  },
  {
    question: "Do you service HOAs and neighborhoods?",
    answer:
      "Yes. We work with HOAs and neighborhood communities on group programs, preferred vendor arrangements, and resident signup options.",
  },
  {
    question: "Do you clean bins for restaurants and businesses?",
    answer:
      "Yes. We serve restaurants, property managers, offices, retail locations, and other commercial accounts with scheduled bin cleaning.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve select communities in South Metro Atlanta, including Fayetteville, Peachtree City, Tyrone, Newnan, Senoia, Sharpsburg, Jonesboro, Hampton, Stockbridge, McDonough, East Point, and Atlanta. Booking confirms availability for your address.",
  },
  {
    question: "How do I prepare my bins for cleaning?",
    answer:
      "Leave empty bins accessible after trash collection at the agreed location. Remove loose bags or items inside the bin when possible, and let us know about any access instructions when you book.",
  },
  {
    question: "How much does trash can cleaning cost?",
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
