import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { parseCleaningDate, isCleaningCompleted, isCleaningCancelled } from "@/lib/cleaning-schedule";

export type OperatorDashboardScope = "overview" | "customers" | "schedule";

function serializeCleaning(docId: string, data: Record<string, unknown>) {
  const cleaningDate = parseCleaningDate(data.scheduledDate);
  const completedAt = data.completedAt
    ? parseCleaningDate(data.completedAt).toISOString()
    : null;

  return {
    id: docId,
    userId: (data.userId as string) || "",
    customerName: (data.userName as string) || "",
    customerEmail: (data.userEmail as string) || "",
    addressLine1: (data.addressLine1 as string) || "",
    addressLine2: (data.addressLine2 as string) || "",
    city: (data.city as string) || "",
    state: (data.state as string) || "",
    zipCode: (data.zipCode as string) || "",
    scheduledDate: cleaningDate.toISOString(),
    scheduledTime: (data.scheduledTime as string) || "TBD",
    planType: (data.planType as string) || "",
    status: (data.status as string) || "scheduled",
    jobStatus: (data.jobStatus as string) || "",
    notes: (data.notes as string) || "",
    internalNotes: (data.internalNotes as string) || "",
    completedAt,
    isCommercial:
      data.planType === "commercial" ||
      (typeof data.planType === "string" && data.planType.includes("commercial")),
  };
}

async function loadPartnerCustomerEmails(db: Awaited<ReturnType<typeof getDbInstance>>) {
  const firestore = await safeImportFirestore();
  const { collection, getDocs } = firestore;
  const partnerCustomerEmails = new Set<string>();

  try {
    const partnerBookingsSnapshot = await getDocs(collection(db, "partnerBookings"));
    partnerBookingsSnapshot.forEach((doc) => {
      const email = doc.data().customerEmail;
      if (email) partnerCustomerEmails.add(String(email).toLowerCase());
    });
  } catch (err) {
    console.warn("[Operator] Could not load partner bookings:", err);
  }

  return partnerCustomerEmails;
}

function buildCustomers(usersSnapshot: { forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => void }, partnerCustomerEmails: Set<string>) {
  const directCustomers: Record<string, unknown>[] = [];
  const commercialCustomers: Record<string, unknown>[] = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    const email = String(data.email || "").toLowerCase();
    if (partnerCustomerEmails.has(email)) return;

    const customer = {
      id: doc.id,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: data.email || "",
      phone: data.phone || "",
      addressLine1: data.addressLine1 || "",
      city: data.city || "",
      state: data.state || "",
      zipCode: data.zipCode || "",
      selectedPlan: data.selectedPlan || "",
      subscriptionStatus: data.subscriptionStatus || "none",
      paymentStatus: data.paymentStatus || "pending",
      loyaltyRanking: data.loyaltyRanking || "Getting Started",
      internalNotes: data.internalNotes || "",
      servicePaused: data.servicePaused || false,
    };

    if (
      data.selectedPlan === "commercial" ||
      (typeof data.selectedPlan === "string" &&
        (data.selectedPlan.includes("commercial") || data.selectedPlan.includes("HOA")))
    ) {
      commercialCustomers.push({
        ...customer,
        businessName: data.businessName || `${data.firstName} ${data.lastName}`,
        contactPerson: `${data.firstName} ${data.lastName}`,
        binsCount: data.binsCount || 1,
        frequency: data.selectedPlan || "monthly",
        specialInstructions: data.specialInstructions || "",
      });
    } else {
      directCustomers.push(customer);
    }
  });

  return { directCustomers, commercialCustomers };
}

