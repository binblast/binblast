export type BinBlasterApplicationStatus =
  | "new"
  | "under_review"
  | "interview_requested"
  | "approved"
  | "waitlisted"
  | "rejected"
  | "employee_account_created";

export const BIN_BLASTER_STATUS_LABELS: Record<BinBlasterApplicationStatus, string> = {
  new: "New",
  under_review: "Under Review",
  interview_requested: "Interview Requested",
  approved: "Approved",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  employee_account_created: "Employee Account Created",
};

export const BIN_BLASTER_STATUS_PIPELINE: BinBlasterApplicationStatus[] = [
  "new",
  "under_review",
  "interview_requested",
  "approved",
  "waitlisted",
  "rejected",
  "employee_account_created",
];

export const BIN_BLASTER_SERVICE_AREAS = [
  "Fayetteville",
  "Peachtree City",
  "Tyrone",
  "Newnan",
  "Senoia",
  "Sharpsburg",
  "Jonesboro",
  "Hampton",
  "Stockbridge",
  "McDonough",
  "East Point",
  "Atlanta",
  "Other",
] as const;

export type BinBlasterServiceArea = (typeof BIN_BLASTER_SERVICE_AREAS)[number];

export const BIN_BLASTER_WIZARD_STEPS = [
  "Personal Information",
  "Work Eligibility and Experience",
  "Availability and Service Areas",
  "Review and Submit",
] as const;

export const BIN_BLASTER_AVAILABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface BinBlasterPersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  zip: string;
  dateOfBirth: string;
  isAtLeast18: boolean | null;
}

export interface BinBlasterWorkInfo {
  hasDriversLicense: boolean | null;
  hasReliableTransportation: boolean | null;
  authorizedToWork: boolean | null;
  hasRelevantExperience: boolean | null;
  experienceDescription: string;
  whyBinBlast: string;
  startTimeline: string;
  availableDays: string[];
  availableTimes: string;
  comfortableOutdoors: boolean | null;
  comfortableLifting: boolean | null;
  backgroundCheckOk: boolean | null;
}

export interface BinBlasterAgreements {
  noGuarantee: boolean;
  compensationBased: boolean;
  accurateInfo: boolean;
  followProcedures: boolean;
}

export interface BinBlasterApplicationFormData {
  personal: BinBlasterPersonalInfo;
  work: BinBlasterWorkInfo;
  serviceAreas: string[];
  agreements: BinBlasterAgreements;
}

export interface BinBlasterAdminNote {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface BinBlasterCompensation {
  residentialFirstBin: number;
  residentialAdditionalBin: number;
  notes: string;
}

export interface BinBlasterApplicationRecord extends BinBlasterApplicationFormData {
  id: string;
  status: BinBlasterApplicationStatus;
  adminNotes: BinBlasterAdminNote[];
  assignedServiceAreas: string[];
  compensation: BinBlasterCompensation | null;
  employeeId: string | null;
  allowResubmission: boolean;
  submittedAt: string;
  updatedAt: string;
  interviewRequestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  employeeAccountCreatedAt: string | null;
}

export interface BinBlasterPayInfo {
  title: string;
  introCopy: string;
  residentialFirstBin: number;
  residentialAdditionalBin: number;
  commercialCopy: string;
  finalCopy: string;
}
