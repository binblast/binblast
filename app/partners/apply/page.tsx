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
    serviceAreas: "",
    businessType: "",
  });

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
          } else {
            // Redirect to login if not authenticated
            router.push("/login?redirect=/partners/apply");
          }
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

    if (!userId) {
      setError("Please log in to apply");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/partners/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          ...formData,
          serviceAreas: formData.serviceAreas.split(",").map(s => s.trim()).filter(s => s),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
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
                Thank you for applying to become a Bin Blast Co. partner. We'll review your application and get back to you within 24-48 hours.
              </p>
              <button
                onClick={() => router.push("/partners/dashboard")}
                className="btn btn-primary"
                style={{
                  padding: "0.75rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                View Dashboard
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
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Partner Application
            </h1>
            <p style={{ 
              fontSize: "1rem", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "2rem"
            }}>
              Fill out the form below to apply for our Business Partner Program
            </p>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2.5rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
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
