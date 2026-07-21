export interface PartnerBookingExportRow {
  id: string;
  customerName: string | null;
  customerEmail: string;
  planName: string;
  bookingAmount: number;
  partnerShareAmount: number;
  status: string;
  commissionStatus?: string;
  createdAt: unknown;
  nextServiceDate?: unknown;
}

export interface PartnerCustomerExportRow {
  email: string;
  name: string | null;
  activeSubscriptions: number;
  nextServiceDate: Date | null;
  bookings: PartnerBookingExportRow[];
}

export interface PartnerPayoutExportRow {
  id: string;
  amount: number;
  grossAmount: number;
  employeeCosts: number;
  status: string;
  payoutDate: string | null;
  createdAt: string | null;
}

export interface PartnerStatSheet {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: string[][];
  summary?: Array<{ label: string; value: string }>;
  summaryRows?: string[][];
  emptyMessage?: string;
}

export type PartnerStatReportType = "earnings" | "customers" | "active" | "payout";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "partner";
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatMoneyRaw(cents: number) {
  return (cents / 100).toFixed(2);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date) return maybeDate;
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("en-US");
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getNextPayoutDate(reference = new Date()) {
  const currentDay = reference.getDate();
  return currentDay >= 25
    ? new Date(reference.getFullYear(), reference.getMonth() + 1, 25)
    : new Date(reference.getFullYear(), reference.getMonth(), 25);
}

export function downloadPartnerStatSheet(sheet: PartnerStatSheet) {
  const rows: string[][] = [sheet.headers, ...sheet.rows];
  if (sheet.summaryRows?.length) {
    rows.push([], ...sheet.summaryRows);
  }
  downloadCsv(sheet.filename, rows);
}

export function buildPartnerEarningsSheet(
  businessName: string,
  bookings: PartnerBookingExportRow[]
): PartnerStatSheet {
  const monthStart = getCurrentMonthStart();
  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const headers = [
    "Date",
    "Customer Name",
    "Customer Email",
    "Plan",
    "Booking Amount",
    "Partner Share",
    "Commission Status",
    "Booking Status",
  ];

  let totalShareCents = 0;
  const rows: string[][] = [];

  bookings
    .filter((booking) => {
      const createdAt = toDate(booking.createdAt);
      return createdAt && createdAt >= monthStart && booking.status !== "refunded";
    })
    .sort((a, b) => {
      const aTime = toDate(a.createdAt)?.getTime() || 0;
      const bTime = toDate(b.createdAt)?.getTime() || 0;
      return bTime - aTime;
    })
    .forEach((booking) => {
      totalShareCents += booking.partnerShareAmount || 0;
      rows.push([
        formatDate(toDate(booking.createdAt)),
        booking.customerName || "—",
        booking.customerEmail,
        booking.planName || "—",
        formatMoney(booking.bookingAmount || 0),
        formatMoney(booking.partnerShareAmount || 0),
        booking.commissionStatus || "pending",
        booking.status,
      ]);
    });

  return {
    title: "Earnings This Month",
    subtitle: monthLabel,
    filename: `${slugify(businessName)}-earnings-${monthLabel.replace(/\s+/g, "-")}.csv`,
    headers,
    rows,
    summary: [{ label: "Total partner share this month", value: formatMoney(totalShareCents) }],
    summaryRows: [["Total Partner Share This Month", formatMoneyRaw(totalShareCents)]],
    emptyMessage: "No earnings recorded this month yet.",
  };
}

export function buildPartnerCustomersSheet(
  businessName: string,
  customers: PartnerCustomerExportRow[]
): PartnerStatSheet {
  const headers = [
    "Customer Name",
    "Email",
    "Active Subscriptions",
    "Next Service Date",
    "Total Bookings",
  ];

  const rows = customers.map((customer) => [
    customer.name || "—",
    customer.email,
    String(customer.activeSubscriptions),
    formatDate(customer.nextServiceDate),
    String(customer.bookings.length),
  ]);

  return {
    title: "Referred Customers",
    subtitle: `${customers.length} total referred`,
    filename: `${slugify(businessName)}-referred-customers.csv`,
    headers,
    rows,
    summary: [{ label: "Total referred customers", value: String(customers.length) }],
    summaryRows: [["Total Referred Customers", String(customers.length)]],
    emptyMessage: "No referred customers yet.",
  };
}

export function buildPartnerActiveSubscriptionsSheet(
  businessName: string,
  bookings: PartnerBookingExportRow[]
): PartnerStatSheet {
  const headers = [
    "Customer Name",
    "Customer Email",
    "Plan",
    "Partner Share",
    "Next Service Date",
    "Commission Status",
    "Created Date",
  ];

  const activeBookings = bookings
    .filter((booking) => booking.status === "active")
    .sort((a, b) => {
      const aName = (a.customerName || a.customerEmail).toLowerCase();
      const bName = (b.customerName || b.customerEmail).toLowerCase();
      return aName.localeCompare(bName);
    });

  const rows = activeBookings.map((booking) => [
    booking.customerName || "—",
    booking.customerEmail,
    booking.planName || "—",
    formatMoney(booking.partnerShareAmount || 0),
    formatDate(toDate(booking.nextServiceDate)),
    booking.commissionStatus || "pending",
    formatDate(toDate(booking.createdAt)),
  ]);

  return {
    title: "Active Subscriptions",
    subtitle: `${activeBookings.length} active`,
    filename: `${slugify(businessName)}-active-subscriptions.csv`,
    headers,
    rows,
    summary: [{ label: "Total active subscriptions", value: String(activeBookings.length) }],
    summaryRows: [["Total Active Subscriptions", String(activeBookings.length)]],
    emptyMessage: "No active subscriptions yet.",
  };
}

