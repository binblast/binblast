import type {
  CareerApplicationFormData,
  CareerApplicationStatus,
  CareerExperience,
  CareerPersonalInfo,
  CareerShortAnswers,
  CareerWorkEligibility,
} from "@/lib/careers-types";

export const APPLICATION_WIZARD_STEPS = [
  "Personal Information",
  "Work Eligibility",
  "Experience",
  "Availability",
  "Short Questions",
  "Upload Documents",
  "Review & Submit",
] as const;

export const EXPERIENCE_TAG_OPTIONS = [
  "Pressure washing",
  "Cleaning",
  "Route driving",
  "Construction",
  "Warehouse",
  "Landscaping",
  "Restaurant",
  "Other",
] as const;

export function createEmptyApplicationForm(positionId = "route-technician"): CareerApplicationFormData {
  return {
    positionId,
    positionTitle: "Route Technician — Bin Cleaning",
    personal: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      city: "",
      state: "GA",
      zip: "",
      password: "",
      confirmPassword: "",
    },
    eligibility: {
      authorizedToWork: null,
      hasDriversLicense: null,
      hasReliableTransportation: null,
      canLift75Pounds: null,
      availableWeekends: null,
      availableWeekdays: null,
    },
    experience: {
      previousEmployer: "",
      yearsWorked: "",
      reasonForLeaving: "",
      customerServiceExperience: null,
      experienceTags: [],
    },
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
      preferredHours: "",
      desiredStartDate: "",
      employmentPreference: "",
    },
    shortAnswers: {
      whyBinBlast: "",
      customerProblemExample: "",
      workEthic: "",
      whyHireYou: "",
    },
    documents: {
      resumeUrl: "",
      resumeFileName: "",
      driversLicenseUrl: "",
      driversLicenseFileName: "",
      certificationUrls: [],
    },
    joinTalentPool: false,
    talentPoolDesiredRole: "",
  };
}

const DRAFT_STORAGE_KEY = "binblast_career_application_draft_v1";

export function loadApplicationDraft(): CareerApplicationFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareerApplicationFormData;
  } catch {
    return null;
  }
}

export function saveApplicationDraft(data: CareerApplicationFormData): void {
  if (typeof window === "undefined") return;
  const sanitized = {
    ...data,
    personal: { ...data.personal, password: "", confirmPassword: "" },
  };
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(sanitized));
}

export function clearApplicationDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function validatePersonal(personal: CareerPersonalInfo): string | null {
  if (!personal.firstName.trim()) return "First name is required.";
  if (!personal.lastName.trim()) return "Last name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim())) return "Valid email is required.";
  if (!personal.phone.trim()) return "Phone number is required.";
  if (!personal.city.trim() || !personal.state.trim() || !personal.zip.trim()) {
    return "City, state, and ZIP are required.";
  }
  if (personal.password.length < 6) return "Password must be at least 6 characters.";
  if (personal.password !== personal.confirmPassword) return "Passwords do not match.";
  return null;
}

function validateEligibility(eligibility: CareerWorkEligibility): string | null {
  const fields: Array<[keyof CareerWorkEligibility, string]> = [
    ["authorizedToWork", "Work authorization"],
    ["hasDriversLicense", "Driver's license"],
    ["hasReliableTransportation", "Reliable transportation"],
    ["canLift75Pounds", "Ability to lift 75 pounds"],
    ["availableWeekends", "Weekend availability"],
    ["availableWeekdays", "Weekday availability"],
  ];

  for (const [key, label] of fields) {
    if (eligibility[key] === null) return `Please answer: ${label}.`;
  }
  if (eligibility.authorizedToWork === false) return "You must be authorized to work in the U.S.";
  if (eligibility.hasDriversLicense === false || eligibility.hasReliableTransportation === false) {
    return "A valid license and reliable transportation are required for route roles.";
  }
  return null;
}

function validateExperience(experience: CareerExperience): string | null {
  if (!experience.previousEmployer.trim()) return "Previous employer is required.";
  if (!experience.yearsWorked.trim()) return "Years worked is required.";
  if (experience.customerServiceExperience === null) {
    return "Please indicate your customer service experience.";
  }
  return null;
}

function validateAvailability(availability: CareerApplicationFormData["availability"]): string | null {
  const daysSelected = [
    availability.monday,
    availability.tuesday,
    availability.wednesday,
    availability.thursday,
    availability.friday,
    availability.saturday,
    availability.sunday,
  ].some(Boolean);

  if (!daysSelected) return "Select at least one available day.";
  if (!availability.preferredHours.trim()) return "Preferred hours are required.";
  if (!availability.desiredStartDate) return "Desired start date is required.";
  if (!availability.employmentPreference) return "Select part-time, full-time, or either.";
  return null;
}

function validateShortAnswers(shortAnswers: CareerShortAnswers): string | null {
  const fields: Array<[keyof CareerShortAnswers, string]> = [
    ["whyBinBlast", "Why do you want to work at Bin Blast Co.?"],
    ["customerProblemExample", "Customer problem example"],
    ["workEthic", "Work ethic"],
    ["whyHireYou", "Why should we hire you?"],
  ];

  for (const [key, label] of fields) {
    const value = shortAnswers[key].trim();
    if (!value) return `${label} is required.`;
    if (value.length > 500) return `${label} must be 500 characters or less.`;
  }
  return null;
}

function validateDocuments(documents: CareerApplicationFormData["documents"]): string | null {
  if (!documents.resumeUrl) return "Resume upload is required.";
  if (!documents.driversLicenseUrl) return "Driver's license upload is required.";
  return null;
}

export function validateWizardStep(step: number, data: CareerApplicationFormData): string | null {
  switch (step) {
    case 0:
      return validatePersonal(data.personal);
    case 1:
      return validateEligibility(data.eligibility);
    case 2:
      return validateExperience(data.experience);
    case 3:
      return validateAvailability(data.availability);
    case 4:
      return validateShortAnswers(data.shortAnswers);
    case 5:
      return validateDocuments(data.documents);
    case 6:
      return (
        validatePersonal(data.personal) ||
        validateEligibility(data.eligibility) ||
        validateExperience(data.experience) ||
        validateAvailability(data.availability) ||
        validateShortAnswers(data.shortAnswers) ||
        validateDocuments(data.documents)
      );
    default:
      return "Invalid step.";
  }
}

export function getPipelineProgress(status: CareerApplicationStatus): number {
  const order: CareerApplicationStatus[] = [
    "application_received",
    "under_review",
    "phone_interview_scheduled",
    "interview_completed",
    "reference_check",
    "offer_sent",
    "hired",
  ];
  const index = order.indexOf(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / order.length) * 100);
}
