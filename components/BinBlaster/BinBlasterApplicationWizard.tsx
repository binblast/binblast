"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BIN_BLASTER_AVAILABLE_DAYS,
  BIN_BLASTER_SERVICE_AREAS,
  BIN_BLASTER_WIZARD_STEPS,
  type BinBlasterApplicationFormData,
  type BinBlasterPayInfo,
} from "@/lib/bin-blaster-types";
import {
  clearBinBlasterDraft,
  createEmptyBinBlasterForm,
  formatPhoneInput,
  loadBinBlasterDraft,
  saveBinBlasterDraft,
  validateBinBlasterStep,
} from "@/lib/bin-blaster-application";
import "@/app/careers/careers.css";
import "./bin-blaster.css";

const TOTAL_STEPS = BIN_BLASTER_WIZARD_STEPS.length;

const YES_NO_FIELDS: Array<{
  key: keyof BinBlasterApplicationFormData["work"];
  label: string;
  required?: boolean;
}> = [
  { key: "hasDriversLicense", label: "Do you have a valid driver's license?" },
  { key: "hasReliableTransportation", label: "Do you have reliable transportation?" },
  { key: "authorizedToWork", label: "Are you legally authorized to work in the United States?" },
  { key: "hasRelevantExperience", label: "Have you previously worked in cleaning, pressure washing, landscaping, sanitation, or route-based work?" },
  { key: "comfortableOutdoors", label: "Are you comfortable working outdoors in heat, cold, and light rain?" },
  { key: "comfortableLifting", label: "Are you comfortable lifting, moving, and cleaning trash bins?" },
  { key: "backgroundCheckOk", label: "Are you willing to complete a background check if required?" },
];

function formatBool(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not answered";
}

function PayInfoCard({ payInfo }: { payInfo: BinBlasterPayInfo | null }) {
  if (!payInfo) {
    return (
      <div className="bin-blaster-pay-card">
        <p className="bin-blaster-pay-card__loading">Loading pay information...</p>
      </div>
    );
  }

  return (
    <div className="bin-blaster-pay-card">
      <h3>{payInfo.title}</h3>
      <p>{payInfo.introCopy}</p>
      <p><strong>Residential compensation currently starts at:</strong></p>
      <ul>
        <li>${payInfo.residentialFirstBin} for the first bin at a service location</li>
        <li>${payInfo.residentialAdditionalBin} for each additional bin at the same location</li>
      </ul>
      <p>{payInfo.commercialCopy}</p>
      <p>{payInfo.finalCopy}</p>
    </div>
  );
}

