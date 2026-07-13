import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString } from "@/lib/employee-utils";
import { parseGeoPoint } from "@/lib/geo-utils";

export const dynamic = "force-dynamic";

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNext7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(getDateString(date));
  }
  return dates;
}

export async function GET() {
  try {
    const db = await getAdminFirestore();
    const today = getTodayDateString();
    const dateRange = getNext7Days();
    const endDate = dateRange[dateRange.length - 1];

    const [employeesSnap, clockInsSnap, cleaningsSnap] = await Promise.all([
      db.collection("users").where("role", "==", "employee").get(),
      db.collection("clockIns").where("isActive", "==", true).get(),
      db
        .collection("scheduledCleanings")
        .where("scheduledDate", ">=", today)
        .where("scheduledDate", "<=", endDate)
        .get(),
    ]);

    const clockedInIds = new Set<string>();
    clockInsSnap.docs.forEach((doc: { data: () => { employeeId?: string } }) => {
      const employeeId = doc.data().employeeId;
      if (employeeId) clockedInIds.add(employeeId);
    });

    const employees = employeesSnap.docs
      .filter((doc: { data: () => { hiringStatus?: string } }) => doc.data().hiringStatus !== "terminated")
      .map((doc: { id: string; data: () => Record<string, unknown> }) => {
        const data = doc.data();
        const location = parseGeoPoint(data.lastKnownLocation);
        return {
          id: doc.id,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email || "Employee",
          email: data.email || null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          isClockedIn: clockedInIds.has(doc.id),
        };
      });

    const stops = cleaningsSnap.docs
      .map((doc: { id: string; data: () => Record<string, unknown> }) => {
        const data = doc.data();
        const status = (data.status || data.jobStatus || "pending") as string;
        return {
          id: doc.id,
          ...data,
          status,
          jobStatus: (data.jobStatus || status) as string,
          isToday: data.scheduledDate === today,
          isUpcoming: Boolean(data.scheduledDate && data.scheduledDate > today),
        };
      })
      .filter((stop: { status: string }) => stop.status !== "completed" && stop.status !== "cancelled")
      .sort((a: { scheduledDate?: string; routeSequence?: number; scheduledTime?: string }, b: { scheduledDate?: string; routeSequence?: number; scheduledTime?: string }) => {
        const dateCompare = String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
        if (dateCompare !== 0) return dateCompare;
        if (typeof a.routeSequence === "number" && typeof b.routeSequence === "number") {
          return a.routeSequence - b.routeSequence;
        }
        return String(a.scheduledTime || "").localeCompare(String(b.scheduledTime || ""));
      });

    const todayStops = stops.filter((stop: { isToday?: boolean }) => stop.isToday);
    const upcomingStops = stops.filter((stop: { isUpcoming?: boolean }) => stop.isUpcoming);

    return NextResponse.json({
      employees,
      stops,
      todayStops,
      upcomingStops,
      today,
      clockedInCount: clockedInIds.size,
      stats: {
        totalEmployees: employees.length,
        clockedIn: clockedInIds.size,
        todayActiveStops: todayStops.length,
        upcomingActiveStops: upcomingStops.length,
        totalActiveStops: stops.length,
      },
    });
  } catch (error: unknown) {
    console.error("[Fleet Live API] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load fleet data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