export function buildPartnerPayoutSheet(options: {
  businessName: string;
  pendingCommissionsCents: number;
  heldCommissionsCents: number;
  paidCommissionsCents: number;
  payouts: PartnerPayoutExportRow[];
  nextPayoutDate?: Date;
}): PartnerStatSheet {
  const {
    businessName,
    pendingCommissionsCents,
    heldCommissionsCents,
    paidCommissionsCents,
    payouts,
    nextPayoutDate = getNextPayoutDate(),
  } = options;

  const now = new Date();
  const daysUntilPayout = Math.max(
    0,
    Math.ceil((nextPayoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const headers = [
    "Payout Date",
    "Amount",
    "Gross Amount",
    "Employee Costs",
    "Status",
    "Created Date",
  ];

  const rows =
    payouts.length === 0
      ? []
      : payouts.map((payout) => [
          payout.payoutDate ? formatDate(new Date(payout.payoutDate)) : "—",
          formatMoney(payout.amount || 0),
          formatMoney(payout.grossAmount || 0),
          formatMoney(payout.employeeCosts || 0),
          payout.status,
          payout.createdAt ? formatDate(new Date(payout.createdAt)) : "—",
        ]);

  return {
    title: "Payout Summary",
    subtitle: `Next payout ${formatDate(nextPayoutDate)} · ${daysUntilPayout} days away`,
    filename: `${slugify(businessName)}-payout-summary.csv`,
    headers,
    rows,
    summary: [
      { label: "Next payout date", value: formatDate(nextPayoutDate) },
      { label: "Days until payout", value: String(daysUntilPayout) },
      { label: "Pending commissions", value: formatMoney(pendingCommissionsCents) },
      { label: "Held commissions", value: formatMoney(heldCommissionsCents) },
      { label: "Commissions paid to date", value: formatMoney(paidCommissionsCents) },
    ],
    summaryRows: [
      ["Summary"],
      ["Next Payout Date", formatDate(nextPayoutDate)],
      ["Days Until Payout", String(daysUntilPayout)],
      ["Pending Commissions", formatMoneyRaw(pendingCommissionsCents)],
      ["Held Commissions", formatMoneyRaw(heldCommissionsCents)],
      ["Commissions Paid To Date", formatMoneyRaw(paidCommissionsCents)],
      [],
      ["Payout History"],
      headers,
      ...(rows.length > 0 ? rows : [["No payout records yet", "", "", "", "", ""]]),
    ],
    emptyMessage: "No payout history yet.",
  };
}

export function buildPartnerStatSheet(
  type: PartnerStatReportType,
  options: {
    businessName: string;
    bookings: PartnerBookingExportRow[];
    customers: PartnerCustomerExportRow[];
    pendingCommissionsCents: number;
    heldCommissionsCents: number;
    paidCommissionsCents: number;
    payouts: PartnerPayoutExportRow[];
    nextPayoutDate?: Date;
  }
): PartnerStatSheet {
  switch (type) {
    case "earnings":
      return buildPartnerEarningsSheet(options.businessName, options.bookings);
    case "customers":
      return buildPartnerCustomersSheet(options.businessName, options.customers);
    case "active":
      return buildPartnerActiveSubscriptionsSheet(options.businessName, options.bookings);
    case "payout":
      return buildPartnerPayoutSheet({
        businessName: options.businessName,
        pendingCommissionsCents: options.pendingCommissionsCents,
        heldCommissionsCents: options.heldCommissionsCents,
        paidCommissionsCents: options.paidCommissionsCents,
        payouts: options.payouts,
        nextPayoutDate: options.nextPayoutDate,
      });
  }
}

// Backward-compatible download helpers
export function downloadPartnerEarningsCsv(
  businessName: string,
  bookings: PartnerBookingExportRow[]
) {
  downloadPartnerStatSheet(buildPartnerEarningsSheet(businessName, bookings));
}

export function downloadPartnerCustomersCsv(
  businessName: string,
  customers: PartnerCustomerExportRow[]
) {
  downloadPartnerStatSheet(buildPartnerCustomersSheet(businessName, customers));
}

export function downloadPartnerActiveSubscriptionsCsv(
  businessName: string,
  bookings: PartnerBookingExportRow[]
) {
  downloadPartnerStatSheet(buildPartnerActiveSubscriptionsSheet(businessName, bookings));
}

export function downloadPartnerPayoutCsv(options: {
  businessName: string;
  pendingCommissionsCents: number;
  heldCommissionsCents: number;
  paidCommissionsCents: number;
  payouts: PartnerPayoutExportRow[];
  nextPayoutDate?: Date;
}) {
  downloadPartnerStatSheet(buildPartnerPayoutSheet(options));
}
