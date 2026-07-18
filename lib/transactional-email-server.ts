import { notifyCleaningComplete } from "@/lib/email-utils";
import { formatEmailDate } from "@/lib/email-template-config";
import { parseCleaningDate, formatCleaningDateForStorage } from "@/lib/cleaning-schedule";
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
  try {
    const db = await getAdminFirestore();

    let email = params.userEmail?.trim() || "";
    let firstName = email.split("@")[0] || "there";
    let lastName = "";

    if (params.userId) {
      const userDoc = await db.collection("users").doc(params.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        email = (userData.email as string)?.trim() || email;
        firstName = (userData.firstName as string) || firstName;
        lastName = (userData.lastName as string) || "";
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn("[Notify Cleaning Complete For Job] Skipping — invalid or missing email.");
      return;
    }

    let nextCleaningDate: string | null = null;
    if (params.nextCleaningId) {
      const nextDoc = await db.collection("scheduledCleanings").doc(params.nextCleaningId).get();
      const rawNextDate = nextDoc.data()?.scheduledDate;
      nextCleaningDate = rawNextDate
        ? formatCleaningDateForStorage(parseCleaningDate(rawNextDate))
        : null;
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
          const scheduled = parseCleaningDate(cleaning.scheduledDate);
          scheduled.setHours(0, 0, 0, 0);
          return scheduled >= today;
        })
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          parseCleaningDate(a.scheduledDate).getTime() -
          parseCleaningDate(b.scheduledDate).getTime()
        );

      const rawNextDate = upcoming[0]?.scheduledDate;
      nextCleaningDate = rawNextDate
        ? formatCleaningDateForStorage(parseCleaningDate(rawNextDate))
        : null;
    }

    const completedDateValue = params.completedDate
      ? formatCleaningDateForStorage(parseCleaningDate(params.completedDate))
      : formatCleaningDateForStorage(new Date());

    await notifyCleaningComplete({
      email,
      firstName,
      lastName,
      completedDate: formatEmailDate(completedDateValue),
      nextCleaningDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notify Cleaning Complete For Job] Failed:", message);
  }
}
