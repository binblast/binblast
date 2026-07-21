export interface FaqItem {
  question: string;
  answer: string;
}

export const PRICING_ANSWER =
  "Pricing depends on the number of bins, service frequency, location, and type of property. Customers can view available options or request a quote through the website.";

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How much does trash can cleaning cost?",
    answer: PRICING_ANSWER,
  },
  {
    question: "How often should trash cans be professionally cleaned?",
    answer:
      "Most homeowners choose monthly or quarterly service, while restaurants, HOAs, and commercial properties often need weekly or bi-weekly cleaning based on volume and odor buildup.",
  },
  {
    question: "Do you sanitize and deodorize the bins?",
    answer:
      "Yes. Bin Blast Co. deep cleans, sanitizes, and deodorizes trash and recycling bins using professional equipment and a process designed to remove residue and odors.",
  },
  {
    question: "Do I need to be home during the cleaning?",
    answer:
      "No. Leave your bins at the curb or in an agreed location on your service day. We notify you when the job is complete.",
  },
  {
    question: "Do you clean recycling bins?",
    answer:
      "Yes. We clean trash, recycling, and many specialty curbside containers. Let us know what you need when you book.",
  },
  {
    question: "Do you offer one-time cleaning?",
    answer:
      "Yes. One-time trash can cleaning is available for move-ins, seasonal refreshes, and special events.",
  },
  {
    question: "Do you offer recurring service?",
    answer:
      "Yes. Recurring plans are available for homeowners, HOAs, restaurants, apartments, and commercial properties.",
  },
  {
    question: "Can Bin Blast Co. service an entire HOA?",
    answer:
      "Yes. We work with HOAs and neighborhood communities on group programs, preferred vendor arrangements, and resident signup options.",
  },
  {
    question: "Do you clean bins for restaurants and commercial properties?",
    answer:
      "Yes. We serve restaurants, property managers, offices, retail locations, and other commercial accounts with scheduled bin cleaning.",
  },
  {
    question: "What areas does Bin Blast Co. serve?",
    answer:
      "We serve South Metro Atlanta and surrounding Georgia communities, including Fayetteville, Peachtree City, Tyrone, Newnan, Senoia, Sharpsburg, Jonesboro, Hampton, Stockbridge, McDonough, East Point, and Atlanta.",
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
