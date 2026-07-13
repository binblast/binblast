import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { getPlatformPlanConfigs } from "@/lib/platform-pricing";
import { getServiceAreasPayload } from "@/lib/service-areas";
import { buildCompletionUpdateData, formatCleaningDateForStorage } from "@/lib/cleaning-schedule";
import { normalizePhoneNumber, phoneSearchVariants } from "@/lib/quo-auth";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export type QuoActionName =
  | "lookup_customer"
  | "get_upcoming_cleanings"
  | "reschedule_cleaning"
  | "cancel_cleaning"
  | "send_password_reset"
  | "create_account"
  | "schedule_cleaning"
  | "get_pricing"
  | "get_service_areas"
  | "pause_service"
  | "get_account_summary";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildTempPassword() {
  return `Temp${Math.random().toString(36).slice(-8)}!`;
}

async function findCustomerByPhoneOrEmail(input: {
  phone?: string;
  email?: string;
}) {
  const db = await getAdminFirestore();
  const snapshot = await db.collection("users").get();
  const email = input.email?.trim().toLowerCase();
  const phoneVariants = input.phone ? new Set(phoneSearchVariants(input.phone)) : new Set<string>();

  for (const doc of snapshot.docs as FirestoreDocument[]) {
    const data = doc.data();
    const userEmail = asString(data.email).toLowerCase();
    const userPhone = asString(data.phone);

    if (email && userEmail === email) {
      return { id: doc.id, data };
    }

    if (phoneVariants.size > 0) {
      const variants = phoneSearchVariants(userPhone);
      if (variants.some((variant) => phoneVariants.has(variant))) {
        return { id: doc.id, data };
      }
    }
  }

  return null;
}

function serializeCustomer(id: string, data: Record<string, unknown>) {
  return {
    userId: id,
    firstName: asString(data.firstName),
    lastName: asString(data.lastName),
    email: asString(data.email),
    phone: asString(data.phone),
    selectedPlan: asString(data.selectedPlan),
    subscriptionStatus: asString(data.subscriptionStatus) || "none",
    servicePaused: data.servicePaused === true,
    addressLine1: asString(data.addressLine1),
    city: asString(data.city),
    state: asString(data.state),
    zipCode: asString(data.zipCode),
    trashDay: asString(data.trashDay),
  };
}

