// lib/user-portal.ts
// Resolves which portal a user belongs to for login enforcement.

export type UserPortalType = "customer" | "partner" | "employee" | "operator";

export interface PortalInfo {
  id: UserPortalType;
  name: string;
  path: string;
  subtitle: string;
  description: string;
}

export const PORTAL_INFO: Record<UserPortalType, PortalInfo> = {
  customer: {
    id: "customer",
    name: "Customer Portal",
    path: "/customer",
    subtitle: "For customers",
    description: "For customers",
  },
  partner: {
    id: "partner",
    name: "Partner Portal",
    path: "/partners",
    subtitle: "For partners",
    description: "For partners",
  },
  employee: {
    id: "employee",
    name: "Employee Portal",
    path: "/employee",
    subtitle: "For team members",
    description: "For team members",
  },
  operator: {
    id: "operator",
    name: "Blast Command",
    path: "/operator",
    subtitle: "For operations",
    description: "For operations",
  },
};

const ADMIN_EMAIL = "binblastcompany@gmail.com";

export async function resolveUserPortal(
  userId: string,
  email: string | null
): Promise<UserPortalType> {
  const { getDbInstance } = await import("@/lib/firebase");
  const db = await getDbInstance();

  if (!db) {
    return "customer";
  }

  const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
  const firestore = await safeImportFirestore();
  const { doc, getDoc } = firestore;
  const userDoc = await getDoc(doc(db, "users", userId));

  if (!userDoc.exists()) {
    return "customer";
  }

  const userData = userDoc.data();
  const userRole = userData.role;
  const userEmail = email || "";

  const isOperator =
    userRole === "operator" || userRole === "admin" || userEmail === ADMIN_EMAIL;

  if (userRole === "employee") {
    return "employee";
  }

  if (isOperator) {
    return "operator";
  }

  const { getPartner, getDashboardUrl } = await import("@/lib/partner-auth");
  const dashboardUrl = await getDashboardUrl(userId);
  const partner = await getPartner(userId, userEmail);
  const isPartner = dashboardUrl !== "/dashboard" || partner !== null;

  if (isPartner) {
    return "partner";
  }

  return "customer";
}

export function expectedRoleToPortal(
  expectedRole: "employee" | "partner" | "customer" | "operator" | "admin"
): UserPortalType {
  if (expectedRole === "operator" || expectedRole === "admin") {
    return "operator";
  }
  return expectedRole;
}

export function portalMatchesExpected(
  userPortal: UserPortalType,
  expectedRole: "employee" | "partner" | "customer" | "operator" | "admin"
): boolean {
  return userPortal === expectedRoleToPortal(expectedRole);
}
