"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPLICATION_WIZARD_STEPS,
  EXPERIENCE_TAG_OPTIONS,
  clearApplicationDraft,
  createEmptyApplicationForm,
  loadApplicationDraft,
  saveApplicationDraft,
  validateWizardStep,
} from "@/lib/careers-application";
import type { CareerApplicationFormData } from "@/lib/careers-types";
import { getCareerOpeningById } from "@/lib/careers-content";
import { getStorageInstance } from "@/lib/firebase-client";

const DRAFT_ID_KEY = "binblast_career_draft_id_v1";
const TOTAL_STEPS = APPLICATION_WIZARD_STEPS.length;

const ELIGIBILITY_FIELDS: Array<{
  key: keyof CareerApplicationFormData["eligibility"];
  label: string;
}> = [
  { key: "authorizedToWork", label: "Are you authorized to work in the U.S.?" },
  { key: "hasDriversLicense", label: "Do you have a valid driver's license?" },
  { key: "hasReliableTransportation", label: "Do you have reliable transportation?" },
  { key: "canLift75Pounds", label: "Can you lift up to 75 pounds?" },
  { key: "availableWeekends", label: "Are you available to work weekends?" },
  { key: "availableWeekdays", label: "Are you available to work weekdays?" },
];

const AVAILABILITY_DAYS: Array<{
  key: keyof Pick<
    CareerApplicationFormData["availability"],
    "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  >;
  label: string;
}> = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const SHORT_ANSWER_FIELDS: Array<{
  key: keyof CareerApplicationFormData["shortAnswers"];
  label: string;
}> = [
  { key: "whyBinBlast", label: "Why do you want to work at Bin Blast Co.?" },
  { key: "customerProblemExample", label: "Describe a time you solved a customer problem." },
  { key: "workEthic", label: "What does a strong work ethic mean to you?" },
  { key: "whyHireYou", label: "Why should we hire you?" },
];

interface ApplicationWizardProps {
  positionId?: string;
  joinTalentPool?: boolean;
}

function resolveInitialForm(positionId?: string, joinTalentPool = false): CareerApplicationFormData {
  const draft = loadApplicationDraft();
  const resolvedId = positionId || draft?.positionId || "route-technician";
  const opening = getCareerOpeningById(resolvedId);
  const base = draft ? { ...draft } : createEmptyApplicationForm(resolvedId);

  if (opening) {
    base.positionId = opening.id;
    base.positionTitle = opening.title;
  } else {
    base.positionId = resolvedId;
  }

  if (positionId) {
    const propOpening = getCareerOpeningById(positionId);
    if (propOpening) {
      base.positionId = propOpening.id;
      base.positionTitle = propOpening.title;
    } else {
      base.positionId = positionId;
    }
  }

  if (joinTalentPool) {
    base.joinTalentPool = true;
  }

  return base;
}

function getOrCreateDraftId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DRAFT_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  window.localStorage.setItem(DRAFT_ID_KEY, id);
  return id;
}

