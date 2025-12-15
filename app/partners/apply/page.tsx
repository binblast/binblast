// app/partners/apply/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function PartnerApplyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    websiteOrInstagram: "",
    serviceAreas: "",
    businessType: "",
    hasInsurance: false,
    promotionMethod: "",
    heardAboutUs: "",
  });
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [emailConsentChecked, setEmailConsentChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          setUserId(auth.currentUser.uid);
          setUserEmail(auth.currentUser.email || "");
          setFormData(prev => ({ ...prev, email: auth.currentUser?.email || "" }));
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
            setUserEmail(user.email || "");
            setFormData(prev => ({ ...prev, email: user.email || "" }));
          }
          // Don't require login - allow anyone to apply
          setLoading(false);
        });
        
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!agreementChecked || !emailConsentChecked) {
      setError("Please accept both agreement checkboxes to continue");
      setSubmitting(false);
      return;
    }

    // Submit application - userId is optional, can submit with just email
    try {
      const response = await fetch("/api/partners/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId || null, // Can be null if not logged in
          ...formData,
          serviceAreas: formData.serviceAreas.split(",").map(s => s.trim()).filter(s => s),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      // Send email notification via EmailJS (client-side, since EmailJS doesn't work server-side)
      if (data.emailData) {
        try {
          // Access environment variables (must be NEXT_PUBLIC_ prefix for client-side)
          const emailjsServiceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
          const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_aabpctf";
          const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

          if (emailjsPublicKey && adminEmail) {
            const emailjsUrl = `https://api.emailjs.com/api/v1.0/email/send`;
            
            const emailPayload = {
              service_id: emailjsServiceId,
              template_id: emailjsTemplateId,
              user_id: emailjsPublicKey,
              template_params: {
                ...data.emailData,
                to_email: adminEmail,
              },
            };

            const emailResponse = await fetch(emailjsUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error("[Partner Application] EmailJS error:", errorText);
            } else {
              console.log("[Partner Application] Email notification sent successfully");
            }
          } else {
            console.warn("[Partner Application] EmailJS not configured. Missing:", {
              publicKey: !emailjsPublicKey,
              adminEmail: !adminEmail,
            });
          }
        } catch (emailError: any) {
          // Don't fail the application if email fails
          console.error("[Partner Application] Email sending error:", emailError);
        }
      }

      // Application submitted successfully - show confirmation
      setSuccess(true);
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit application. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center" }}>Loading...</div>
          </div>
        </main>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem", color: "#16a34a" }}>
                Application Submitted!
              </h1>
              <p style={{ fontSize: "1.125rem", color: "var(--text-light)", marginBottom: "2rem" }}>
                Thanks, {formData.ownerName}! We've received your application. We'll review it within 1–2 business days and email you with next steps.
              </p>
              <button
                onClick={() => router.push("/")}
                className="btn btn-primary"
                style={{
                  padding: "0.75rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ 
        minHeight: "calc(100vh - 80px)", 
        padding: "clamp(2rem, 5vw, 4rem) 0", 
        background: "var(--bg-white)" 
      }}>
        <div className="container">
          <div style={{ 
            maxWidth: "700px", 
            margin: "0 auto",
            padding: "0 1rem"
          }}>
            <h1 className="section-title" style={{ 
              textAlign: "center", 
              marginBottom: "1rem",
              fontSize: "clamp(1.75rem, 5vw, 2.25rem)"
            }}>
              Partner Application
            </h1>
            <p style={{ 
              fontSize: "clamp(0.9rem, 3vw, 1rem)", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "clamp(1.5rem, 4vw, 2rem)",
              lineHeight: "1.6"
            }}>
              Fill out the form below to apply for our Business Partner Program
            </p>

            <div style={{
              background: "#ffffff",
              borderRadius: "clamp(12px, 3vw, 20px)",
              padding: "clamp(1.5rem, 4vw, 2.5rem)",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <form onSubmit={handleSubmit} style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "clamp(1.25rem, 3vw, 1.5rem)" 
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: "clamp(0.875rem, 2.5vw, 0.9rem)", 
                    fontWeight: "500", 
                    marginBottom: "0.5rem", 
                    color: "var(--text-dark)" 
                  }}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "clamp(0.875rem, 2.5vw, 0.75rem) clamp(1rem, 3vw, 1rem)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "clamp(16px, 4vw, 0.95rem)",
                      minHeight: "44px", // Touch-friendly minimum height
                      WebkitAppearance: "none",
                      appearance: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Type of Business *
                  </label>
                  <select
                    required
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      background: "#ffffff"
                    }}
                  >
                    <option value="">Select business type</option>
                    <option value="car_detailer">Car Detailer</option>
                    <option value="pressure_washer">Pressure Washer</option>
                    <option value="landscaper">Landscaper</option>
                    <option value="property_manager">Property Manager</option>
                    <option value="hvac">HVAC Company</option>
                    <option value="other">Other Service Business</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Website / Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.websiteOrInstagram}
                    onChange={(e) => setFormData({ ...formData, websiteOrInstagram: e.target.value })}
                    placeholder="https://yourwebsite.com or @yourinstagram"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Service Areas *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serviceAreas}
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                    placeholder="e.g., Peachtree City, Fayetteville, Newnan (comma-separated)"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
                    List cities or zip codes where you operate (comma-separated)
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Do you have general liability insurance? *
                  </label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="hasInsurance"
                        checked={formData.hasInsurance === true}
                        onChange={() => setFormData({ ...formData, hasInsurance: true })}
                        required
                        style={{ cursor: "pointer" }}
                      />
                      <span>Yes</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="hasInsurance"
                        checked={formData.hasInsurance === false}
                        onChange={() => setFormData({ ...formData, hasInsurance: false })}
                        required
                        style={{ cursor: "pointer" }}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    How will you promote Bin Blast Co.? *
                  </label>
                  <textarea
                    required
                    value={formData.promotionMethod}
                    onChange={(e) => setFormData({ ...formData, promotionMethod: e.target.value })}
                    placeholder="e.g., add to my service packages, email my customer list, SMS to customers, add to my website, social media posts"
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    How did you hear about the partner program?
                  </label>
                  <input
                    type="text"
                    value={formData.heardAboutUs}
                    onChange={(e) => setFormData({ ...formData, heardAboutUs: e.target.value })}
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>

                <div style={{
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb"
                }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", marginBottom: "1rem" }}>
                    <input
                      type="checkbox"
                      checked={agreementChecked}
                      onChange={(e) => setAgreementChecked(e.target.checked)}
                      required
                      style={{ marginTop: "0.25rem", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                      I understand this is an application only and does not guarantee partnership. *
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={emailConsentChecked}
                      onChange={(e) => setEmailConsentChecked(e.target.checked)}
                      required
                      style={{ marginTop: "0.25rem", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                      I agree to receive emails about my application and the partner program. *
                    </span>
                  </label>
                </div>

                {error && (
                  <div style={{
                    padding: "0.75rem 1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "0.875rem"
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn btn-primary ${submitting ? "disabled" : ""}`}
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
