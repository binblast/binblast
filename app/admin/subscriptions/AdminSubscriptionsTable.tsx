"use client";

import { format } from "date-fns";
import { useState } from "react";

type SubscriptionRow = {
  id: string;
  planId: string | null;
  pricePerClean: number;
  frequency: string;
  nextCleaningDate: string | null; // serialized from server
  trashDayOfWeek: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  serviceAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
  };
};

export default function AdminSubscriptionsTable({
  subscriptions,
}: {
  subscriptions: SubscriptionRow[];
}) {
  const [rows, setRows] = useState(subscriptions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkCleaned(id: string) {
    setLoadingId(id);
    setError(null);

    try {
      const res = await fetch("/api/subscription/mark-cleaned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update.");
      }

      const updatedSub = data.subscription;

      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, nextCleaningDate: updatedSub.nextCleaningDate }
            : row
        )
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Customer</th>
            <th className="px-4 py-2 text-left">Plan</th>
            <th className="px-4 py-2 text-left">Next Clean</th>
            <th className="px-4 py-2 text-left">Trash Day</th>
            <th className="px-4 py-2 text-left">Address</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sub) => {
            const nextDate = sub.nextCleaningDate
              ? format(new Date(sub.nextCleaningDate), "EEE, MMM d")
              : "—";

            return (
              <tr key={sub.id} className="border-t border-gray-100">
                <td className="px-4 py-2 align-top">
                  {sub.user.firstName} {sub.user.lastName}
                  <div className="text-xs text-gray-500">
                    {sub.user.email}
                  </div>
                </td>
                <td className="px-4 py-2 align-top">
                  {sub.planId ?? "Custom"} (${sub.pricePerClean}/{sub.frequency})
                </td>
                <td className="px-4 py-2 align-top">{nextDate}</td>
                <td className="px-4 py-2 align-top">{sub.trashDayOfWeek}</td>
                <td className="px-4 py-2 align-top">
                  {sub.serviceAddress.line1}
                  {sub.serviceAddress.line2
                    ? `, ${sub.serviceAddress.line2}`
                    : ""}
                  <br />
                  {sub.serviceAddress.city}, {sub.serviceAddress.state}{" "}
                  {sub.serviceAddress.postalCode}
                </td>
                <td className="px-4 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => handleMarkCleaned(sub.id)}
                    disabled={loadingId === sub.id}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      loadingId === sub.id
                        ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                        : "border-gray-300 text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {loadingId === sub.id ? "Updating..." : "Mark as cleaned"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}