export function BinBlasterApplicationWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BinBlasterApplicationFormData>(() => loadBinBlasterDraft() || createEmptyBinBlasterForm());
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [payInfo, setPayInfo] = useState<BinBlasterPayInfo | null>(null);

  useEffect(() => {
    saveBinBlasterDraft(form);
  }, [form]);

  useEffect(() => {
    fetch("/api/bin-blaster/pay-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.payInfo) setPayInfo(data.payInfo);
      })
      .catch(() => {
        setPayInfo({
          title: "How Bin Blasters Are Paid",
          introCopy:
            "Bin Blasters are paid per completed service. Compensation may vary based on the number of bins, route type, job size, and whether the service is residential, HOA, restaurant, or commercial.",
          residentialFirstBin: 8,
          residentialAdditionalBin: 2,
          commercialCopy:
            "Commercial and larger jobs may use a percentage-based or custom compensation amount determined by management.",
          finalCopy: "Final compensation details are confirmed before a route or job is accepted.",
        });
      });
  }, []);

  const updatePersonal = useCallback((patch: Partial<BinBlasterApplicationFormData["personal"]>) => {
    setForm((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
  }, []);

  const updateWork = useCallback((patch: Partial<BinBlasterApplicationFormData["work"]>) => {
    setForm((prev) => ({ ...prev, work: { ...prev.work, ...patch } }));
  }, []);

  const toggleServiceArea = useCallback((area: string) => {
    setForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter((item) => item !== area)
        : [...prev.serviceAreas, area],
    }));
  }, []);

  const toggleAvailableDay = useCallback((day: string) => {
    setForm((prev) => ({
      ...prev,
      work: {
        ...prev.work,
        availableDays: prev.work.availableDays.includes(day)
          ? prev.work.availableDays.filter((item) => item !== day)
          : [...prev.work.availableDays, day],
      },
    }));
  }, []);

  const updateAgreement = useCallback((key: keyof BinBlasterApplicationFormData["agreements"], value: boolean) => {
    setForm((prev) => ({
      ...prev,
      agreements: { ...prev.agreements, [key]: value },
    }));
  }, []);

  function goNext() {
    const error = validateBinBlasterStep(step, form);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStepError(null);
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const error = validateBinBlasterStep(3, form);
    if (error) {
      setStepError(error);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setStepError(null);

    try {
      const response = await fetch("/api/bin-blaster/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application.");
      }

      clearBinBlasterDraft();
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bin-blaster-page">
        <div className="bin-blaster-shell">
          <div className="bin-blaster-confirmation careers-wizard">
            <h2>Application Received</h2>
            <p>
              Thank you for applying to become a Bin Blaster. Our team will review your application and contact you if your experience and availability match an open route.
            </p>
            <p className="bin-blaster-notice">
              This is an application review only. Employee portal access is provided after approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="bin-blaster-page">
      <div className="bin-blaster-shell">
        <header className="bin-blaster-header">
          <h1>Apply to Become a Bin Blaster</h1>
          <p>
            Join the Bin Blast Co. team and earn money cleaning residential and commercial trash bins on assigned Metro Atlanta routes.
          </p>
          <p className="bin-blaster-notice">
            This is an application, not an automatic employee account. All applications must be reviewed and approved before access to the employee portal is provided.
          </p>
        </header>

        <div className="careers-wizard">
          <div className="careers-progress">
            <div className="careers-progress__label">
              <span>Step {step + 1} of {TOTAL_STEPS}</span>
              <span>{BIN_BLASTER_WIZARD_STEPS[step]}</span>
            </div>
            <div className="careers-progress__bar">
              <div className="careers-progress__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 0 && (
            <section>
              <h2 className="bin-blaster-section-title">Personal Information</h2>
              <div className="careers-field-grid">
                <div className="careers-field">
                  <label>
                    First Name *
                    <input
                      value={form.personal.firstName}
                      onChange={(e) => updatePersonal({ firstName: e.target.value })}
                      placeholder="Jane"
                      autoComplete="given-name"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    Last Name *
                    <input
                      value={form.personal.lastName}
                      onChange={(e) => updatePersonal({ lastName: e.target.value })}
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    Email Address *
                    <input
                      type="email"
                      value={form.personal.email}
                      onChange={(e) => updatePersonal({ email: e.target.value.trim() })}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    Phone Number *
                    <input
                      type="tel"
                      value={form.personal.phone}
                      onChange={(e) => updatePersonal({ phone: formatPhoneInput(e.target.value) })}
                      placeholder="(404) 555-0123"
                      autoComplete="tel"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    City *
                    <input
                      value={form.personal.city}
                      onChange={(e) => updatePersonal({ city: e.target.value })}
                      placeholder="Fayetteville"
                      autoComplete="address-level2"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    ZIP Code *
                    <input
                      value={form.personal.zip}
                      onChange={(e) => updatePersonal({ zip: e.target.value })}
                      placeholder="30214"
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <label>
                    Date of Birth *
                    <input
                      type="date"
                      value={form.personal.dateOfBirth}
                      onChange={(e) => updatePersonal({ dateOfBirth: e.target.value })}
                    />
                  </label>
                </div>
                <div className="careers-field">
                  <span>Are you at least 18 years old? *</span>
                  <div className="careers-choice-row">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        className={`careers-choice ${form.personal.isAtLeast18 === value ? "careers-choice--active" : ""}`}
                        onClick={() => updatePersonal({ isAtLeast18: value })}
                      >
                        {value ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="bin-blaster-section-title">Work Information</h2>
              <div className="bin-blaster-stack">
                {YES_NO_FIELDS.map(({ key, label }) => (
                  <div key={key} className="careers-field">
                    <span>{label}{key !== "hasRelevantExperience" ? " *" : ""}</span>
                    <div className="careers-choice-row">
                      {[true, false].map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          className={`careers-choice ${form.work[key] === value ? "careers-choice--active" : ""}`}
                          onClick={() => updateWork({ [key]: value } as Partial<BinBlasterApplicationFormData["work"]>)}
                        >
                          {value ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="careers-field">
                  <label>
                    Briefly describe your relevant experience
                    <textarea
                      value={form.work.experienceDescription}
                      onChange={(e) => updateWork({ experienceDescription: e.target.value })}
                      placeholder="Share any cleaning, route, pressure washing, or related experience."
                    />
                  </label>
                </div>

                <div className="careers-field">
                  <label>
                    Why would you like to work with Bin Blast Co.? *
                    <textarea
                      value={form.work.whyBinBlast}
                      onChange={(e) => updateWork({ whyBinBlast: e.target.value })}
                      placeholder="Tell us what interests you about this role."
                    />
                  </label>
                </div>

                <PayInfoCard payInfo={payInfo} />
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="bin-blaster-section-title">Availability and Service Areas</h2>
              <div className="bin-blaster-stack">
                <div className="careers-field">
                  <label>
                    How soon can you start? *
                    <input
                      value={form.work.startTimeline}
                      onChange={(e) => updateWork({ startTimeline: e.target.value })}
                      placeholder="Immediately, within 2 weeks, etc."
                    />
                  </label>
                </div>

                <div className="careers-field">
                  <span>What days are you available? *</span>
                  <div className="bin-blaster-checkbox-grid">
                    {BIN_BLASTER_AVAILABLE_DAYS.map((day) => (
                      <label key={day} className="bin-blaster-checkbox">
                        <input
                          type="checkbox"
                          checked={form.work.availableDays.includes(day)}
                          onChange={() => toggleAvailableDay(day)}
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="careers-field">
                  <label>
                    What times are you generally available? *
                    <input
                      value={form.work.availableTimes}
                      onChange={(e) => updateWork({ availableTimes: e.target.value })}
                      placeholder="Mornings, afternoons, weekdays after 3pm, etc."
                    />
                  </label>
                </div>

                <div className="careers-field">
                  <span>Which areas are you available to work in? *</span>
                  <div className="bin-blaster-checkbox-grid">
                    {BIN_BLASTER_SERVICE_AREAS.map((area) => (
                      <label key={area} className="bin-blaster-checkbox">
                        <input
                          type="checkbox"
                          checked={form.serviceAreas.includes(area)}
                          onChange={() => toggleServiceArea(area)}
                        />
                        <span>{area}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="bin-blaster-section-title">Review and Submit</h2>
              <div className="bin-blaster-review">
                <div>
                  <h3>Personal Information</h3>
                  <p>{form.personal.firstName} {form.personal.lastName}</p>
                  <p>{form.personal.email} · {form.personal.phone}</p>
                  <p>{form.personal.city}, GA {form.personal.zip}</p>
                  <p>Date of birth: {form.personal.dateOfBirth || "—"} · 18+: {formatBool(form.personal.isAtLeast18)}</p>
                </div>
                <div>
                  <h3>Work Eligibility</h3>
                  <p>Driver&apos;s license: {formatBool(form.work.hasDriversLicense)}</p>
                  <p>Transportation: {formatBool(form.work.hasReliableTransportation)}</p>
                  <p>Authorized to work: {formatBool(form.work.authorizedToWork)}</p>
                  <p>Relevant experience: {formatBool(form.work.hasRelevantExperience)}</p>
                </div>
                <div>
                  <h3>Availability</h3>
                  <p>Start timeline: {form.work.startTimeline || "—"}</p>
                  <p>Days: {form.work.availableDays.join(", ") || "—"}</p>
                  <p>Times: {form.work.availableTimes || "—"}</p>
                  <p>Service areas: {form.serviceAreas.join(", ") || "—"}</p>
                </div>
              </div>

              <PayInfoCard payInfo={payInfo} />

              <div className="bin-blaster-agreements">
                <label className="bin-blaster-checkbox">
                  <input
                    type="checkbox"
                    checked={form.agreements.noGuarantee}
                    onChange={(e) => updateAgreement("noGuarantee", e.target.checked)}
                  />
                  <span>I understand that submitting this application does not guarantee employment or route assignments.</span>
                </label>
                <label className="bin-blaster-checkbox">
                  <input
                    type="checkbox"
                    checked={form.agreements.compensationBased}
                    onChange={(e) => updateAgreement("compensationBased", e.target.checked)}
                  />
                  <span>I understand that compensation is based on completed and verified services.</span>
                </label>
                <label className="bin-blaster-checkbox">
                  <input
                    type="checkbox"
                    checked={form.agreements.accurateInfo}
                    onChange={(e) => updateAgreement("accurateInfo", e.target.checked)}
                  />
                  <span>I confirm that the information submitted in this application is accurate.</span>
                </label>
                <label className="bin-blaster-checkbox">
                  <input
                    type="checkbox"
                    checked={form.agreements.followProcedures}
                    onChange={(e) => updateAgreement("followProcedures", e.target.checked)}
                  />
                  <span>I agree to follow Bin Blast Co. safety, customer-service, equipment, and route procedures if approved.</span>
                </label>
              </div>
            </section>
          )}

          {(stepError || submitError) && (
            <div className="bin-blaster-error" role="alert">
              {stepError || submitError}
            </div>
          )}

          <div className="bin-blaster-actions">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isSubmitting}>
                Back
              </button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            ) : (
              <button
                type="button"
                className={`btn btn-primary ${isSubmitting ? "disabled" : ""}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
