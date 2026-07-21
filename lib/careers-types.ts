export type CareerOpeningStatus = "open" | "future";

export type CareerApplicationStatus =
  | "application_received"
  | "under_review"
  | "phone_interview_scheduled"
  | "interview_completed"
  | "reference_check"
  | "offer_sent"
  | "hired"
  | "not_selected"
  | "withdrawn";

export const CAREER_APPLICATION_STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  application_received: "Application Received",
  under_review: "Under Review",
  phone_interview_scheduled: "Phone Interview Scheduled",
  interview_completed: "Interview Completed",
  reference_check: "Reference Check",
  offer_sent: "Offer Sent",
  hired: "Hired",
  not_selected: "Not Selected",
  withdrawn: "Withdrawn",
};

export const CAREER_APPLICATION_PIPELINE: CareerApplicationStatus[] = [
  "application_received",
  "under_review",
  "phone_interview_scheduled",
  "interview_completed",
  "reference_check",
  "offer_sent",
  "hired",
];

export interface CareerOpening {
  id: string;
  title: string;
  status: CareerOpeningStatus;
  location: string;
  employmentType: string;
  schedule: string;
  summary: string;
  payRange: string;
  responsibilities: string[];
  requirements: string[];
}

export interface CareerPersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  zip: string;
  password: string;
  confirmPassword: string;
}

export interface CareerWorkEligibility {
  authorizedToWork: boolean | null;
  hasDriversLicense: boolean | null;
  hasReliableTransportation: boolean | null;
  canLift75Pounds: boolean | null;
  availableWeekends: boolean | null;
  availableWeekdays: boolean | null;
}

export interface CareerExperience {
  previousEmployer: string;
  yearsWorked: string;
  reasonForLeaving: string;
  customerServiceExperience: boolean | null;
  experienceTags: string[];
}

export interface CareerAvailability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  preferredHours: string;
  desiredStartDate: string;
  employmentPreference: "part_time" | "full_time" | "either" | "";
}

export interface CareerShortAnswers {
  whyBinBlast: string;
  customerProblemExample: string;
  workEthic: string;
  whyHireYou: string;
}

export interface CareerDocuments {
  resumeUrl: string;
  resumeFileName: string;
  driversLicenseUrl: string;
  driversLicenseFileName: string;
  certificationUrls: string[];
}

export interface CareerApplicationFormData {
  positionId: string;
  positionTitle: string;
  personal: CareerPersonalInfo;
  eligibility: CareerWorkEligibility;
  experience: CareerExperience;
  availability: CareerAvailability;
  shortAnswers: CareerShortAnswers;
  documents: CareerDocuments;
  joinTalentPool: boolean;
  talentPoolDesiredRole: string;
}

export interface CareerApplicationRecord extends CareerApplicationFormData {
  id: string;
  applicantId: string;
  status: CareerApplicationStatus;
  assignedRecruiterId: string | null;
  assignedRecruiterName: string | null;
  adminNotes: string[];
  interviewScheduledAt: string | null;
  submittedAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
  hiredAt: string | null;
  source: "careers_funnel";
}

export interface CareerTalentPoolEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  skills: string[];
  desiredPosition: string;
  availability: string;
  yearsExperience: string;
  createdAt: string;
}

export interface CareerOnboardingChecklists {
  training: Record<string, boolean>;
  uniform: Record<string, boolean>;
  equipment: Record<string, boolean>;
}
