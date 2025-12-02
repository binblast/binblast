// app/admin/subscriptions/page.tsx

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSubscriptionsTable from "./AdminSubscriptionsTable";

const ALLOWED_ADMIN_EMAILS = [
  "you@example.com",       // put your email here
  // "partner@example.com",
];

export default async function AdminSubscriptionsPage() {
  const user = await getCurrentUser();

  if (!user || !ALLOWED_ADMIN_EMAILS.includes(user.email)) {
    // Not authorized – push them somewhere safe
    redirect("/login");
  }

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: true,
      serviceAddress: true,
    },
    orderBy: {
      nextCleaningDate: "asc",
    },
  });

  // Serialize dates for client component
  const serializedSubscriptions = subscriptions.map((sub) => ({
    ...sub,
    nextCleaningDate: sub.nextCleaningDate?.toISOString() || null,
  }));

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">All Subscriptions</h1>

        <div className="bg-white border border-gray-200 rounded-2xl shadow overflow-x-auto">
          <AdminSubscriptionsTable subscriptions={serializedSubscriptions} />
        </div>
      </div>
    </main>
  );
}

