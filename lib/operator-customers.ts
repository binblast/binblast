import { parseCleaningDate } from "@/lib/cleaning-schedule";

export const OPERATOR_PLAN_NAMES: Record<string, string> = {
  "one-time": "Monthly Clean",
  "twice-month": "Bi-Weekly Clean (2x/Month)",
  "bi-monthly": "Bi-Monthly Plan – Yearly Package",
  "quarterly": "Quarterly Plan – Yearly Package",
  "commercial": "Commercial & HOA Plans",
};

export type CustomerSubTab = "quotes" | "residential" | "commercial";

export interface OperatorCustomerRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  selectedPlan?: string;
  subscriptionStatus?: string;
  servicePaused?: boolean;
  loyaltyRanking?: string;
  internalNotes?: string;
  businessName?: string;
  contactPerson?: string;
  binsCount?: number;
  frequency?: string;
  specialInstructions?: string;
}

export interface OperatorCleaningRecord {
  id?: string;
  customerEmail?: string;
  status?: string;
  jobStatus?: string;
  scheduledDate?: unknown;
  scheduledTime?: string;
}

export function getCustomerDisplayName(customer: OperatorCustomerRecord): string {
  const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
  return name || customer.businessName || customer.email || "Customer";
}

export function getCustomerStatus(customer: OperatorCustomerRecord): {
  label: string;
  background: string;
  color: string;
} {
  if (customer.servicePaused) {
    return { label: "Paused", background: "#fef3c7", color: "#92400e" };
  }
  if (customer.subscriptionStatus === "active") {
    return { label: "Active", background: "#d1fae5", color: "#065f46" };
  }
  return { label: "Inactive", background: "#fee2e2", color: "#991b1b" };
}

export function isActiveCustomer(customer: OperatorCustomerRecord): boolean {
  return customer.subscriptionStatus === "active" && !customer.servicePaused;
}

export function isPausedCustomer(customer: OperatorCustomerRecord): boolean {
  return !!customer.servicePaused;
}

export function isInactiveCustomer(customer: OperatorCustomerRecord): boolean {
  return !isActiveCustomer(customer) && !isPausedCustomer(customer);
}

export function getNextCleaningForCustomer(
  customer: OperatorCustomerRecord,
  cleanings: OperatorCleaningRecord[]
) {
  const customerEmailLower = (customer.email || "").toLowerCase();
  return cleanings
    .filter((cleaning) => {
      const cleaningEmailLower = (cleaning.customerEmail || "").toLowerCase();
      return (
        cleaningEmailLower === customerEmailLower &&
        cleaning.status !== "cancelled" &&
        cleaning.status !== "completed" &&
        cleaning.jobStatus !== "completed"
      );
    })
    .sort(
      (a, b) =>
        parseCleaningDate(a.scheduledDate).getTime() -
        parseCleaningDate(b.scheduledDate).getTime()
    )[0];
}

export function filterResidentialCustomers(
  customers: OperatorCustomerRecord[],
  cleanings: OperatorCleaningRecord[],
  options: {
    search?: string;
    plan?: string;
    status?: string;
  }
) {
  let filtered = [...customers];

  if (options.search?.trim()) {
    const search = options.search.trim().toLowerCase();
    filtered = filtered.filter(
      (customer) =>
        getCustomerDisplayName(customer).toLowerCase().includes(search) ||
        (customer.email || "").toLowerCase().includes(search) ||
        (customer.addressLine1 || "").toLowerCase().includes(search) ||
        (customer.city || "").toLowerCase().includes(search)
    );
  }

  if (options.plan) {
    filtered = filtered.filter((customer) => customer.selectedPlan === options.plan);
  }

  if (options.status === "active") {
    filtered = filtered.filter(isActiveCustomer);
  } else if (options.status === "paused") {
    filtered = filtered.filter(isPausedCustomer);
  } else if (options.status === "canceled") {
    filtered = filtered.filter(
      (customer) =>
        customer.subscriptionStatus === "cancelled" ||
        customer.subscriptionStatus === "canceled"
    );
  }

  return filtered.sort((a, b) => {
    const nextA = getNextCleaningForCustomer(a, cleanings);
    const nextB = getNextCleaningForCustomer(b, cleanings);
    if (!nextA && !nextB) return getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b));
    if (!nextA) return 1;
    if (!nextB) return -1;
    return (
      parseCleaningDate(nextA.scheduledDate).getTime() -
      parseCleaningDate(nextB.scheduledDate).getTime()
    );
  });
}
