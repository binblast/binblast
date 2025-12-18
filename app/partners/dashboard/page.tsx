// app/partners/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AddTeamMemberModal } from "@/components/PartnerDashboard/AddTeamMemberModal";
import { PartnerPayroll } from "@/components/PartnerDashboard/PartnerPayroll";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface PartnerData {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceArea: string;
  serviceType: string;
  status: "pending_agreement" | "active" | "suspended";
  revenueSharePartner: number;
  revenueSharePlatform: number;
  referralCode: string;
  partnerCode?: string;
  bookingLinkSlug: string;
  websiteOrInstagram?: string;
  hasInsurance?: boolean;
  promotionMethod?: string;
  heardAboutUs?: string;
}

interface PartnerBooking {
  id: string;
  partnerId: string;
  customerName: string | null;
  customerEmail: string;
  planId: string | null;
  planName: string;
  bookingAmount: number; // in cents
  partnerShareAmount: number; // in cents
  status: "active" | "cancelled" | "refunded" | "trial";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: any;
  updatedAt: any;
  nextServiceDate: any | null;
  firstServiceDate: any | null;
}

interface Customer {
  email: string;
  name: string | null;
  bookings: PartnerBooking[];
  nextServiceDate: Date | null;
  activeSubscriptions: number;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  serviceArea: string[];
  payRatePerJob: number;
  hiringStatus: string;
  tempPassword?: string;
  hasChangedPassword?: boolean;
}

