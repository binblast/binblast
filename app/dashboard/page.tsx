// app/dashboard/page.tsx

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function formatDate(date: Date | null | undefined) {
  if (!date) return "Not scheduled yet";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    include: { serviceAddress: true },
  });

  if (!subscription) {
    // No active subscription → push to signup
    redirect("/signup");
  }

  const {
    planId,
    pricePerClean,
    frequency,
    nextCleaningDate,
    lastCleaningDate,
    trashDayOfWeek,
    preferredTimeWindow,
    serviceAddress,
  } = subscription;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">
          Hey {user.firstName ?? "there"}, your bins are in good hands 👋
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Here&apos;s your current plan and cleaning schedule.
        </p>

        {/* Summary cards */}
        <section className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">Plan</div>
            <div className="text-lg font-semibold mb-1">
              {planId ?? "Custom Plan"}
            </div>
            <div className="text-sm text-gray-600">
              ${pricePerClean} / clean · {frequency}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">
              Next cleaning
            </div>
            <div className="text-lg font-semibold mb-1">
              {formatDate(nextCleaningDate)}
            </div>
            <div className="text-sm text-gray-600">
              Trash day: {trashDayOfWeek || "—"}
            </div>
            <div className="text-xs text-gray-500">
              Window: {preferredTimeWindow || "—"}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
            <div className="text-xs uppercase text-gray-500 mb-1">
              Last cleaning
            </div>
            <div className="text-lg font-semibold mb-1">
              {lastCleaningDate ? formatDate(lastCleaningDate) : "Not yet"}
            </div>
            <div className="text-xs text-gray-500">
              Updates when your route is completed.
            </div>
          </div>
        </section>

        {/* Address + notes */}
        <section className="bg-white rounded-2xl shadow border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-2">Service address</h2>
          <p className="text-sm">
            {serviceAddress?.line1}
            {serviceAddress?.line2 && `, ${serviceAddress.line2}`}
            <br />
            {serviceAddress?.city}, {serviceAddress?.state}{" "}
            {serviceAddress?.postalCode}
          </p>
        </section>

        {/* Simple info block */}
        <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">How it works</p>
          <p>
            We schedule your clean based on your trash day (
            {trashDayOfWeek || "your area"}) and preferred time window. Once
            your bins are cleaned, this dashboard will update with your{" "}
            <strong>last cleaning</strong> date and your{" "}
            <strong>next upcoming clean</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}

