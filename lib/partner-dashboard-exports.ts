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
  if (!value) return "";
  return value.toLocaleDateString("en-US");
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextPayoutDate(reference = new Date()) {
  const currentDay = reference.getDate();
  return currentDay >= 25
    ? new Date(reference.getFullYear(), reference.getMonth() + 1, 25)
    : new Date(reference.getFullYear(), reference.getMonth(), 25);
}

export function downloadPartnerEarningsCsv(
  businessName: string,
  bookings: PartnerBookingExportRow[]
) {
  const monthStart = getCurrentMonthStart();
  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const rows: string[][] = [
    [
      "Date",
      "Customer Name",
      "Customer Email",
      "Plan",
      "Booking Amount",
      "Partner Share",
      "Commission Status",
      "Booking Status",
    ],
  ];

  let totalShareCents = 0;

  bookings
    .filter((booking) => {
      const createdAt = toDate(booking.createdAt);
      return (
        createdAt &&
        createdAt >= monthStart &&
        booking.status !== "refunded"
      );
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
        booking.customerName || "",
        booking.customerEmail,
        booking.planName || "",
        formatMoney(booking.bookingAmount || 0),
        formatMoney(booking.partnerShareAmount || 0),
        booking.commissionStatus || "pending",
        booking.status,
      ]);
    });

  rows.push([]);
  rows.push(["Total Partner Share This Month", formatMoney(totalShareCents)]);

  downloadCsv(`${slugify(businessName)}-earnings-${monthLabel.replace(/\s+/g, "-")}.csv`, rows);
}

export function downloadPartnerCustomersCsv(
  businessName: string,
  customers: PartnerCustomerExportRow[]
) {
  const rows: string[][] = [
    [
      "Customer Name",
      "Email",
      "Active Subscriptions",
      "Next Service Date",
      "Total Bookings",
    ],
  ];

  customers.forEach((customer) => {
    rows.push([
      customer.name || "",
      customer.email,
      String(customer.activeSubscriptions),
      formatDate(customer.nextServiceDate),
      String(customer.bookings.length),
    ]);
  });

  rows.push([]);
  rows.push(["Total Referred Customers", String(customers.length)]);

  downloadCsv(`${slugify(businessName)}-referred-customers.csv`, rows);
}

export function downloadPartnerActiveSubscriptionsCsv(
  businessName: string,
  bookings: PartnerBookingExportRow[]
) {
  const rows: string[][] = [
    [
      "Customer Name",
      "Customer Email",
      "Plan",
      "Partner Share",
      "Next Service Date",
      "Commission Status",
      "Created Date",
    ],
  ];

  bookings
    .filter((booking) => booking.status === "active")
    .sort((a, b) => {
      const aName = (a.customerName || a.customerEmail).toLowerCase();
      const bName = (b.customerName || b.customerEmail).toLowerCase();
      return aName.localeCompare(bName);
    })
    .forEach((booking) => {
      rows.push([
        booking.customerName || "",
        booking.customerEmail,
        booking.planName || "",
        formatMoney(booking.partnerShareAmount || 0),
        formatDate(toDate(booking.nextServiceDate)),
        booking.commissionStatus || "pending",
        formatDate(toDate(booking.createdAt)),
      ]);
    });

  rows.push([]);
  rows.push([
    "Total Active Subscriptions",
    String(bookings.filter((booking) => booking.status === "active").length),
  ]);

  downloadCsv(`${slugify(businessName)}-active-subscriptions.csv`, rows);
}

export function downloadPartnerPayoutCsv(options: {
  businessName: string;
  pendingCommissionsCents: number;
  heldCommissionsCents: number;
  paidCommissionsCents: number;
  payouts: PartnerPayoutExportRow[];
  nextPayoutDate?: Date;
}) {
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

  const rows: string[][] = [
    ["Summary"],
    ["Next Payout Date", formatDate(nextPayoutDate)],
    ["Days Until Payout", String(daysUntilPayout)],
    ["Pending Commissions", formatMoney(pendingCommissionsCents)],
    ["Held Commissions", formatMoney(heldCommissionsCents)],
    ["Commissions Paid To Date", formatMoney(paidCommissionsCents)],
    [],
    ["Payout History"],
    ["Payout Date", "Amount", "Gross Amount", "Employee Costs", "Status", "Created Date"],
  ];

  if (payouts.length === 0) {
    rows.push(["No payout records yet", "", "", "", "", ""]);
  } else {
    payouts.forEach((payout) => {
      rows.push([
        payout.payoutDate ? formatDate(new Date(payout.payoutDate)) : "",
        formatMoney(payout.amount || 0),
        formatMoney(payout.grossAmount || 0),
        formatMoney(payout.employeeCosts || 0),
        payout.status,
        payout.createdAt ? formatDate(new Date(payout.createdAt)) : "",
      ]);
    });
  }

  downloadCsv(`${slugify(businessName)}-payout-summary.csv`, rows);
}