function computeCleaningMetrics(cleanings: ReturnType<typeof serializeCleaning>[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  sevenDaysFromNow.setHours(23, 59, 59, 999);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let upcomingCount = 0;
  let completedThisWeek = 0;
  let todayCount = 0;
  let tomorrowCount = 0;

  cleanings.forEach((cleaning) => {
    const cleaningDate = parseCleaningDate(cleaning.scheduledDate);
    const isCancelled = isCleaningCancelled(cleaning);
    const isCompleted = isCleaningCompleted(cleaning);

    if (!isCancelled && !isCompleted) {
      if (cleaningDate >= today && cleaningDate <= sevenDaysFromNow) upcomingCount++;
      if (cleaningDate >= today && cleaningDate < tomorrow) todayCount++;
      if (cleaningDate >= tomorrow && cleaningDate < dayAfter) tomorrowCount++;
    }

    if (isCompleted && cleaning.completedAt) {
      const completedDate = parseCleaningDate(cleaning.completedAt);
      if (completedDate >= weekStart && completedDate < weekEnd) completedThisWeek++;
    }
  });

  return { upcomingCount, completedThisWeek, todayCount, tomorrowCount };
}

async function loadCleanings(db: NonNullable<Awaited<ReturnType<typeof getDbInstance>>>, scope: OperatorDashboardScope) {
  const firestore = await safeImportFirestore();
  const { collection, query, getDocs, orderBy } = firestore;
  const cleaningsSnapshot = await getDocs(
    query(collection(db, "scheduledCleanings"), orderBy("scheduledDate", "asc"))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + (scope === "schedule" ? 120 : 30));

  const cleanings: ReturnType<typeof serializeCleaning>[] = [];
  const seen = new Set<string>();
  cleaningsSnapshot.forEach((doc) => {
    const data = doc.data();
    const cleaning = serializeCleaning(doc.id, data);
    const cleaningDate = parseCleaningDate(cleaning.scheduledDate);

    if (scope === "schedule") {
      cleanings.push(cleaning);
      return;
    }

    const isCancelled = isCleaningCancelled(cleaning);
    const isCompleted = isCleaningCompleted(cleaning);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000);

    const includeUpcoming = !isCancelled && cleaningDate <= horizon;
    const includeRecentCompleted = isCompleted && cleaningDate >= twoWeeksAgo;

    if ((includeUpcoming || includeRecentCompleted) && !seen.has(cleaning.id)) {
      seen.add(cleaning.id);
      cleanings.push(cleaning);
    }
  });

  return cleanings;
}

async function loadPendingQuotesCount(db: NonNullable<Awaited<ReturnType<typeof getDbInstance>>>) {
  const firestore = await safeImportFirestore();
  const { collection, getDocs } = firestore;

  try {
    const quotesSnapshot = await getDocs(collection(db, "customQuotes"));
    return quotesSnapshot.docs.filter((doc) => {
      const status = doc.data().status;
      return status === "pending" || status === "pending_review";
    }).length;
  } catch {
    return 0;
  }
}

export async function getOperatorDashboardData(scope: OperatorDashboardScope) {
  const db = await getDbInstance();
  if (!db) throw new Error("Database not available");

  const firestore = await safeImportFirestore();
  const { collection, getDocs } = firestore;

  const [usersSnapshot, partnerCustomerEmails, pendingQuotes] = await Promise.all([
    getDocs(collection(db, "users")),
    loadPartnerCustomerEmails(db),
    scope === "overview" ? loadPendingQuotesCount(db) : Promise.resolve(0),
  ]);

  const { directCustomers, commercialCustomers } = buildCustomers(usersSnapshot, partnerCustomerEmails);

  const cleanings = await loadCleanings(db, scope);
  const metrics = computeCleaningMetrics(cleanings);

  const openIssues =
    directCustomers.filter((c) => c.internalNotes && String(c.internalNotes).trim().length > 0).length +
    commercialCustomers.filter(
      (c) => c.specialInstructions && String(c.specialInstructions).trim().length > 0
    ).length;

  const stats = {
    totalDirectCustomers: directCustomers.length,
    totalCommercialCustomers: commercialCustomers.length,
    upcomingCleanings: metrics.upcomingCount,
    cleaningsCompletedThisWeek: metrics.completedThisWeek,
    openIssues,
  };

  if (scope === "overview") {
    const commercialEmails = new Set(
      commercialCustomers.map((c) => String(c.email || "").toLowerCase())
    );

    return {
      scope,
      stats,
      newQuotesCount: pendingQuotes,
      breakdown: {
        directActive: directCustomers.filter(
          (c) => c.subscriptionStatus === "active" && !c.servicePaused
        ).length,
        directPaused: directCustomers.filter((c) => c.servicePaused).length,
        directInactive: directCustomers.filter(
          (c) => c.subscriptionStatus !== "active" && !c.servicePaused
        ).length,
        commercialActive: commercialCustomers.filter(
          (c) => c.subscriptionStatus === "active" && !c.servicePaused
        ).length,
        totalBins: commercialCustomers.reduce(
          (sum, c) => sum + (Number(c.binsCount) || 1),
          0
        ),
        commercialUpcomingServices: cleanings.filter((c) => {
          const cleaningDate = parseCleaningDate(c.scheduledDate);
          const today = new Date();
          const next7Days = new Date();
          next7Days.setDate(next7Days.getDate() + 7);
          return (
            cleaningDate >= today &&
            cleaningDate <= next7Days &&
            !isCleaningCancelled(c) &&
            !isCleaningCompleted(c) &&
            commercialEmails.has(String(c.customerEmail || "").toLowerCase())
          );
        }).length,
      },
      cleaningCounts: {
        today: metrics.todayCount,
        tomorrow: metrics.tomorrowCount,
        thisWeek: metrics.upcomingCount,
      },
    };
  }

  if (scope === "customers") {
    return {
      scope,
      stats,
      directCustomers,
      commercialCustomers,
      cleanings,
    };
  }

  return {
    scope,
    stats,
    cleanings,
  };
}
