import type {
  BinBlasterApplicationFormData,
  BinBlasterPersonalInfo,
  BinBlasterWorkInfo,
} from "@/lib/bin-blaster-types";

export function createEmptyBinBlasterForm(): BinBlasterApplicationFormData {
  return {
    personal: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      zip: "",
      dateOfBirth: "",
      isAtLeast18: null,
    },
    work: {
      hasDriversLicense: null,
      hasReliableTransportation: null,
      authorizedToWork: null,
      hasRelevantExperience: null,
      experienceDescription: "",
      whyBinBlast: "",
      startTimeline: "",
      availableDays: [],
      availableTimes: "",
      comfortableOutdoors: null,
      comfortableLifting: null,
      backgroundCheckOk: null,
    },
    serviceAreas: [],
    agreements: {
      noGuarantee: false,
      compensationBased: false,
      accurateInfo: false,
      followProcedures: false,
    },
  };
}

const DRAFT_STORAGE_KEY = "binblast_bin_blaster_application_draft_v1";

export function loadBinBlasterDraft(): BinBlasterApplicationFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BinBlasterApplicationFormData;
  } catch {
    return null;
  }
}

export function saveBinBlasterDraft(data: BinBlasterApplicationFormData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
}

export function clearBinBlasterDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

function validatePersonal(personal: BinBlasterPersonalInfo): string | null {
  if (!personal.firstName.trim()) return "First name is required.";
  if (!personal.lastName.trim()) return "Last name is required.";
  if (!isValidEmail(personal.email)) return "Enter a valid email address.";
  if (!isValidPhone(personal.phone)) return "Enter a valid 10-digit phone number.";
  if (!personal.city.trim()) return "City is required.";
  if (!isValidZip(personal.zip)) return "Enter a valid ZIP code.";
  if (!personal.dateOfBirth.trim()) return "Date of birth is required.";
  if (personal.isAtLeast18 === null) return "Please confirm whether you are at least 18 years old.";
  if (personal.isAtLeast18 === false) return "You must be at least 18 years old to apply.";
  return null;
}

function validateWork(work: BinBlasterWorkInfo): string | null {
  const yesNoFields: Array<[keyof BinBlasterWorkInfo, string]> = [
    ["hasDriversLicense", "Do you have a valid driver's license?"],
    ["hasReliableTransportation", "Do you have reliable transportation?"],
    ["authorizedToWork", "Are you legally authorized to work in the United States?"],
    ["comfortableOutdoors", "Are you comfortable working outdoors in heat, cold, and light rain?"],
    ["comfortableLifting", "Are you comfortable lifting, moving, and cleaning trash bins?"],
    ["backgroundCheckOk", "Are you willing to complete a background check if required?"],
  ];

  for (const [key, label] of yesNoFields) {
    if (work[key] === null) return `Please answer: ${label}`;
  }

  if (work.hasDriversLicense === false) {
    return "A valid driver's license is required for route work.";
  }
  if (work.hasReliableTransportation === false) {
    return "Reliable transportation is required for route work.";
  }
  if (work.authorizedToWork === false) {
    return "You must be legally authorized to work in the United States.";
  }
  if (work.comfortableOutdoors === false || work.comfortableLifting === false) {
    return "This role requires outdoor work and handling trash bins.";
  }
  if (work.backgroundCheckOk === false) {
    return "A background check may be required before route assignment.";
  }

  if (work.hasRelevantExperience === null) {
    return "Please indicate whether you have relevant experience.";
  }

  if (!work.whyBinBlast.trim()) return "Please tell us why you would like to work with Bin Blast Co.";
  if (!work.startTimeline.trim()) return "Please tell us how soon you can start.";
  if (!work.availableTimes.trim()) return "Please tell us what times you are generally available.";

  return null;
}

function validateAvailability(form: BinBlasterApplicationFormData): string | null {
  if (form.work.availableDays.length === 0) {
    return "Select at least one day you are available.";
  }
  if (form.serviceAreas.length === 0) {
    return "Select at least one service area where you can work.";
  }
  return null;
}

function validateAgreements(form: BinBlasterApplicationFormData): string | null {
  if (!form.agreements.noGuarantee) {
    return "Please confirm you understand employment is not guaranteed.";
  }
  if (!form.agreements.compensationBased) {
    return "Please confirm you understand compensation is based on completed services.";
  }
  if (!form.agreements.accurateInfo) {
    return "Please confirm your application information is accurate.";
  }
  if (!form.agreements.followProcedures) {
    return "Please agree to follow Bin Blast Co. procedures if approved.";
  }
  return null;
}

export function validateBinBlasterStep(step: number, form: BinBlasterApplicationFormData): string | null {
  switch (step) {
    case 0:
      return validatePersonal(form.personal);
    case 1:
      return validateWork(form.work);
    case 2:
      return validateAvailability(form);
    case 3:
      return validateAgreements(form);
    default:
      return null;
  }
}

export function validateBinBlasterForm(form: BinBlasterApplicationFormData): string | null {
  for (let step = 0; step < 4; step += 1) {
    const error = validateBinBlasterStep(step, form);
    if (error) return error;
  }
  return null;
}
