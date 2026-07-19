export type QuotePartnerAssignmentStatus = "draft" | "active" | "completed" | "cancelled";

export interface QuotePartnerAssignmentInput {
  partnerId: string;
  partnerName: string;
  scopeLabel?: string;
  assignedUnits?: number | null;
  assignedBins?: number | null;
  assignedDumpsters?: number | null;
  monthlyAmount: number;
  revenueSharePercent?: number | null;
  notes?: string;
}

export interface QuotePartnerAssignment extends QuotePartnerAssignmentInput {
  id: string;
  quoteId: string;
  offerId?: string | null;
  status: QuotePartnerAssignmentStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface QuotePartnerAssignmentSummary {
  totalMonthlyAmount: number;
  assignmentCount: number;
  matchesOfferPrice: boolean;
  difference: number;
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date) return maybeDate.toISOString();
  }
  return null;
}

export function serializeQuotePartnerAssignment(
  data: Record<string, unknown>,
  id: string
): QuotePartnerAssignment {
  return {
    id,
    quoteId: String(data.quoteId || ""),
    offerId: data.offerId ? String(data.offerId) : null,
    partnerId: String(data.partnerId || ""),
    partnerName: String(data.partnerName || ""),
    scopeLabel: String(data.scopeLabel || ""),
    assignedUnits:
      typeof data.assignedUnits === "number" ? data.assignedUnits : null,
    assignedBins:
      typeof data.assignedBins === "number" ? data.assignedBins : null,
    assignedDumpsters:
      typeof data.assignedDumpsters === "number" ? data.assignedDumpsters : null,
    monthlyAmount: Number(data.monthlyAmount || 0),
    revenueSharePercent:
      typeof data.revenueSharePercent === "number"
        ? data.revenueSharePercent
        : null,
    notes: String(data.notes || ""),
    status: (String(data.status || "draft") as QuotePartnerAssignmentStatus),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export function normalizeAssignmentInput(
  raw: unknown
): QuotePartnerAssignmentInput | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const partnerId = String(row.partnerId || "").trim();
  const partnerName = String(row.partnerName || "").trim();
  const monthlyAmount = Number(row.monthlyAmount);

  if (!partnerId || !partnerName || !Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
    return null;
  }

  return {
    partnerId,
    partnerName,
    scopeLabel: String(row.scopeLabel || "").trim(),
    assignedUnits:
      typeof row.assignedUnits === "number" && row.assignedUnits >= 0
        ? row.assignedUnits
        : null,
    assignedBins:
      typeof row.assignedBins === "number" && row.assignedBins >= 0
        ? row.assignedBins
        : null,
    assignedDumpsters:
      typeof row.assignedDumpsters === "number" && row.assignedDumpsters >= 0
        ? row.assignedDumpsters
        : null,
    monthlyAmount,
    revenueSharePercent:
      typeof row.revenueSharePercent === "number" &&
      row.revenueSharePercent >= 0 &&
      row.revenueSharePercent <= 100
        ? row.revenueSharePercent
        : null,
    notes: String(row.notes || "").trim(),
  };
}

export function summarizePartnerAssignments(
  assignments: QuotePartnerAssignmentInput[],
  offerMonthlyPrice: number
): QuotePartnerAssignmentSummary {
  const totalMonthlyAmount = assignments.reduce(
    (sum, row) => sum + (row.monthlyAmount || 0),
    0
  );
  const difference = Math.round((offerMonthlyPrice - totalMonthlyAmount) * 100) / 100;
  return {
    totalMonthlyAmount,
    assignmentCount: assignments.length,
    matchesOfferPrice: Math.abs(difference) < 0.01,
    difference,
  };
}

export function buildAssignmentFirestorePayload(
  quoteId: string,
  offerId: string,
  row: QuotePartnerAssignmentInput,
  status: QuotePartnerAssignmentStatus
) {
  return {
    quoteId,
    offerId,
    partnerId: row.partnerId,
    partnerName: row.partnerName,
    scopeLabel: row.scopeLabel || "",
    assignedUnits: row.assignedUnits ?? null,
    assignedBins: row.assignedBins ?? null,
    assignedDumpsters: row.assignedDumpsters ?? null,
    monthlyAmount: row.monthlyAmount,
    revenueSharePercent: row.revenueSharePercent ?? null,
    notes: row.notes || "",
    status,
  };
}