function TeamMemberRow({ member }: { member: TeamMember }) {
  const [trainingStatus, setTrainingStatus] = useState<{
    status: string;
    completed: boolean;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    async function checkTrainingStatus() {
      try {
        const response = await fetch(`/api/operator/employees/${member.id}/training`);
        if (response.ok) {
          const data = await response.json();
          const allCompleted = data.modules?.every((m: any) => m.completed) || false;
          setTrainingStatus({
            status: allCompleted ? "certified" : "in_progress",
            completed: allCompleted,
          });
        }
      } catch (err) {
        console.error("Error checking training status:", err);
      }
    }
    checkTrainingStatus();
  }, [member.id]);

  const handleCopyPassword = async () => {
    if (member.tempPassword) {
      try {
        await navigator.clipboard.writeText(member.tempPassword);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } catch (error) {
        console.error("Failed to copy password:", error);
      }
    }
  };

  const hasTempPassword = member.tempPassword && !member.hasChangedPassword;

  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }} onMouseEnter={(e) => {
      e.currentTarget.style.background = "#f9fafb";
    }} onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
    }}>
      <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#111827" }}>
        {member.firstName} {member.lastName}
      </td>
      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
        {member.email}
      </td>
      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
        {member.serviceArea.length > 0 ? member.serviceArea.join(", ") : "Not assigned"}
      </td>
      <td style={{ padding: "0.75rem 1rem" }}>
        {trainingStatus ? (
          <span style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: "600",
            background: trainingStatus.completed ? "#dcfce7" : "#fef3c7",
            color: trainingStatus.completed ? "#166534" : "#92400e"
          }}>
            {trainingStatus.completed ? "✓ Certified" : "⏳ In Training"}
          </span>
        ) : (
          <span style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: "600",
            background: "#f3f4f6",
            color: "#6b7280"
          }}>
            Checking...
          </span>
        )}
      </td>
      <td style={{ padding: "0.75rem 1rem" }}>
        {hasTempPassword ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Temp Password:</span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                {showPassword ? (
                  <>
                    <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{member.tempPassword}</span>
                    <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.36m0 0L21 21" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>••••••••</span>
                    <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={handleCopyPassword}
                style={{
                  background: copiedPassword ? "#16a34a" : "#f3f4f6",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  color: copiedPassword ? "#ffffff" : "#374151",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
                onMouseEnter={(e) => {
                  if (!copiedPassword) {
                    e.currentTarget.style.background = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = copiedPassword ? "#16a34a" : "#f3f4f6";
                }}
              >
                {copiedPassword ? (
                  <>
                    <svg style={{ width: "12px", height: "12px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg style={{ width: "12px", height: "12px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontStyle: "italic" }}>
              Available until changed
            </span>
          </div>
        ) : (
          <span style={{ fontSize: "0.875rem", color: "#16a34a", fontWeight: "600" }}>
            ✓ Password Changed
          </span>
        )}
      </td>
      <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "#16a34a" }}>
        ${member.payRatePerJob.toFixed(2)}/job
      </td>
    </tr>
  );
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [upcomingCleanings, setUpcomingCleanings] = useState<Array<{ customer: string; date: Date; plan: string; address?: string }>>([]);
  const [stats, setStats] = useState({
    thisMonthEarnings: 0,
    totalCustomers: 0,
    activeSubscriptions: 0,
    nextPayoutDate: "Payouts processed on the 25th of each month",
    totalCommissionsPaid: 0,
    pendingCommissions: 0,
    heldCommissions: 0,
  });
  const [copied, setCopied] = useState(false);
  const [copiedSignupLink, setCopiedSignupLink] = useState(false);
  const [showPlaybookScripts, setShowPlaybookScripts] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<number | null>(null);
  const [copiedStrategy, setCopiedStrategy] = useState<string | null>(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    connected: boolean;
    status: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    serviceArea: string[];
    payRatePerJob: number;
    hiringStatus: string;
  }>>([]);
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [payouts, setPayouts] = useState<Array<{
    id: string;
    amount: number;
    grossAmount: number;
    employeeCosts: number;
    currency: string;
    status: string;
    stripeTransferId: string | null;
    payoutDate: string | null;
    createdAt: string | null;
  }>>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);
  const [loadingStripeLink, setLoadingStripeLink] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          setUserId(auth.currentUser.uid);
          loadPartnerData(auth.currentUser.uid);
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
            loadPartnerData(user.uid);
          } else {
            router.push("/login?redirect=/partners/dashboard");
          }
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

  async function loadPartnerData(uid: string) {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, query, where, getDocs, doc, getDoc } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      let partnersQuery = query(
        collection(db, "partners"),
        where("userId", "==", uid),
        where("status", "==", "active")
      );
      let partnersSnapshot = await getDocs(partnersQuery);

      if (partnersSnapshot.empty) {
        const { getAuthInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        const userEmail = auth?.currentUser?.email;
        
        if (userEmail) {
          const partnersByEmailQuery = query(
            collection(db, "partners"),
            where("email", "==", userEmail),
            where("status", "==", "active")
          );
          const partnersByEmailSnapshot = await getDocs(partnersByEmailQuery);
          
          if (!partnersByEmailSnapshot.empty) {
            partnersSnapshot = partnersByEmailSnapshot;
          }
        }
      }

      if (partnersSnapshot.empty) {
        let allPartnersQuery = query(
          collection(db, "partners"),
          where("userId", "==", uid)
        );
        let allPartnersSnapshot = await getDocs(allPartnersQuery);
        
        if (allPartnersSnapshot.empty) {
          const { getAuthInstance } = await import("@/lib/firebase");
          const auth = await getAuthInstance();
          const userEmail = auth?.currentUser?.email;
          
          if (userEmail) {
            allPartnersQuery = query(
              collection(db, "partners"),
              where("email", "==", userEmail)
            );
            allPartnersSnapshot = await getDocs(allPartnersQuery);
          }
        }
        
        if (!allPartnersSnapshot.empty) {
          const partnerData = allPartnersSnapshot.docs[0].data();
          if (partnerData.status === "pending_agreement") {
            router.push(`/partners/agreement/${allPartnersSnapshot.docs[0].id}`);
            return;
          }
        }
        
        setLoading(false);
        return;
      }

      const partnerDoc = partnersSnapshot.docs[0];
      const data = partnerDoc.data();
      
      if (data && partnerDoc.id) {
        setPartnerData({
          id: partnerDoc.id,
          ...data,
        } as PartnerData);
      } else {
        setLoading(false);
        return;
      }

      const bookingsQuery = query(
        collection(db, "partnerBookings"),
        where("partnerId", "==", partnerDoc.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList: PartnerBooking[] = [];
      const customerMap = new Map<string, Customer>();
      let thisMonthEarningsCents = 0;
      let activeSubscriptionsCount = 0;
      let totalCommissionsPaidCents = 0;
      let pendingCommissionsCents = 0;
      let heldCommissionsCents = 0;

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        const booking: PartnerBooking = {
          id: doc.id,
          ...bookingData,
        } as PartnerBooking;
        
        bookingsList.push(booking);

        const email = bookingData.customerEmail;
        if (email) {
          if (!customerMap.has(email)) {
            customerMap.set(email, {
              email,
              name: bookingData.customerName || null,
              bookings: [],
              nextServiceDate: null,
              activeSubscriptions: 0,
            });
          }
          const customer = customerMap.get(email)!;
          customer.bookings.push(booking);
          
          if (bookingData.nextServiceDate) {
            const nextDate = bookingData.nextServiceDate?.toDate?.() || new Date(bookingData.nextServiceDate?.seconds * 1000);
            if (!customer.nextServiceDate || nextDate < customer.nextServiceDate) {
              customer.nextServiceDate = nextDate;
            }
          }
          
          if (bookingData.status === "active") {
            customer.activeSubscriptions++;
            activeSubscriptionsCount++;
          }
        }

        const commissionAmount = bookingData.partnerShareAmount || 0;
        const bookingDate = bookingData.createdAt?.toDate?.() || new Date(bookingData.createdAt?.seconds * 1000 || Date.now());
        if (bookingDate >= currentMonthStart && bookingData.status !== "refunded") {
          thisMonthEarningsCents += commissionAmount;
        }
        
        // Track commission status
        const commissionStatus = bookingData.commissionStatus || 'pending';
        if (commissionStatus === 'paid') {
          totalCommissionsPaidCents += commissionAmount;
        } else if (commissionStatus === 'pending') {
          pendingCommissionsCents += commissionAmount;
        } else if (commissionStatus === 'held') {
          heldCommissionsCents += commissionAmount;
        }
      });

      bookingsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      const customersList = Array.from(customerMap.values()).sort((a, b) => {
        if (!a.nextServiceDate) return 1;
        if (!b.nextServiceDate) return -1;
        return a.nextServiceDate.getTime() - b.nextServiceDate.getTime();
      });

      const cleanings: Array<{ customer: string; date: Date; plan: string; address?: string }> = [];
      customersList.forEach(customer => {
        if (customer.nextServiceDate && customer.nextServiceDate >= now) {
          const activeBooking = customer.bookings.find(b => b.status === "active");
          if (activeBooking) {
            cleanings.push({
              customer: customer.name || customer.email.split("@")[0],
              date: customer.nextServiceDate,
              plan: activeBooking.planName || "N/A",
            });
          }
        }
      });
      cleanings.sort((a, b) => a.date.getTime() - b.date.getTime());

      setBookings(bookingsList);
      setCustomers(customersList);
      setUpcomingCleanings(cleanings);
      setStats({
        thisMonthEarnings: thisMonthEarningsCents,
        totalCustomers: customerMap.size,
        activeSubscriptions: activeSubscriptionsCount,
        nextPayoutDate: "Payouts processed on the 25th of each month",
        totalCommissionsPaid: totalCommissionsPaidCents,
        pendingCommissions: pendingCommissionsCents,
        heldCommissions: heldCommissionsCents,
      });

      // Check Stripe Connect status
      if (partnerDoc.id) {
        try {
          const statusResponse = await fetch("/api/partners/stripe-connect/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partnerId: partnerDoc.id }),
          });
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            setStripeConnectStatus(statusData);
            // Load payouts if Stripe is connected
            if (statusData?.connected && statusData?.status === 'active') {
              loadPayouts();
            }
          }
        } catch (err) {
          console.error("Error checking Stripe Connect status:", err);
        }
      }

      setLoading(false);
      
      // Load team members
      if (partnerDoc.id) {
        loadTeamMembers(partnerDoc.id);
      }
    } catch (err) {
      console.error("Error loading partner data:", err);
      setLoading(false);
    }
  }

  async function loadTeamMembers(partnerId: string) {
    try {
      setLoadingTeamMembers(true);
      const response = await fetch(`/api/partners/team-members?partnerId=${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.employees || []);
      }
    } catch (err) {
      console.error("Error loading team members:", err);
    } finally {
      setLoadingTeamMembers(false);
    }
  }

  async function loadPayouts() {
    try {
      setLoadingPayouts(true);
      const response = await fetch('/api/partners/payouts');
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
      }
    } catch (err) {
      console.error("Error loading payouts:", err);
    } finally {
      setLoadingPayouts(false);
    }
  }

  async function handleViewStripeAccount() {
    try {
      setLoadingStripeLink(true);
      const response = await fetch('/api/partners/stripe-connect/login-link', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.loginUrl) {
          window.open(data.loginUrl, '_blank');
        }
      } else {
        alert('Failed to generate Stripe login link. Please try again.');
      }
    } catch (err) {
      console.error("Error getting Stripe login link:", err);
      alert('Failed to generate Stripe login link. Please try again.');
    } finally {
      setLoadingStripeLink(false);
    }
  }

  const partnerLink = typeof window !== "undefined" 
    ? `${window.location.origin}/#pricing?partner=${partnerData?.referralCode || partnerData?.partnerCode || ""}`
    : "";

  const partnerSignupLink = typeof window !== "undefined" && partnerData
    ? `${window.location.origin}/partner?partnerId=${partnerData.id}`
    : "";

  const handleCopy = async () => {
    if (partnerLink) {
      try {
        await navigator.clipboard.writeText(partnerLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleCopySignupLink = async () => {
    if (partnerSignupLink) {
      try {
        await navigator.clipboard.writeText(partnerSignupLink);
        setCopiedSignupLink(true);
        setTimeout(() => setCopiedSignupLink(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const generateQRCode = () => {
    if (!partnerLink) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(partnerLink)}`;
    setQrCodeUrl(qrUrl);
  };

  const handleDownloadPDF = () => {
    if (!partnerData || !partnerLink) return;
    
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>How to Sell Bin Blast Co. - Playbook</title>
  <style>
    @media print {
      @page { margin: 1in; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      color: #111827;
      font-size: 2rem;
      margin-bottom: 0.5rem;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 0.5rem;
    }
    h2 {
      color: #374151;
      font-size: 1.5rem;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    h3 {
      color: #111827;
      font-size: 1.25rem;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 1rem;
      margin-bottom: 2rem;
    }
    .strategy-card {
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
    }
    .strategy-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.5rem;
    }
    .strategy-desc {
      color: #6b7280;
      font-size: 0.9rem;
    }
    .script-box {
      background: #eff6ff;
      border: 2px solid #93c5fd;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      font-style: italic;
    }
    .partner-link {
      color: #2563eb;
      font-weight: 600;
      word-break: break-all;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>How to Sell Bin Blast Co.</h1>
  <p class="subtitle">A guided playbook to maximize your earnings</p>
  
  <div style="background: #eff6ff; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
    <strong>Your Partner Link:</strong><br>
    <span class="partner-link">${partnerLink}</span>
  </div>

  <h2>Sales Strategies</h2>
  
  <div class="strategy-card">
    <div class="strategy-title">📄 Put on invoices</div>
    <div class="strategy-desc">Add your booking link to every invoice and receipt</div>
  </div>
  
  <div class="strategy-card">
    <div class="strategy-title">💬 Text after service</div>
    <div class="strategy-desc">Send your link via text message after completing a service</div>
  </div>
  
  <div class="strategy-card">
    <div class="strategy-title">🌐 Add to website</div>
    <div class="strategy-desc">Include your booking link on your website or service menu</div>
  </div>
  
  <div class="strategy-card">
    <div class="strategy-title">📧 Follow-up emails</div>
    <div class="strategy-desc">Include your link in customer follow-up emails</div>
  </div>

  <h2>Top Performing Sales Scripts</h2>
  
  <h3>Script 1: After Service Completion</h3>
  <div class="script-box">
    "Thanks for choosing us! Want to keep your bins clean year-round? Check out Bin Blast Co.'s subscription service - ${partnerLink}. They offer monthly and bi-weekly cleaning plans."
  </div>
  
  <h3>Script 2: Invoice Follow-up</h3>
  <div class="script-box">
    "Your invoice is attached. As a bonus, here's a special link to Bin Blast Co.'s professional bin cleaning service: ${partnerLink}. They offer flexible plans perfect for maintaining clean bins between our visits."
  </div>
  
  <h3>Script 3: Social Media Post</h3>
  <div class="script-box">
    "Partnered with Bin Blast Co. to offer you the best bin cleaning service! Use my link to get started: ${partnerLink}. They handle everything - you just enjoy clean bins!"
  </div>

  <div class="footer">
    <p>Bin Blast Co. Partner Playbook</p>
    <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bin-Blast-Co-Playbook-${partnerData.businessName.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Also open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleCopyStrategy = async (strategy: string, template: string) => {
    try {
      await navigator.clipboard.writeText(template);
      setCopiedStrategy(strategy);
      setTimeout(() => setCopiedStrategy(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyScript = async (scriptIndex: number, scriptText: string) => {
    const scriptWithLink = scriptText.replace('[your link]', partnerLink);
    try {
      await navigator.clipboard.writeText(scriptWithLink);
      setCopiedScript(scriptIndex);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const salesScripts = [
    {
      title: "Script 1: After Service Completion",
      text: "Thanks for choosing us! Want to keep your bins clean year-round? Check out Bin Blast Co.'s subscription service - [your link]. They offer monthly and bi-weekly cleaning plans."
    },
    {
      title: "Script 2: Invoice Follow-up",
      text: "Your invoice is attached. As a bonus, here's a special link to Bin Blast Co.'s professional bin cleaning service: [your link]. They offer flexible plans perfect for maintaining clean bins between our visits."
    },
    {
      title: "Script 3: Social Media Post",
      text: "Partnered with Bin Blast Co. to offer you the best bin cleaning service! Use my link to get started: [your link]. They handle everything - you just enjoy clean bins!"
    }
  ];

  const strategyTemplates = {
    invoices: `Add this to your invoices:\n\n"Keep your bins clean year-round! Check out Bin Blast Co.'s subscription service: ${partnerLink}"`,
    text: `Text message template:\n\n"Thanks for choosing us! Want to keep your bins clean year-round? Check out Bin Blast Co.'s subscription service: ${partnerLink}. They offer monthly and bi-weekly cleaning plans."`,
    website: `Add this to your website:\n\n"Partnered with Bin Blast Co. for professional bin cleaning services. Book your cleaning: ${partnerLink}"`,
    email: `Email template:\n\n"Your invoice is attached. As a bonus, here's a special link to Bin Blast Co.'s professional bin cleaning service: ${partnerLink}. They offer flexible plans perfect for maintaining clean bins between our visits."`
  };

  const handleConnectStripe = async () => {
    if (!partnerData) return;
    
    setConnectingStripe(true);
    try {
      const response = await fetch("/api/partners/stripe-connect/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partnerData.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe onboarding
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("No redirect URL received from Stripe");
        }
      } else {
        const error = await response.json();
        if (error.requiresConnectSetup) {
          alert(
            `${error.error}\n\n` +
            `To enable Stripe Connect:\n` +
            `1. Go to Stripe Dashboard → Settings → Connect\n` +
            `2. Enable "Express accounts"\n` +
            `3. Configure your Connect settings\n` +
            `4. Try connecting again\n\n` +
            `Learn more: ${error.stripeConnectDocs}`
          );
        } else {
          alert(error.error || "Failed to create Stripe Connect account");
        }
      }
    } catch (err) {
      console.error("Error connecting Stripe:", err);
      alert("Failed to connect Stripe account");
    } finally {
      setConnectingStripe(false);
    }
  };

  // Calculate next payout date
  const now = new Date();
  const currentDay = now.getDate();
  const nextPayoutDate = currentDay >= 25 
    ? new Date(now.getFullYear(), now.getMonth() + 1, 25)
    : new Date(now.getFullYear(), now.getMonth(), 25);
  const daysUntilPayout = Math.ceil((nextPayoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Group upcoming jobs by date
  const jobsToday = upcomingCleanings.filter(j => {
    const jobDate = new Date(j.date);
    return jobDate.toDateString() === now.toDateString();
  });
  const jobsTomorrow = upcomingCleanings.filter(j => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(j.date).toDateString() === tomorrow.toDateString();
  });
  const jobsThisWeek = upcomingCleanings.filter(j => {
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const jobDate = new Date(j.date);
    return jobDate > now && jobDate <= weekFromNow && !jobsToday.includes(j) && !jobsTomorrow.includes(j);
  });

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

  if (!partnerData) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(to bottom right, #f9fafb, #eff6ff, #f9fafb)" }}>
        {/* Hero Section */}
        <div style={{
          position: "relative",
          background: "linear-gradient(to right, #2563eb, #1d4ed8, #4338ca)",
          color: "#ffffff",
          overflow: "hidden",
          padding: "4rem 0"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="container" style={{ position: "relative", zIndex: 10 }}>
            <div style={{ maxWidth: "900px" }}>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "700", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
                Welcome Back, {partnerData.businessName}
              </h1>
              <p style={{ fontSize: "1.25rem", color: "#bfdbfe", marginBottom: "1.5rem" }}>
                Here's how your Bin Blast Co. partnership is performing.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}>
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Active Partner</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}>
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{(partnerData.revenueSharePartner * 100).toFixed(0)}% Revenue Share</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container" style={{ padding: "2rem 1rem" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Analytics Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              {/* This Month's Earnings */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #dcfce7",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#86efac";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#dcfce7";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#dcfce7", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>This Month</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  ${(stats.thisMonthEarnings / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Earnings this month</div>
              </div>

              {/* Total Customers */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #dbeafe",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#93c5fd";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#dbeafe";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#dbeafe", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customers</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {stats.totalCustomers}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total referred</div>
              </div>

              {/* Active Subscriptions */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #e9d5ff",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#c084fc";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#e9d5ff";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#e9d5ff", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#9333ea" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {stats.activeSubscriptions}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Active subscriptions</div>
              </div>

              {/* Next Payout */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fed7aa",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#fdba74";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#fed7aa";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#fed7aa", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#ea580c" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payout</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {daysUntilPayout} days
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
            </div>

            {/* Commission Breakdown */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                background: "#dbeafe",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #93c5fd"
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Commissions Paid</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e40af", marginBottom: "0.25rem" }}>
                  ${(stats.totalCommissionsPaid / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#475569" }}>Total paid out</div>
              </div>
              <div style={{
                background: "#fef3c7",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fcd34d"
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#92400e", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Held Commissions</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#92400e", marginBottom: "0.25rem" }}>
                  ${(stats.heldCommissions / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#78350f" }}>Awaiting payout</div>
              </div>
              <div style={{
                background: "#fee2e2",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fca5a5"
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#991b1b", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#991b1b", marginBottom: "0.25rem" }}>
                  ${(stats.pendingCommissions / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#7f1d1d" }}>Connect Stripe to receive</div>
              </div>
            </div>

            {/* Booking Link & Partner Signup Link Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              {/* Booking Link Card */}
              <div style={{
                background: "linear-gradient(to bottom right, #eff6ff, #dbeafe)",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #93c5fd"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>Your Booking Link</h2>
                  <div style={{ padding: "0.5rem", background: "#dbeafe", borderRadius: "8px" }}>
                    <svg style={{ width: "20px", height: "20px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={partnerLink}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "0.75rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #93c5fd",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                      color: "#1e40af"
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: copied ? "#16a34a" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!copied) e.currentTarget.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!copied) e.currentTarget.style.background = copied ? "#16a34a" : "#2563eb";
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <button
                    onClick={generateQRCode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #93c5fd",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#1e40af",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                  {qrCodeUrl && (
                    <div style={{ padding: "0.5rem", background: "#ffffff", borderRadius: "8px", border: "2px solid #93c5fd" }}>
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: "64px", height: "64px" }} />
                    </div>
                  )}
                  <div style={{ flex: "1", fontSize: "0.75rem", color: "#475569", minWidth: "150px" }}>
                    Share this link with customers. All bookings are automatically tracked.
                  </div>
                </div>
              </div>

              {/* Partner Signup Link Card - Team Growth */}
              <div style={{
                background: "linear-gradient(to bottom right, #fef3c7, #fde68a)",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fcd34d"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>Team Growth</h2>
                    <p style={{ fontSize: "0.875rem", color: "#78350f" }}>Partner Signup Link</p>
                  </div>
                  <div style={{ padding: "0.5rem", background: "#fde68a", borderRadius: "8px" }}>
                    <svg style={{ width: "20px", height: "20px", color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={partnerSignupLink}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "0.75rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #fcd34d",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                      color: "#92400e"
                    }}
                  />
                  <button
                    onClick={handleCopySignupLink}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: copiedSignupLink ? "#16a34a" : "#d97706",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!copiedSignupLink) e.currentTarget.style.background = "#b45309";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = copiedSignupLink ? "#16a34a" : "#d97706";
                    }}
                  >
                    {copiedSignupLink ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#78350f" }}>
                  Share this link with team members who need partner access. They'll be able to sign up and join your team.
                </p>
              </div>
            </div>

            {/* How to Sell - Playbook Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.5rem" }}>How to Sell Bin Blast Co.</h2>
                  <p style={{ color: "#6b7280" }}>A guided playbook to maximize your earnings</p>
                </div>
                <button 
                  onClick={handleDownloadPDF}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#2563eb",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#ffffff",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }} 
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1d4ed8";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                  }} 
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <div 
                  onClick={() => handleCopyStrategy('invoices', strategyTemplates.invoices)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1rem",
                    background: copiedStrategy === 'invoices' ? "#dcfce7" : "#f9fafb",
                    borderRadius: "12px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    border: copiedStrategy === 'invoices' ? "2px solid #16a34a" : "2px solid transparent",
                    transform: copiedStrategy === 'invoices' ? "scale(1.02)" : "scale(1)"
                  }} 
                  onMouseEnter={(e) => {
                    if (copiedStrategy !== 'invoices') {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                    }
                  }} 
                  onMouseLeave={(e) => {
                    if (copiedStrategy !== 'invoices') {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <div style={{ padding: "0.5rem", background: copiedStrategy === 'invoices' ? "#16a34a" : "#dbeafe", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: copiedStrategy === 'invoices' ? "#ffffff" : "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <h3 style={{ fontWeight: "600", color: "#111827" }}>Put on invoices</h3>
                      {copiedStrategy === 'invoices' && (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>✓ Copied!</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Add your booking link to every invoice and receipt</p>
                  </div>
                </div>
                <div 
                  onClick={() => handleCopyStrategy('text', strategyTemplates.text)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1rem",
                    background: copiedStrategy === 'text' ? "#dcfce7" : "#f9fafb",
                    borderRadius: "12px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    border: copiedStrategy === 'text' ? "2px solid #16a34a" : "2px solid transparent",
                    transform: copiedStrategy === 'text' ? "scale(1.02)" : "scale(1)"
                  }} 
                  onMouseEnter={(e) => {
                    if (copiedStrategy !== 'text') {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                    }
                  }} 
                  onMouseLeave={(e) => {
                    if (copiedStrategy !== 'text') {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <div style={{ padding: "0.5rem", background: copiedStrategy === 'text' ? "#16a34a" : "#dcfce7", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: copiedStrategy === 'text' ? "#ffffff" : "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <h3 style={{ fontWeight: "600", color: "#111827" }}>Text after service</h3>
                      {copiedStrategy === 'text' && (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>✓ Copied!</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Send your link via text message after completing a service</p>
                  </div>
                </div>
                <div 
                  onClick={() => handleCopyStrategy('website', strategyTemplates.website)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1rem",
                    background: copiedStrategy === 'website' ? "#dcfce7" : "#f9fafb",
                    borderRadius: "12px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    border: copiedStrategy === 'website' ? "2px solid #16a34a" : "2px solid transparent",
                    transform: copiedStrategy === 'website' ? "scale(1.02)" : "scale(1)"
                  }} 
                  onMouseEnter={(e) => {
                    if (copiedStrategy !== 'website') {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                    }
                  }} 
                  onMouseLeave={(e) => {
                    if (copiedStrategy !== 'website') {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <div style={{ padding: "0.5rem", background: copiedStrategy === 'website' ? "#16a34a" : "#e9d5ff", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: copiedStrategy === 'website' ? "#ffffff" : "#9333ea" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <h3 style={{ fontWeight: "600", color: "#111827" }}>Add to website</h3>
                      {copiedStrategy === 'website' && (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>✓ Copied!</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Include your booking link on your website or service menu</p>
                  </div>
                </div>
                <div 
                  onClick={() => handleCopyStrategy('email', strategyTemplates.email)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1rem",
                    background: copiedStrategy === 'email' ? "#dcfce7" : "#f9fafb",
                    borderRadius: "12px",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    border: copiedStrategy === 'email' ? "2px solid #16a34a" : "2px solid transparent",
                    transform: copiedStrategy === 'email' ? "scale(1.02)" : "scale(1)"
                  }} 
                  onMouseEnter={(e) => {
                    if (copiedStrategy !== 'email') {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                    }
                  }} 
                  onMouseLeave={(e) => {
                    if (copiedStrategy !== 'email') {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <div style={{ padding: "0.5rem", background: copiedStrategy === 'email' ? "#16a34a" : "#fed7aa", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: copiedStrategy === 'email' ? "#ffffff" : "#ea580c" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <h3 style={{ fontWeight: "600", color: "#111827" }}>Follow-up emails</h3>
                      {copiedStrategy === 'email' && (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>✓ Copied!</span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Include your link in customer follow-up emails</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybookScripts(!showPlaybookScripts)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              >
                {showPlaybookScripts ? "Hide" : "Show"} Top Performing Sales Scripts
                <svg style={{ width: "20px", height: "20px", transform: showPlaybookScripts ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPlaybookScripts && (
                <div style={{
                  marginTop: "1.5rem",
                  padding: "1.5rem",
                  background: "linear-gradient(to bottom right, #eff6ff, #dbeafe)",
                  borderRadius: "12px",
                  border: "2px solid #93c5fd"
                }}>
                  <h3 style={{ fontWeight: "700", fontSize: "1.125rem", color: "#111827", marginBottom: "1rem" }}>Top Performing Sales Scripts</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {salesScripts.map((script, index) => {
                      const scriptWithLink = script.text.replace('[your link]', partnerLink);
                      return (
                        <div key={index} style={{ 
                          padding: "1rem", 
                          background: "#ffffff", 
                          borderRadius: "8px",
                          border: copiedScript === index ? "2px solid #16a34a" : "1px solid #e5e7eb",
                          transition: "all 0.2s ease"
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <h4 style={{ fontWeight: "600", color: "#111827" }}>{script.title}</h4>
                            <button
                              onClick={() => handleCopyScript(index, script.text)}
                              style={{
                                padding: "0.375rem 0.75rem",
                                background: copiedScript === index ? "#16a34a" : "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                transition: "all 0.2s ease",
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                if (copiedScript !== index) {
                                  e.currentTarget.style.background = "#1d4ed8";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedScript !== index) {
                                  e.currentTarget.style.background = "#2563eb";
                                  e.currentTarget.style.transform = "scale(1)";
                                }
                              }}
                            >
                              {copiedScript === index ? (
                                <>
                                  <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p style={{ 
                            fontSize: "0.875rem", 
                            color: "#374151", 
                            fontStyle: "italic",
                            lineHeight: "1.6",
                            wordBreak: "break-word"
                          }}>
                            "{scriptWithLink}"
                          </p>
                          <div style={{ 
                            marginTop: "0.5rem", 
                            padding: "0.5rem", 
                            background: "#f0f9ff", 
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            color: "#0369a1"
                          }}>
                            <strong>Your link:</strong> <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{partnerLink}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Jobs Calendar */}
            {(jobsToday.length > 0 || jobsTomorrow.length > 0 || jobsThisWeek.length > 0) && (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Upcoming Jobs</h2>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem"
                }}>
                  {jobsToday.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#16a34a", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>Today ({jobsToday.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsToday.map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#dcfce7",
                            borderRadius: "8px",
                            border: "1px solid #86efac"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsTomorrow.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#2563eb", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>Tomorrow ({jobsTomorrow.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsTomorrow.map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#dbeafe",
                            borderRadius: "8px",
                            border: "1px solid #93c5fd"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsThisWeek.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#9333ea", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>This Week ({jobsThisWeek.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsThisWeek.slice(0, 5).map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#f3e8ff",
                            borderRadius: "8px",
                            border: "1px solid #c084fc"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stripe Connect Payout Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.5rem" }}>Automatic Payouts</h2>
                  <p style={{ color: "#6b7280" }}>Connect your Stripe account to receive weekly commission payouts automatically</p>
                </div>
                {stripeConnectStatus?.connected && stripeConnectStatus?.status === 'active' ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    background: "#dcfce7",
                    borderRadius: "8px"
                  }}>
                    <svg style={{ width: "20px", height: "20px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontWeight: "600", color: "#166534" }}>Connected</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    style={{
                      padding: "0.5rem 1rem",
                      background: connectingStripe ? "#9ca3af" : "#2563eb",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: connectingStripe ? "not-allowed" : "pointer",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!connectingStripe) e.currentTarget.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!connectingStripe) e.currentTarget.style.background = "#2563eb";
                    }}
                  >
                    {connectingStripe ? "Connecting..." : "Connect Stripe Account"}
                  </button>
                )}
              </div>
              {stripeConnectStatus?.connected && stripeConnectStatus?.status === 'active' ? (
                <div>
                  <div style={{
                    padding: "1rem",
                    background: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #86efac",
                    marginBottom: "1rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "0.875rem", color: "#166534", marginBottom: "0.5rem", fontWeight: "600" }}>
                          ✓ Your Stripe account is connected and ready to receive payouts.
                        </p>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          Commissions are held for 7 days, then automatically transferred to your account weekly.
                        </p>
                      </div>
                      <button
                        onClick={handleViewStripeAccount}
                        disabled={loadingStripeLink}
                        style={{
                          padding: "0.5rem 1rem",
                          background: loadingStripeLink ? "#9ca3af" : "#2563eb",
                          color: "#ffffff",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: loadingStripeLink ? "not-allowed" : "pointer",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {loadingStripeLink ? "Loading..." : (
                          <>
                            <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Stripe Account
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Payout History */}
                  <div style={{
                    marginTop: "1rem"
                  }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", marginBottom: "0.75rem" }}>
                      Payout History
                    </h3>
                    {loadingPayouts ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                        Loading payout history...
                      </div>
                    ) : payouts.length === 0 ? (
                      <div style={{
                        padding: "1.5rem",
                        background: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        textAlign: "center",
                        color: "#6b7280"
                      }}>
                        <p style={{ fontSize: "0.875rem" }}>No payouts yet. Payouts will appear here once processed.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {payouts.slice(0, 5).map((payout) => (
                          <div
                            key={payout.id}
                            style={{
                              padding: "1rem",
                              background: "#ffffff",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => setExpandedPayoutId(expandedPayoutId === payout.id ? null : payout.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#2563eb";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#e5e7eb";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                  <span style={{
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    color: payout.status === 'completed' || payout.status === 'paid' ? "#16a34a" : "#f59e0b"
                                  }}>
                                    ${(payout.amount / 100).toFixed(2)}
                                  </span>
                                  <span style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    background: payout.status === 'completed' || payout.status === 'paid' ? "#dcfce7" : "#fef3c7",
                                    color: payout.status === 'completed' || payout.status === 'paid' ? "#166534" : "#92400e"
                                  }}>
                                    {payout.status === 'completed' || payout.status === 'paid' ? 'Paid' : payout.status === 'pending' ? 'Pending' : 'Held'}
                                  </span>
                                </div>
                                {payout.payoutDate && (
                                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                    {new Date(payout.payoutDate).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </p>
                                )}
                              </div>
                              <svg 
                                style={{ 
                                  width: "20px", 
                                  height: "20px", 
                                  color: "#6b7280",
                                  transform: expandedPayoutId === payout.id ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.2s ease"
                                }} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {expandedPayoutId === payout.id && (
                              <div style={{
                                marginTop: "1rem",
                                paddingTop: "1rem",
                                borderTop: "1px solid #e5e7eb"
                              }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#6b7280" }}>Gross Commission:</span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>${(payout.grossAmount / 100).toFixed(2)}</span>
                                  </div>
                                  {payout.employeeCosts > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                      <span style={{ color: "#6b7280" }}>Employee Payroll Costs:</span>
                                      <span style={{ fontWeight: "600", color: "#dc2626" }}>-${(payout.employeeCosts / 100).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb", marginTop: "0.25rem" }}>
                                    <span style={{ color: "#111827", fontWeight: "600" }}>Net Payout:</span>
                                    <span style={{ fontWeight: "700", color: "#16a34a", fontSize: "1rem" }}>${(payout.amount / 100).toFixed(2)}</span>
                                  </div>
                                  {payout.stripeTransferId && (
                                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
                                      <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                        Transfer ID: <code style={{ background: "#f3f4f6", padding: "0.125rem 0.25rem", borderRadius: "4px" }}>{payout.stripeTransferId}</code>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {payouts.length > 5 && (
                          <button
                            onClick={handleViewStripeAccount}
                            style={{
                              padding: "0.75rem",
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              fontSize: "0.875rem",
                              fontWeight: "600",
                              color: "#2563eb",
                              cursor: "pointer",
                              textAlign: "center"
                            }}
                          >
                            View All Payouts in Stripe →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : stripeConnectStatus?.connected && stripeConnectStatus?.status === 'pending' ? (
                <div style={{
                  padding: "1rem",
                  background: "#fef3c7",
                  borderRadius: "8px",
                  border: "1px solid #fcd34d"
                }}>
                  <p style={{ fontSize: "0.875rem", color: "#92400e" }}>
                    Your Stripe account is being verified. You'll receive payouts once verification is complete.
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb"
                }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                    Connect your Stripe account to enable automatic weekly payouts of your commissions.
                  </p>
                  <ul style={{ fontSize: "0.875rem", color: "#6b7280", paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                    <li>Commissions are held for 7 days</li>
                    <li>Weekly automatic transfers to your bank account</li>
                    <li>Secure payment processing via Stripe</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Team Management Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827" }}>Your Team</h2>
                <button 
                  onClick={() => setShowAddTeamMemberModal(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s ease"
                  }} 
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1d4ed8";
                  }} 
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                  }}
                >
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Team Member
                </button>
              </div>
              {loadingTeamMembers ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  Loading team members...
                </div>
              ) : teamMembers.length === 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Role</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Assigned Area</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Training Status</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Pay Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                          <svg style={{ width: "48px", height: "48px", margin: "0 auto 0.75rem", color: "#d1d5db" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p>No team members yet. Click "Add Team Member" to get started.</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Assigned Area</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Training Status</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Password</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Pay Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <TeamMemberRow key={member.id} member={member} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Partner Payroll Section */}
            {partnerData && userId && (
              <PartnerPayroll partnerId={partnerData.id} userId={userId} />
            )}

            {/* Active Subscribers List */}
            {customers.filter(c => c.activeSubscriptions > 0).length > 0 && (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Active Subscribers</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Plan Type</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Service Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.filter(c => c.activeSubscriptions > 0).map((customer) => {
                        const activeBooking = customer.bookings.find(b => b.status === "active");
                        const emailParts = customer.email.split("@");
                        const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                        const planType = activeBooking?.planName || "N/A";
                        const isMonthly = planType.toLowerCase().includes("monthly");
                        const isBiWeekly = planType.toLowerCase().includes("bi-weekly") || planType.toLowerCase().includes("biweekly");
                        
                        return (
                          <tr key={customer.email} style={{ borderBottom: "1px solid #f3f4f6" }} onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                          }} onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#111827" }}>{customer.name || customer.email.split("@")[0]}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>{maskedEmail}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: isMonthly ? "#dbeafe" : isBiWeekly ? "#e9d5ff" : "#f3f4f6",
                                color: isMonthly ? "#1e40af" : isBiWeekly ? "#6b21a8" : "#374151"
                              }}>
                                {planType}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>
                              {customer.nextServiceDate 
                                ? customer.nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                background: "#dcfce7",
                                color: "#166534",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}>Active</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Bookings Table */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Recent Bookings</h2>
              {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <svg style={{ width: "64px", height: "64px", margin: "0 auto 1rem", color: "#d1d5db" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{ color: "#6b7280", fontSize: "1.125rem", marginBottom: "0.5rem" }}>No bookings yet</p>
                  <p style={{ color: "#9ca3af" }}>Share your partner link to start earning!</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Service Address</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Subscription Type</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Cleaning Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 20).map((booking) => {
                        const bookingDate = booking.createdAt?.toDate?.() || new Date(booking.createdAt?.seconds * 1000 || Date.now());
                        const nextServiceDate = booking.nextServiceDate?.toDate?.() || null;
                        const emailParts = booking.customerEmail.split("@");
                        const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                        const customerDisplay = booking.customerName 
                          ? `${booking.customerName.split(" ")[0]} ${booking.customerName.split(" ")[1]?.[0] || ""}.`
                          : maskedEmail;
                        
                        return (
                          <tr key={booking.id} style={{ borderBottom: "1px solid #f3f4f6" }} onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                          }} onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>{bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#111827" }}>{customerDisplay}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>—</td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.5rem",
                                background: "#f3f4f6",
                                color: "#374151",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}>
                                {booking.planName || booking.planId || "N/A"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>
                              {nextServiceDate ? nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: booking.status === "active" ? "#dcfce7" :
                                  booking.status === "cancelled" ? "#fee2e2" :
                                  booking.status === "refunded" ? "#f3f4f6" :
                                  "#fef3c7",
                                color: booking.status === "active" ? "#166534" :
                                  booking.status === "cancelled" ? "#991b1b" :
                                  booking.status === "refunded" ? "#374151" :
                                  "#92400e"
                              }}>
                                {booking.status === "active" ? "Active" :
                                 booking.status === "cancelled" ? "Cancelled" :
                                 booking.status === "refunded" ? "Refunded" : "Trial"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "#16a34a" }}>
                              ${(booking.partnerShareAmount / 100).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Partner Information - Business Profile */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827" }}>Partner Information</h2>
                <button style={{
                  padding: "0.5rem 1rem",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}>
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem"
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Business Name</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>{partnerData.businessName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Owner Name</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>{partnerData.ownerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Email</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Phone</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Service Area</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#2563eb" }}>{partnerData.serviceArea || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Service Type</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.serviceType}</div>
                </div>
                {partnerData.websiteOrInstagram && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Website/Instagram</div>
                    <a href={partnerData.websiteOrInstagram.startsWith("http") ? partnerData.websiteOrInstagram : `https://${partnerData.websiteOrInstagram}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "1.125rem", color: "#2563eb", textDecoration: "none" }} onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}>
                      {partnerData.websiteOrInstagram}
                    </a>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Insurance Status</div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    background: partnerData.hasInsurance ? "#dcfce7" : "#fee2e2",
                    color: partnerData.hasInsurance ? "#166534" : "#991b1b"
                  }}>
                    {partnerData.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Revenue Share</div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    background: "#dbeafe",
                    color: "#1e40af"
                  }}>
                    {(partnerData.revenueSharePartner * 100).toFixed(0)}% Partner
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Referral Code</div>
                  <div style={{ fontSize: "1.125rem", fontFamily: "monospace", fontWeight: "700", color: "#2563eb" }}>{partnerData.referralCode}</div>
                </div>
                {partnerData.promotionMethod && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Promotion Method</div>
                    <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.promotionMethod}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Team Member Modal */}
      {showAddTeamMemberModal && partnerData && userId && (
        <AddTeamMemberModal
          partnerId={partnerData.id}
          userId={userId}
          onSuccess={() => {
            setShowAddTeamMemberModal(false);
            if (partnerData.id) {
              loadTeamMembers(partnerData.id);
            }
          }}
          onCancel={() => setShowAddTeamMemberModal(false)}
        />
      )}
    </>
  );
}