async function uploadCareerDocument(file: File, draftId: string): Promise<string> {
  const storage = await getStorageInstance();
  if (!storage) {
    throw new Error("File upload is unavailable. Please try again later.");
  }

  const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `career-applications/${draftId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

function formatEmploymentPreference(value: string): string {
  switch (value) {
    case "part_time":
      return "Part-time";
    case "full_time":
      return "Full-time";
    case "either":
      return "Either";
    default:
      return "Not selected";
  }
}

function formatBool(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not answered";
}

export function ApplicationWizard({ positionId, joinTalentPool = false }: ApplicationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CareerApplicationFormData>(() => resolveInitialForm(positionId, joinTalentPool));
  const [draftId, setDraftId] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setDraftId(getOrCreateDraftId());
    setForm(resolveInitialForm(positionId, joinTalentPool));
  }, [positionId, joinTalentPool]);

  useEffect(() => {
    if (!initializedRef.current) return;
    saveApplicationDraft(form);
  }, [form]);

  const updateForm = useCallback((patch: Partial<CareerApplicationFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setStepError(null);
    setSubmitError(null);
  }, []);

  const updatePersonal = useCallback(
    (patch: Partial<CareerApplicationFormData["personal"]>) => {
      setForm((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
      setStepError(null);
      setSubmitError(null);
    },
    []
  );

  const updateEligibility = useCallback(
    (key: keyof CareerApplicationFormData["eligibility"], value: boolean) => {
      setForm((prev) => ({
        ...prev,
        eligibility: { ...prev.eligibility, [key]: value },
      }));
      setStepError(null);
      setSubmitError(null);
    },
    []
  );

  const updateExperience = useCallback(
    (patch: Partial<CareerApplicationFormData["experience"]>) => {
      setForm((prev) => ({ ...prev, experience: { ...prev.experience, ...patch } }));
      setStepError(null);
      setSubmitError(null);
    },
    []
  );

  const toggleExperienceTag = useCallback((tag: string) => {
    setForm((prev) => {
      const tags = prev.experience.experienceTags;
      const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
      return { ...prev, experience: { ...prev.experience, experienceTags: next } };
    });
    setStepError(null);
    setSubmitError(null);
  }, []);

  const updateAvailability = useCallback(
    (patch: Partial<CareerApplicationFormData["availability"]>) => {
      setForm((prev) => ({ ...prev, availability: { ...prev.availability, ...patch } }));
      setStepError(null);
      setSubmitError(null);
    },
    []
  );

  const updateShortAnswer = useCallback(
    (key: keyof CareerApplicationFormData["shortAnswers"], value: string) => {
      setForm((prev) => ({
        ...prev,
        shortAnswers: { ...prev.shortAnswers, [key]: value.slice(0, 500) },
      }));
      setStepError(null);
      setSubmitError(null);
    },
    []
  );

  const handleFileUpload = useCallback(
    async (
      file: File,
      field: "resume" | "driversLicense" | "certification"
    ) => {
      if (!draftId) return;

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setStepError("Each file must be 10 MB or smaller.");
        return;
      }

      setUploadingField(field);
      setStepError(null);

      try {
        const url = await uploadCareerDocument(file, draftId);

        setForm((prev) => {
          if (field === "resume") {
            return {
              ...prev,
              documents: {
                ...prev.documents,
                resumeUrl: url,
                resumeFileName: file.name,
              },
            };
          }
          if (field === "driversLicense") {
            return {
              ...prev,
              documents: {
                ...prev.documents,
                driversLicenseUrl: url,
                driversLicenseFileName: file.name,
              },
            };
          }
          return {
            ...prev,
            documents: {
              ...prev.documents,
              certificationUrls: [...prev.documents.certificationUrls, url],
            },
          };
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        setStepError(message);
      } finally {
        setUploadingField(null);
      }
    },
    [draftId]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent, field: "resume" | "driversLicense" | "certification") => {
      event.preventDefault();
      setDragOverField(null);
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFileUpload(file, field);
    },
    [handleFileUpload]
  );

  const goNext = () => {
    const error = validateWizardStep(step, form);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setStepError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const error = validateWizardStep(6, form);
    if (error) {
      setSubmitError(error);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/careers/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form,
          password: form.personal.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit application.");
      }

      clearApplicationDraft();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_ID_KEY);
      }

      router.push(`/careers/apply/confirmation?applicationId=${result.applicationId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit application.";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  const renderYesNo = (
    label: string,
    value: boolean | null,
    onChange: (next: boolean) => void
  ) => (
    <div className="careers-field" style={{ marginBottom: "1rem" }}>
      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{label}</span>
      <div className="careers-choice-row" style={{ marginTop: "0.5rem" }}>
        <button
          type="button"
          className={`careers-choice${value === true ? " careers-choice--active" : ""}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`careers-choice${value === false ? " careers-choice--active" : ""}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );

  const renderUploadZone = (
    field: "resume" | "driversLicense" | "certification",
    label: string,
    required: boolean,
    fileName?: string
  ) => {
    const isActive = dragOverField === field;
    const isUploading = uploadingField === field;

    return (
      <div className="careers-field" style={{ marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
          {label}
          {required ? " *" : " (optional)"}
        </span>
        <div
          className={`careers-upload${isActive ? " careers-upload--active" : ""}`}
          style={{ marginTop: "0.5rem", cursor: isUploading ? "wait" : "pointer" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverField(field);
          }}
          onDragLeave={() => setDragOverField(null)}
          onDrop={(e) => handleDrop(e, field)}
          onClick={() => {
            if (isUploading) return;
            const input = document.getElementById(`upload-${field}`) as HTMLInputElement | null;
            input?.click();
          }}
        >
          <input
            id={`upload-${field}`}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file, field);
              e.target.value = "";
            }}
          />
          {isUploading ? (
            <p style={{ margin: 0, color: "var(--careers-muted)" }}>Uploading…</p>
          ) : fileName ? (
            <>
              <p style={{ margin: "0 0 0.35rem", fontWeight: 600, color: "var(--careers-accent-dark)" }}>
                ✓ {fileName}
              </p>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--careers-muted)" }}>
                Click or drag to replace
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 0.35rem", fontWeight: 600 }}>Drag & drop or click to upload</p>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--careers-muted)" }}>
                PDF, Word, or image · Max 10 MB
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ display: "grid", gap: "1rem" }}>
            <p style={{ margin: 0, color: "var(--careers-muted)", lineHeight: 1.6 }}>
              Applying for <strong>{form.positionTitle}</strong>. Create your applicant account — you&apos;ll
              use this email and password to track your application.
            </p>
            <div className="careers-field-grid">
              <label className="careers-field">
                First name *
                <input
                  type="text"
                  autoComplete="given-name"
                  value={form.personal.firstName}
                  onChange={(e) => updatePersonal({ firstName: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Last name *
                <input
                  type="text"
                  autoComplete="family-name"
                  value={form.personal.lastName}
                  onChange={(e) => updatePersonal({ lastName: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Email *
                <input
                  type="email"
                  autoComplete="email"
                  value={form.personal.email}
                  onChange={(e) => updatePersonal({ email: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Phone *
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.personal.phone}
                  onChange={(e) => updatePersonal({ phone: e.target.value })}
                />
              </label>
              <label className="careers-field">
                City *
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={form.personal.city}
                  onChange={(e) => updatePersonal({ city: e.target.value })}
                />
              </label>
              <label className="careers-field">
                State *
                <input
                  type="text"
                  autoComplete="address-level1"
                  value={form.personal.state}
                  onChange={(e) => updatePersonal({ state: e.target.value })}
                />
              </label>
              <label className="careers-field">
                ZIP *
                <input
                  type="text"
                  autoComplete="postal-code"
                  value={form.personal.zip}
                  onChange={(e) => updatePersonal({ zip: e.target.value })}
                />
              </label>
            </div>
            <div className="careers-field-grid">
              <label className="careers-field">
                Password *
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.personal.password}
                  onChange={(e) => updatePersonal({ password: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Confirm password *
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.personal.confirmPassword}
                  onChange={(e) => updatePersonal({ confirmPassword: e.target.value })}
                />
              </label>
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <p style={{ margin: "0 0 1rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
              Route roles require a valid license, reliable transportation, and U.S. work authorization.
            </p>
            {ELIGIBILITY_FIELDS.map(({ key, label }) =>
              renderYesNo(label, form.eligibility[key], (value) => updateEligibility(key, value))
            )}
          </div>
        );

      case 2:
        return (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="careers-field-grid">
              <label className="careers-field">
                Previous employer *
                <input
                  type="text"
                  value={form.experience.previousEmployer}
                  onChange={(e) => updateExperience({ previousEmployer: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Years worked *
                <input
                  type="text"
                  placeholder="e.g. 2 years"
                  value={form.experience.yearsWorked}
                  onChange={(e) => updateExperience({ yearsWorked: e.target.value })}
                />
              </label>
            </div>
            <label className="careers-field">
              Reason for leaving
              <input
                type="text"
                value={form.experience.reasonForLeaving}
                onChange={(e) => updateExperience({ reasonForLeaving: e.target.value })}
              />
            </label>
            {renderYesNo("Do you have customer service experience?", form.experience.customerServiceExperience, (value) =>
              updateExperience({ customerServiceExperience: value })
            )}
            <div className="careers-field">
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Relevant experience (select all that apply)</span>
              <div className="careers-choice-row" style={{ marginTop: "0.5rem" }}>
                {EXPERIENCE_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`careers-choice${
                      form.experience.experienceTags.includes(tag) ? " careers-choice--active" : ""
                    }`}
                    onClick={() => toggleExperienceTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="careers-field">
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Available days *</span>
              <div className="careers-choice-row" style={{ marginTop: "0.5rem" }}>
                {AVAILABILITY_DAYS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`careers-choice${form.availability[key] ? " careers-choice--active" : ""}`}
                    onClick={() => updateAvailability({ [key]: !form.availability[key] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="careers-field">
              Preferred hours *
              <input
                type="text"
                placeholder="e.g. Mornings, afternoons, flexible"
                value={form.availability.preferredHours}
                onChange={(e) => updateAvailability({ preferredHours: e.target.value })}
              />
            </label>
            <div className="careers-field-grid">
              <label className="careers-field">
                Desired start date *
                <input
                  type="date"
                  value={form.availability.desiredStartDate}
                  onChange={(e) => updateAvailability({ desiredStartDate: e.target.value })}
                />
              </label>
              <label className="careers-field">
                Employment preference *
                <select
                  value={form.availability.employmentPreference}
                  onChange={(e) =>
                    updateAvailability({
                      employmentPreference: e.target.value as CareerApplicationFormData["availability"]["employmentPreference"],
                    })
                  }
                >
                  <option value="">Select…</option>
                  <option value="part_time">Part-time</option>
                  <option value="full_time">Full-time</option>
                  <option value="either">Either</option>
                </select>
              </label>
            </div>
          </div>
        );

      case 4:
        return (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {SHORT_ANSWER_FIELDS.map(({ key, label }) => (
              <label key={key} className="careers-field">
                {label} *
                <textarea
                  value={form.shortAnswers[key]}
                  onChange={(e) => updateShortAnswer(key, e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--careers-muted)",
                    textAlign: "right",
                  }}
                >
                  {form.shortAnswers[key].length}/500
                </span>
              </label>
            ))}
          </div>
        );

      case 5:
        return (
          <div>
            <p style={{ margin: "0 0 1rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
              Upload your resume and driver&apos;s license. Certifications are optional but helpful.
            </p>
            {renderUploadZone("resume", "Resume", true, form.documents.resumeFileName || undefined)}
            {renderUploadZone(
              "driversLicense",
              "Driver's license",
              true,
              form.documents.driversLicenseFileName || undefined
            )}
            {renderUploadZone("certification", "Certifications", false)}
            {form.documents.certificationUrls.length > 0 && (
              <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", color: "var(--careers-muted)", fontSize: "0.875rem" }}>
                {form.documents.certificationUrls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--careers-accent)" }}>
                      Certification uploaded
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 6:
        return (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <p style={{ margin: 0, color: "var(--careers-muted)", lineHeight: 1.6 }}>
              Review your application before submitting. You can edit any section below.
            </p>

            <ReviewSection title="Position" onEdit={() => setStep(0)}>
              <p style={{ margin: 0 }}>{form.positionTitle}</p>
            </ReviewSection>

            <ReviewSection title="Personal information" onEdit={() => setStep(0)}>
              <p style={{ margin: "0 0 0.25rem" }}>
                {form.personal.firstName} {form.personal.lastName}
              </p>
              <p style={{ margin: "0 0 0.25rem", color: "var(--careers-muted)" }}>{form.personal.email}</p>
              <p style={{ margin: 0, color: "var(--careers-muted)" }}>
                {form.personal.phone} · {form.personal.city}, {form.personal.state} {form.personal.zip}
              </p>
            </ReviewSection>

            <ReviewSection title="Work eligibility" onEdit={() => setStep(1)}>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.6, fontSize: "0.875rem" }}>
                {ELIGIBILITY_FIELDS.map(({ key, label }) => (
                  <li key={key}>
                    {label}: {formatBool(form.eligibility[key])}
                  </li>
                ))}
              </ul>
            </ReviewSection>

            <ReviewSection title="Experience" onEdit={() => setStep(2)}>
              <p style={{ margin: "0 0 0.25rem" }}>
                {form.experience.previousEmployer} · {form.experience.yearsWorked}
              </p>
              {form.experience.reasonForLeaving && (
                <p style={{ margin: "0 0 0.25rem", color: "var(--careers-muted)", fontSize: "0.875rem" }}>
                  Left because: {form.experience.reasonForLeaving}
                </p>
              )}
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Customer service: {formatBool(form.experience.customerServiceExperience)}
              </p>
              {form.experience.experienceTags.length > 0 && (
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--careers-muted)" }}>
                  Tags: {form.experience.experienceTags.join(", ")}
                </p>
              )}
            </ReviewSection>

            <ReviewSection title="Availability" onEdit={() => setStep(3)}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Days:{" "}
                {AVAILABILITY_DAYS.filter(({ key }) => form.availability[key])
                  .map(({ label }) => label)
                  .join(", ") || "None selected"}
              </p>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Hours: {form.availability.preferredHours || "—"}
              </p>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Start date: {form.availability.desiredStartDate || "—"}
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                Preference: {formatEmploymentPreference(form.availability.employmentPreference)}
              </p>
            </ReviewSection>

            <ReviewSection title="Short answers" onEdit={() => setStep(4)}>
              {SHORT_ANSWER_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ marginBottom: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 600, fontSize: "0.8125rem" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--careers-muted)", lineHeight: 1.5 }}>
                    {form.shortAnswers[key] || "—"}
                  </p>
                </div>
              ))}
            </ReviewSection>

            <ReviewSection title="Documents" onEdit={() => setStep(5)}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Resume: {form.documents.resumeFileName || (form.documents.resumeUrl ? "Uploaded" : "Missing")}
              </p>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
                Driver&apos;s license:{" "}
                {form.documents.driversLicenseFileName ||
                  (form.documents.driversLicenseUrl ? "Uploaded" : "Missing")}
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                Certifications: {form.documents.certificationUrls.length} file
                {form.documents.certificationUrls.length === 1 ? "" : "s"}
              </p>
            </ReviewSection>

            <label
              className="careers-field"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                cursor: "pointer",
                padding: "0.875rem 1rem",
                border: "1px solid var(--careers-border)",
                borderRadius: "12px",
                background: "var(--careers-bg)",
              }}
            >
              <input
                type="checkbox"
                checked={form.joinTalentPool}
                onChange={(e) => updateForm({ joinTalentPool: e.target.checked })}
                style={{ marginTop: "0.2rem", accentColor: "var(--careers-accent)" }}
              />
              <span>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                  Join our talent pool
                </strong>
                <span style={{ fontSize: "0.875rem", color: "var(--careers-muted)", fontWeight: 400 }}>
                  If this role isn&apos;t the right fit, we&apos;ll keep your profile for future openings.
                </span>
              </span>
            </label>

            {form.joinTalentPool && (
              <label className="careers-field">
                Desired future role (optional)
                <input
                  type="text"
                  placeholder="e.g. Route Supervisor"
                  value={form.talentPoolDesiredRole}
                  onChange={(e) => updateForm({ talentPoolDesiredRole: e.target.value })}
                />
              </label>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="careers-wizard">
      <div className="careers-progress">
        <div className="careers-progress__label">
          <span>
            Step {step + 1} of {TOTAL_STEPS}: {APPLICATION_WIZARD_STEPS[step]}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="careers-progress__bar">
          <div className="careers-progress__fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div style={{ minHeight: "280px" }}>{renderStepContent()}</div>

      {(stepError || submitError) && (
        <div
          role="alert"
          style={{
            margin: "1rem 0 0",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {stepError || submitError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginTop: "1.5rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--careers-border)",
        }}
      >
        <button
          type="button"
          className="btn btn-outline"
          onClick={goBack}
          disabled={step === 0 || isSubmitting}
          style={{ opacity: step === 0 ? 0.5 : 1 }}
        >
          Back
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button type="button" className="btn btn-primary" onClick={goNext}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit Application"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "1rem 1.125rem",
        borderRadius: "12px",
        border: "1px solid var(--careers-border)",
        background: "var(--careers-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.625rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700 }}>{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--careers-accent)",
            fontWeight: 600,
            fontSize: "0.8125rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}
