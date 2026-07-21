import type { CareerOpening } from "@/lib/careers-types";

export const CAREERS_HERO = {
  title: "Join the Bin Blast Co. Team",
  subtitle:
    "Help us build the cleanest neighborhoods in America while building a career you can grow with.",
};

export const CAREERS_MISSION = {
  headline: "Why Work Here",
  body:
    "At Bin Blast Co., we're building more than a trash bin cleaning company. We're building a technology-driven service company focused on customer experience, reliability, and creating career opportunities across Metro Atlanta.",
};

export const CAREERS_BENEFITS = [
  "Competitive Pay",
  "Performance Bonuses",
  "Career Growth",
  "Leadership Opportunities",
  "Flexible Scheduling",
  "Paid Training",
  "Team Culture",
  "Modern Equipment",
  "Technology-Driven Operations",
] as const;

export const HIRING_TIMELINE_STEPS = [
  { title: "Submit Application", detail: "Complete the 7-step online application." },
  { title: "Application Review", detail: "Our recruiting team reviews your experience and availability." },
  { title: "Phone Interview", detail: "Short conversation about the role, schedule, and expectations." },
  { title: "In-Person Interview", detail: "Meet the team and learn about routes, equipment, and culture." },
  { title: "Background & Driving Record Review", detail: "Required for route technician roles when applicable." },
  { title: "Job Offer", detail: "Qualified candidates receive a written offer." },
  { title: "Paid Training", detail: "Hands-on training on safety, quality, and documentation." },
  { title: "First Route", detail: "Start earning on your assigned route with ongoing support." },
] as const;

export const HIRING_TIMELINE_NOTE =
  "Most candidates receive a decision within 5–10 business days.";

export const CAREER_OPENINGS: CareerOpening[] = [
  {
    id: "route-technician",
    title: "Route Technician — Bin Cleaning",
    status: "open",
    location: "Metro Atlanta (Fayette County and expanding routes)",
    employmentType: "Part-time or Full-time",
    schedule: "Mon–Sat routes · Saturday ends by 2:00 PM",
    summary:
      "Drive assigned routes, clean and sanitize curbside trash bins, and submit required job photos after each stop.",
    payRange: "$8 first bin + $3/additional bin per stop · Commercial 20% labor ($30 min/job)",
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
  },
  {
    id: "route-supervisor",
    title: "Route Supervisor",
    status: "future",
    location: "Metro Atlanta",
    employmentType: "Full-time",
    schedule: "Future opening",
    summary:
      "Lead daily field operations, support technicians, and help maintain route quality as we grow.",
    payRange: "Competitive salary + leadership bonus (opening soon)",
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
    employmentType: "Part-time or Full-time",
    schedule: "Future opening",
    summary:
      "Support restaurants, HOAs, apartments, and commercial properties with recurring bin cleaning service.",
    payRange: "Commission-based commercial pay + performance bonuses",
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

export function getCareerOpeningById(id: string): CareerOpening | undefined {
  return CAREER_OPENINGS.find((job) => job.id === id);
}
