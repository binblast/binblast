export type CareerOpeningStatus = "open" | "future";

export interface CareerOpening {
  id: string;
  title: string;
  status: CareerOpeningStatus;
  location: string;
  schedule: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  paySummary?: string;
}

export const CAREERS_HERO = {
  title: "Careers at Bin Blast Co.",
  subtitle:
    "Help keep Metro Atlanta cleaner — one curbside bin at a time. We hire reliable people who take pride in quality work and serving their community.",
};

export const CAREERS_BENEFITS = [
  "Paid per completed stop — residential pay starts at $8 for the first bin and $3 for each additional bin at the same stop",
  "Commercial routes include commission-based pay with a $30 minimum per completed job",
  "Flexible route schedules — Monday through Saturday (Saturday routes end by 2:00 PM)",
  "Training provided on equipment, safety, and photo documentation",
  "Performance bonuses available for quality, reliability, and customer satisfaction",
  "Be part of a growing local company focused on cleaner neighborhoods",
] as const;

export const CAREER_OPENINGS: CareerOpening[] = [
  {
    id: "route-technician",
    title: "Route Technician — Bin Cleaning",
    status: "open",
    location: "Metro Atlanta (Fayette County and expanding routes)",
    schedule: "Part-time and full-time routes available · Mon–Sat",
    summary:
      "Drive assigned routes, clean and sanitize curbside trash bins, and submit required job photos after each stop.",
    responsibilities: [
      "Complete residential and commercial cleaning stops on schedule",
      "Follow Bin Blast safety, chemical, and equipment procedures",
      "Upload required before/after photos for each job",
      "Communicate with dispatch when issues or delays come up",
      "Represent Bin Blast Co. professionally at every customer home or property",
    ],
    requirements: [
      "Valid driver's license and reliable transportation",
      "Ability to work outdoors in varying weather",
      "Smartphone for job app, photos, and route updates",
      "Strong work ethic and attention to detail",
      "Must pass background review before first route assignment",
    ],
    paySummary: "Residential: $8 first bin + $3 each additional bin per stop · Commercial: 20% of labor revenue ($30 minimum per job)",
  },
  {
    id: "route-supervisor",
    title: "Route Supervisor",
    status: "future",
    location: "Metro Atlanta",
    schedule: "Full-time · future opening",
    summary:
      "Lead daily field operations, support technicians, and help maintain route quality as we grow.",
    responsibilities: [
      "Support route planning and daily dispatch",
      "Coach technicians on quality standards and documentation",
      "Help resolve customer and operational issues in the field",
    ],
    requirements: [
      "Prior route, fleet, or field-service leadership experience preferred",
      "Strong communication and problem-solving skills",
    ],
  },
  {
    id: "commercial-specialist",
    title: "Commercial Account Specialist",
    status: "future",
    location: "Metro Atlanta",
    schedule: "Part-time or full-time · future opening",
    summary:
      "Support restaurants, HOAs, apartments, and commercial properties with recurring bin cleaning service.",
    responsibilities: [
      "Complete commercial cleaning jobs to company standards",
      "Document heavy-grease or specialty jobs accurately",
      "Coordinate with operators on scheduling and site access",
    ],
    requirements: [
      "Comfortable with commercial sites and higher-volume containers",
      "Experience with customer-facing field work is a plus",
    ],
  },
];

export const OPEN_CAREER_OPENINGS = CAREER_OPENINGS.filter((job) => job.status === "open");
export const FUTURE_CAREER_OPENINGS = CAREER_OPENINGS.filter((job) => job.status === "future");
