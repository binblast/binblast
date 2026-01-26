// app/employee/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function EmployeeRegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payRatePerJob, setPayRatePerJob] = useState("10.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate a secure temporary password
  function generateTemporaryPassword(): string {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = "";
    // Ensure at least one character from each set
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split("").sort(() => Math.random() - 0.5).join("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const { createUserWithEmailAndPassword, updateProfile, getDbInstance } = await import("@/lib/firebase");
      const db = await getDbInstance();
      
      // Generate temporary password automatically
      const tempPassword = generateTemporaryPassword();
      
      // Create Firebase user with temporary password
      const userCredential = await createUserWithEmailAndPassword(email, tempPassword);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Save employee data to Firestore
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, doc, setDoc, serverTimestamp } = firestore;
      
      if (db && userCredential.user) {
        const userDocRef = doc(collection(db, "users"), userCredential.user.uid);
        const { addDoc } = firestore;
        
        await setDoc(userDocRef, {
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone: phone || null,
          role: "employee",
          serviceArea: [], // Service areas will be assigned later by operators
          payRatePerJob: payRatePerJob ? parseFloat(payRatePerJob) : null,
          hiringStatus: "pending_approval",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Create application document
        const applicationsRef = collection(db, "employeeApplications");
        await addDoc(applicationsRef, {
          employeeId: userCredential.user.uid,
          applicationDate: serverTimestamp(),
          status: "pending",
        });
        
        console.log("[Employee Register] Employee account created successfully");
      }
      
      setSuccess(true);
      
      // Redirect to employee dashboard after 2 seconds
      setTimeout(() => {
        router.push("/employee/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("[Employee Register] Error:", err);
      
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please log in instead.");
      } else {
        setError(err.message || "Failed to create employee account. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Register New Employee
            </h1>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "2rem" }}>
              Create a new employee account for field operations
            </p>

            {success ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "#16a34a" }}>
                  Application Submitted!
                </h2>
                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  Your employee application has been submitted and is pending admin approval.
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  You will be notified once your application is reviewed. Redirecting...
                </p>
              </div>
            ) : (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                      Phone <span style={{ color: "#6b7280", fontWeight: "400" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                      Pay Rate Per Service
                      <span style={{ display: "block", fontSize: "0.75rem", color: "#6b7280", fontWeight: "400", marginTop: "0.25rem" }}>
                        Fixed rate: $10 per service per house per visit (regardless of number of trash cans)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payRatePerJob}
                      disabled={true}
                      readOnly
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        background: "#f3f4f6",
                        color: "#6b7280",
                        cursor: "not-allowed"
                      }}
                    />
                  </div>

                  <div style={{
                    padding: "1rem",
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    color: "#0369a1"
                  }}>
                    <strong>Note:</strong> A temporary password will be automatically generated for this employee account. The employee will need to reset their password on first login.
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
                    disabled={loading}
                    className={`btn btn-primary ${loading ? "disabled" : ""}`}
                    style={{
                      width: "100%",
                      marginTop: "0.5rem",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "Creating Employee Account..." : "Create Employee Account"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem" }}>
                    Employee already has an account?{" "}
                    <Link href="/login" style={{ color: "#16a34a", fontWeight: "600", textDecoration: "none" }}>
                      Log in
                    </Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