async function getUpcomingCleaningsForUser(userId: string) {
  const db = await getAdminFirestore();
  const snapshot = await db
    .collection("scheduledCleanings")
    .where("userId", "==", userId)
    .get();

  const today = formatCleaningDateForStorage(new Date());

  return (snapshot.docs as FirestoreDocument[])
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scheduledDate: asString(data.scheduledDate),
        scheduledTime: asString(data.scheduledTime) || "TBD",
        status: asString(data.status) || "pending",
        addressLine1: asString(data.addressLine1),
        city: asString(data.city),
        notes: asString(data.notes),
      };
    })
    .filter((cleaning) => cleaning.scheduledDate >= today)
    .filter((cleaning) => cleaning.status !== "completed" && cleaning.status !== "cancelled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

async function logQuoAction(action: string, payload: Record<string, unknown>) {
  try {
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    await db.collection("quoCallActions").add({
      action,
      payload,
      source: "quo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[Quo Action Log] Failed:", error);
  }
}

export async function executeQuoAction(
  action: QuoActionName,
  payload: Record<string, unknown>
) {
  switch (action) {
    case "lookup_customer":
      return lookupCustomer(payload);
    case "get_account_summary":
      return getAccountSummary(payload);
    case "get_upcoming_cleanings":
      return getUpcomingCleanings(payload);
    case "reschedule_cleaning":
      return rescheduleCleaning(payload);
    case "cancel_cleaning":
      return cancelCleaning(payload);
    case "send_password_reset":
      return sendPasswordReset(payload);
    case "create_account":
      return createAccount(payload);
    case "schedule_cleaning":
      return scheduleCleaning(payload);
    case "get_pricing":
      return getPricing();
    case "get_service_areas":
      return getServiceAreas();
    case "pause_service":
      return pauseService(payload);
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

async function lookupCustomer(payload: Record<string, unknown>) {
  const phone = asString(payload.phone);
  const email = asString(payload.email);

  if (!phone && !email) {
    throw new Error("phone or email is required");
  }

  const customer = await findCustomerByPhoneOrEmail({ phone, email });
  if (!customer) {
    return {
      found: false,
      message: "No customer account found for that phone or email.",
    };
  }

  const upcomingCleanings = await getUpcomingCleaningsForUser(customer.id);

  await logQuoAction("lookup_customer", { phone, email, userId: customer.id });

  return {
    found: true,
    customer: serializeCustomer(customer.id, customer.data),
    upcomingCleanings,
    message: `Found account for ${serializeCustomer(customer.id, customer.data).firstName} ${serializeCustomer(customer.id, customer.data).lastName}.`,
  };
}

async function getAccountSummary(payload: Record<string, unknown>) {
  const result = await lookupCustomer(payload);
  if (!result.found) return result;

  const customer = result.customer as ReturnType<typeof serializeCustomer>;
  return {
    ...result,
    summary: {
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      plan: customer.selectedPlan || "none",
      subscriptionStatus: customer.subscriptionStatus,
      servicePaused: customer.servicePaused,
      nextCleaning: (result.upcomingCleanings as Array<{ scheduledDate: string; scheduledTime: string }>)[0] || null,
    },
  };
}

async function getUpcomingCleanings(payload: Record<string, unknown>) {
  const lookup = await lookupCustomer(payload);
  if (!lookup.found) {
    throw new Error("Customer not found");
  }

  return {
    customer: lookup.customer,
    upcomingCleanings: lookup.upcomingCleanings,
  };
}

async function rescheduleCleaning(payload: Record<string, unknown>) {
  const cleaningId = asString(payload.cleaningId);
  const scheduledDate = asString(payload.scheduledDate);
  const scheduledTime = asString(payload.scheduledTime);
  const notes = asString(payload.notes);

  if (!cleaningId || !scheduledDate) {
    throw new Error("cleaningId and scheduledDate are required");
  }

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const docRef = db.collection("scheduledCleanings").doc(cleaningId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Cleaning not found");
  }

  const updates: Record<string, unknown> = {
    scheduledDate,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    notes: notes || asString(snapshot.data()?.notes),
  };

  if (scheduledTime) updates.scheduledTime = scheduledTime;

  await docRef.update(updates);
  await logQuoAction("reschedule_cleaning", { cleaningId, scheduledDate, scheduledTime });

  return {
    success: true,
    cleaningId,
    scheduledDate,
    scheduledTime: scheduledTime || asString(snapshot.data()?.scheduledTime),
    message: `Cleaning rescheduled to ${scheduledDate}.`,
  };
}

async function cancelCleaning(payload: Record<string, unknown>) {
  const cleaningId = asString(payload.cleaningId);
  const reason = asString(payload.reason);

  if (!cleaningId) {
    throw new Error("cleaningId is required");
  }

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const docRef = db.collection("scheduledCleanings").doc(cleaningId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Cleaning not found");
  }

  await docRef.update({
    status: "cancelled",
    ...buildCompletionUpdateData("cancelled"),
    internalNotes: reason
      ? `Cancelled via QUO call center: ${reason}`
      : "Cancelled via QUO call center",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logQuoAction("cancel_cleaning", { cleaningId, reason });

  return {
    success: true,
    cleaningId,
    message: "Cleaning cancelled successfully.",
  };
}

async function sendPasswordReset(payload: Record<string, unknown>) {
  const email = asString(payload.email).toLowerCase();
  if (!email) {
    throw new Error("email is required");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://binblast.com";
  const response = await fetch(`${origin}/api/auth/password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Failed to send password reset");
  }

  await logQuoAction("send_password_reset", { email });

  return {
    success: true,
    email,
    message: `Password reset email sent to ${email}.`,
  };
}

async function createAccount(payload: Record<string, unknown>) {
  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const email = asString(payload.email).toLowerCase();
  const phone = asString(payload.phone);
  const addressLine1 = asString(payload.addressLine1);
  const city = asString(payload.city);
  const state = asString(payload.state);
  const zipCode = asString(payload.zipCode);

  if (!firstName || !lastName || !email) {
    throw new Error("firstName, lastName, and email are required");
  }

  const existing = await findCustomerByPhoneOrEmail({ phone, email });
  if (existing) {
    return {
      success: true,
      existingAccount: true,
      customer: serializeCustomer(existing.id, existing.data),
      message: "An account already exists for this customer.",
    };
  }

  const adminApp = await getAdminApp();
  const adminAuth = adminApp.auth();
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const tempPassword = buildTempPassword();

  const userRecord = await adminAuth.createUser({
    email,
    password: tempPassword,
    displayName: `${firstName} ${lastName}`,
    phoneNumber: phone ? normalizePhoneNumber(phone) : undefined,
    emailVerified: false,
  });

  await db.collection("users").doc(userRecord.uid).set({
    firstName,
    lastName,
    email,
    phone: phone || null,
    role: "customer",
    addressLine1: addressLine1 || null,
    city: city || null,
    state: state || null,
    zipCode: zipCode || null,
    subscriptionStatus: "none",
    paymentStatus: "pending",
    createdVia: "quo-call-center",
    tempPassword,
    hasChangedPassword: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logQuoAction("create_account", { email, userId: userRecord.uid });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://binblast.com";

  return {
    success: true,
    existingAccount: false,
    customer: {
      userId: userRecord.uid,
      firstName,
      lastName,
      email,
      phone,
    },
    loginUrl: `${appUrl}/login`,
    tempPassword,
    message: `Account created for ${firstName} ${lastName}. Temporary password issued.`,
  };
}

async function scheduleCleaning(payload: Record<string, unknown>) {
  const phone = asString(payload.phone);
  const email = asString(payload.email);
  const scheduledDate = asString(payload.scheduledDate);
  const scheduledTime = asString(payload.scheduledTime) || "9:00 AM - 12:00 PM";
  const notes = asString(payload.notes);

  if (!scheduledDate) {
    throw new Error("scheduledDate is required");
  }

  let customer = await findCustomerByPhoneOrEmail({ phone, email });
  if (!customer && payload.createIfMissing === true) {
    const created = await createAccount(payload);
    if (!created.success || created.existingAccount) {
      customer = await findCustomerByPhoneOrEmail({ phone, email });
    } else {
      customer = await findCustomerByPhoneOrEmail({ phone, email });
    }
  }

  if (!customer) {
    throw new Error("Customer not found. Provide phone or email, or set createIfMissing=true.");
  }

  const data = customer.data;
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");

  const cleaningDoc = {
    userId: customer.id,
    userEmail: asString(data.email),
    userName: `${asString(data.firstName)} ${asString(data.lastName)}`.trim(),
    addressLine1: asString(payload.addressLine1) || asString(data.addressLine1),
    addressLine2: asString(payload.addressLine2) || null,
    city: asString(payload.city) || asString(data.city),
    state: asString(payload.state) || asString(data.state),
    zipCode: asString(payload.zipCode) || asString(data.zipCode),
    trashDay: asString(payload.trashDay) || asString(data.trashDay),
    scheduledDate,
    scheduledTime,
    planType: asString(data.selectedPlan) || "one-time",
    status: "upcoming",
    jobStatus: "pending",
    notes: notes || null,
    source: "quo-call-center",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const created = await db.collection("scheduledCleanings").add(cleaningDoc);
  await logQuoAction("schedule_cleaning", { userId: customer.id, cleaningId: created.id, scheduledDate });

  return {
    success: true,
    cleaningId: created.id,
    customer: serializeCustomer(customer.id, data),
    scheduledDate,
    scheduledTime,
    message: `Cleaning scheduled for ${scheduledDate}.`,
  };
}

async function getPricing() {
  const plans = await getPlatformPlanConfigs();
  return {
    plans: Object.values(plans).map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      priceSuffix: plan.priceSuffix,
    })),
    serviceAreas: getServiceAreasPayload(),
    message: "Current Bin Blast platform pricing and service areas.",
  };
}

async function getServiceAreas() {
  const payload = getServiceAreasPayload();
  await logQuoAction("get_service_areas", {});
  return {
    ...payload,
    message: payload.summary,
  };
}

async function pauseService(payload: Record<string, unknown>) {
  const phone = asString(payload.phone);
  const email = asString(payload.email);
  const pause = payload.pause !== false;

  const customer = await findCustomerByPhoneOrEmail({ phone, email });
  if (!customer) {
    throw new Error("Customer not found");
  }

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");

  await db.collection("users").doc(customer.id).update({
    servicePaused: pause,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logQuoAction("pause_service", { userId: customer.id, pause });

  return {
    success: true,
    userId: customer.id,
    servicePaused: pause,
    message: pause ? "Customer service has been paused." : "Customer service has been resumed.",
  };
}

export const QUO_ACTION_DEFINITIONS = [
  {
    action: "lookup_customer",
    description: "Find a customer by phone or email and return account + upcoming cleanings.",
    required: ["phone or email"],
  },
  {
    action: "get_account_summary",
    description: "Return a concise account summary for the caller.",
    required: ["phone or email"],
  },
  {
    action: "get_upcoming_cleanings",
    description: "List upcoming scheduled cleanings for a customer.",
    required: ["phone or email"],
  },
  {
    action: "reschedule_cleaning",
    description: "Reschedule an existing cleaning by cleaningId and new date/time.",
    required: ["cleaningId", "scheduledDate"],
  },
  {
    action: "cancel_cleaning",
    description: "Cancel a scheduled cleaning.",
    required: ["cleaningId"],
  },
  {
    action: "send_password_reset",
    description: "Send a password reset email to a customer.",
    required: ["email"],
  },
  {
    action: "create_account",
    description: "Create a new customer login for the platform.",
    required: ["firstName", "lastName", "email"],
  },
  {
    action: "schedule_cleaning",
    description: "Book a new cleaning for an existing or newly created customer.",
    required: ["scheduledDate", "phone or email"],
  },
  {
    action: "get_pricing",
    description: "Return current platform subscription pricing and service areas.",
    required: [],
  },
  {
    action: "get_service_areas",
    description: "Return the cities Bin Blast Co. currently services on the website.",
    required: [],
  },
  {
    action: "pause_service",
    description: "Pause or resume a customer's service.",
    required: ["phone or email"],
  },
] as const;
