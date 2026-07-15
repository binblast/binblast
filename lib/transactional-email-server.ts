import { notifyCleaningComplete } from "@/lib/email-utils";
import { formatEmailDate } from "@/lib/email-template-config";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * Server-only: loads customer profile + next cleaning date, then sends completion email.
 */
export async function notifyCleaningCompleteForJob(params: {
  userId?: string | null;
  userEmail?: string | null;
  completedDate?: string | null;
  nextCleaningId?: string | null;
}): Promise<void> {
  const email = params.userEmail?.trim();
  if (!email) return;

  try {
    const db = await getAdminFirestore();

    let firstName = email.split("@")[0] || "there";
    let lastName = "";

    if (params.userId) {
      const userDoc = await db.collection("users").doc(params.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        firstName = (userData.firstName as string) || firstName;
        lastName = (userData.lastName as string) || "";
      }
    }

    let nextCleaningDate: string | null = null;
    if (params.nextCleaningId) {
      const nextDoc = await db.collection("scheduledCleanings").doc(params.nextCleaningId).get();
      nextCleaningDate = (nextDoc.data()?.scheduledDate as string) || null;
    } else if (params.userId) {
      const upcomingSnapshot = await db
        .collection("scheduledCleanings")
        .where("userId", "==", params.userId)
        .get();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = upcomingSnapshot.docs
        .map((doc: { data: () => Record<string, unknown> }) => doc.data())
        .filter((cleaning: Record<string, unknown>) => {
          const status = `${cleaning.status || ""} ${cleaning.jobStatus || ""}`.toLowerCase();
          if (status.includes("completed") || status.includes("cancel")) return false;
          const scheduled = cleaning.scheduledDate ? new Date(String(cleaning.scheduledDate)) : null;
          if (!scheduled || Number.isNaN(scheduled.getTime())) return false;
          scheduled.setHours(0, 0, 0, 0);
          return scheduled >= today;
        })
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          String(a.scheduledDate).localeCompare(String(b.scheduledDate))
        );

      nextCleaningDate = (upcoming[0]?.scheduledDate as string) || null;
    }

    await notifyCleaningComplete({
      email,
      firstName,
      lastName,
      completedDate: formatEmailDate(params.completedDate || new Date()),
      nextCleaningDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notify Cleaning Complete For Job] Failed:", message);
  }
}
