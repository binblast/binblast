"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface PlatformRevenueSummary {
  bookingCount: number;
  totalCustomerPaidCents: number;
  totalPartnerShareCents: number;
  totalPlatformShareCents: number;
  mtdCustomerPaidCents: number;
  mtdPartnerShareCents: number;
  mtdPlatformShareCents: number;
}

interface PlatformRevenueBooking {
  id: string;
  partnerId: string;
  partnerBusinessName: string;
  partnerCode: string;
  customerEmail: string;
  customerName: string | null;
  planName: string;
  bookingAmountCents: number;
  partnerShareAmountCents: number;
  platformShareAmountCents: number;
  commissionStatus: string;
  status: string;
  stripeSessionId: string | null;
  stripeTransferId: string | null;
  createdAt: string | null;
}

interface PartnerOption {
  id: string;
  businessName: string;
  partnerCode: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function PlatformRevenuePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PlatformRevenueSummary | null>(null);
  const [bookings, setBookings] = useState<PlatformRevenueBooking[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (partnerFilter !== "all") {
        params.set("partnerId", partnerFilter);
      }
      const query = params.toString();
      const response = await fetchWithAuth(
        `/api/admin/platform-revenue${query ? `?${query}` : ""}`
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load platform revenue");
      }
      setSummary(data.summary);
      setBookings(data.bookings || []);
      setPartners(data.partners || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load platform revenue");
    } finally {
      setLoading(false);
    }
  }, [partnerFilter]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) =>
      [
        booking.partnerBusinessName,
        booking.partnerCode,
        booking.customerEmail,
        booking.planName,
        booking.stripeSessionId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [bookings, search]);

  function exportCsv() {
    const headers = [
      "Date",
      "Partner",
      "Partner Code",
      "Customer Email",
      "Plan",
      "Customer Paid",
      "Partner Share",
      "Bin Blast Share",
      "Commission Status",
      "Stripe Session",
      "Stripe Transfer",
    ];
    const rows = filteredBookings.map((booking) => [
      booking.createdAt || "",
      booking.partnerBusinessName,
      booking.partnerCode,
      booking.customerEmail,
      booking.planName,
      (booking.bookingAmountCents / 100).toFixed(2),
      (booking.partnerShareAmountCents / 100).toFixed(2),
      (booking.platformShareAmountCents / 100).toFixed(2),
      booking.commissionStatus,
      booking.stripeSessionId || "",
      booking.stripeTransferId || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "platform-revenue.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="pp-revenue-loading">Loading platform revenue...</div>;
  }

  if (error) {
    return (
      <div className="pp-revenue-error">
        <p>{error}</p>
        <button type="button" className="pp-review-btn" onClick={loadRevenue}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pp-revenue-panel">
      <div className="pp-section-head">
        <div>
          <h3 className="pp-section-title">Platform Revenue</h3>
          <p className="pp-section-hint">
            Reconcile Stripe payments: customer paid, partner share (60%), and Bin Blast share (40%).
          </p>
        </div>
        <button type="button" className="pp-export-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      {summary && (
        <div className="pp-revenue-summary">
          <div className="pp-revenue-stat">
            <span className="pp-revenue-stat-label">All time · Customer paid</span>
            <strong>{formatCents(summary.totalCustomerPaidCents)}</strong>
          </div>
          <div className="pp-revenue-stat">
            <span className="pp-revenue-stat-label">All time · Partner share</span>
            <strong>{formatCents(summary.totalPartnerShareCents)}</strong>
          </div>
          <div className="pp-revenue-stat pp-revenue-stat-platform">
            <span className="pp-revenue-stat-label">All time · Bin Blast share</span>
            <strong>{formatCents(summary.totalPlatformShareCents)}</strong>
          </div>
          <div className="pp-revenue-stat pp-revenue-stat-platform">
            <span className="pp-revenue-stat-label">This month · Bin Blast share</span>
            <strong>{formatCents(summary.mtdPlatformShareCents)}</strong>
          </div>
        </div>
      )}

      <div className="pp-filters-row">
        <select
          className="pp-select"
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
        >
          <option value="all">All partners</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.businessName}
              {partner.partnerCode ? ` (${partner.partnerCode})` : ""}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="pp-search"
          placeholder="Search customer, partner, plan, session..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="pp-refresh-btn" onClick={loadRevenue}>
          Refresh
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="pp-empty">
          <div className="pp-empty-icon">💰</div>
          <p className="pp-empty-title">No partner bookings yet</p>
          <p className="pp-empty-text">
            When customers pay through a partner link, each booking will show up here with the split.
          </p>
        </div>
      ) : (
        <div className="pp-revenue-table-wrap">
          <table className="pp-revenue-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Partner</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Customer paid</th>
                <th>Partner (60%)</th>
                <th>Bin Blast (40%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{formatDate(booking.createdAt)}</td>
                  <td>
                    <div className="pp-revenue-partner">
                      <strong>{booking.partnerBusinessName}</strong>
                      {booking.partnerCode && (
                        <span className="pp-revenue-code">{booking.partnerCode}</span>
                      )}
                    </div>
                  </td>
                  <td>{booking.customerEmail || "—"}</td>
                  <td>{booking.planName}</td>
                  <td>{formatCents(booking.bookingAmountCents)}</td>
                  <td>{formatCents(booking.partnerShareAmountCents)}</td>
                  <td className="pp-revenue-platform-cell">
                    {formatCents(booking.platformShareAmountCents)}
                  </td>
                  <td>
                    <span className={`pp-revenue-status ${booking.commissionStatus}`}>
                      {booking.commissionStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
