// app/api/operator/employees/[employeeId]/stops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";
import { loadOperatorEmployeeStops } from "@/lib/operator-employee-stops";
import {
  cleaningMatchesDayList,
  compareCleaningPriority,
  employeeWorksOnDayName,
  normalizeDayName,
} from "@/lib/day-assignment";
import { loadEmployeeScheduleForDate } from "@/lib/employee-schedule";
import {
  enrichStopCoordinates,
} from "@/lib/stop-coordinates";
import {
  orderStopsByNeighborhood,
  persistRouteSequence,
} from "@/lib/neighborhood-route";

function sortStopsByRouteSequence<T extends { routeSequence?: number }>(
  stops: T[],
  fallbackSort: (a: T, b: T) => number
): T[] {
  const hasSequence = stops.some((stop) => typeof stop.routeSequence === "number");
  if (!hasSequence) {
    return [...stops].sort(fallbackSort);
  }
  return [...stops].sort((a, b) => {
    const seqA = typeof a.routeSequence === "number" ? a.routeSequence : 9999;
    const seqB = typeof b.routeSequence === "number" ? b.routeSequence : 9999;
    if (seqA !== seqB) return seqA - seqB;
    return fallbackSort(a, b);
  });
}

async function processStopsInBatches(
  stops: Array<Record<string, unknown>>,
  processStop: (stop: Record<string, unknown>) => Promise<Record<string, unknown>>,
  batchSize = 3
) {
  const processed: Array<Record<string, unknown>> = [];

  for (let index = 0; index < stops.length; index += batchSize) {
    const batch = stops.slice(index, index + batchSize);
    const results = await Promise.all(batch.map((stop) => processStop(stop)));
    processed.push(...results);
  }

  return processed;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const skipGeocode = req.nextUrl.searchParams.get("skipGeocode") === "1";

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const { todayStops, upcomingStops } = await loadOperatorEmployeeStops(employeeId);

    if (skipGeocode) {
      return NextResponse.json({
        todayStops: sortStopsByRouteSequence(todayStops, (a, b) =>
          compareCleaningPriority(a, b)
        ),
        upcomingStops: sortStopsByRouteSequence(upcomingStops, (a, b) => {
          const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
          if (dateCompare !== 0) return dateCompare;
          return compareCleaningPriority(a, b);
        }),
      });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, updateDoc, getDoc } = firestore;

    const loadUserCoordinates = async (stops: Array<Record<string, unknown>>) => {
      const userCoordsById = new Map<string, { latitude: number; longitude: number }>();
      const userIds = [
        ...new Set(
          stops
            .map((stop) => String(stop.userId || ""))
            .filter((userId) => userId.length > 0)
        ),
      ];

      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const userSnap = await getDoc(doc(db, "users", userId));
            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            if (typeof userData.latitude === "number" && typeof userData.longitude === "number") {
              userCoordsById.set(userId, {
                latitude: userData.latitude,
                longitude: userData.longitude,
              });
            }
          } catch (error) {
            console.warn(`[Stops] Could not load user coordinates for ${userId}:`, error);
          }
        })
      );

      return userCoordsById;
    };

    const processStops = async (stops: Array<Record<string, unknown>>) => {
      try {
        const userCoordsById = await loadUserCoordinates(stops);

        return processStopsInBatches(stops, async (stop) => {
          try {
            const userId = String(stop.userId || "");
            const enriched = await enrichStopCoordinates(
              stop as Parameters<typeof enrichStopCoordinates>[0],
              {
                geocodeIfMissing: true,
                userCoords: userId ? userCoordsById.get(userId) || null : null,
                onGeocoded: stop.id
                  ? async (coords) => {
                      try {
                        await updateDoc(doc(db, "scheduledCleanings", String(stop.id)), {
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                        });
                      } catch (persistError) {
                        console.warn(`[Stops] Could not persist coordinates for ${stop.id}:`, persistError);
                      }
                    }
                  : undefined,
              }
            );

            return enriched as Record<string, unknown>;
          } catch (error) {
            console.error("Error processing stop:", error);
            return stop;
          }
        });
      } catch (error) {
        console.error("Error in processStops:", error);
        return stops;
      }
    };

    const [processedTodayStops, processedUpcomingStops] = await Promise.all([
      processStops(todayStops),
      processStops(upcomingStops),
    ]);

    let finalTodayStops = sortStopsByRouteSequence(
      processedTodayStops,
      (a: any, b: any) => compareCleaningPriority(a, b)
    );

    const needsRouteOptimization =
      finalTodayStops.length > 1 &&
      !finalTodayStops.some((stop) => typeof stop.routeSequence === "number");

    if (needsRouteOptimization) {
      try {
        const employeeSnap = await getDoc(doc(db, "users", employeeId));
        const employeeData = employeeSnap.exists() ? employeeSnap.data() : {};
        const employeeLocation = employeeData.lastKnownLocation;
        const startLat =
          typeof employeeLocation?.latitude === "number"
            ? employeeLocation.latitude
            : null;
        const startLon =
          typeof employeeLocation?.longitude === "number"
            ? employeeLocation.longitude
            : null;

        finalTodayStops = orderStopsByNeighborhood(
          finalTodayStops as Array<Record<string, unknown> & { id: string }>,
          startLat,
          startLon
        );
        await persistRouteSequence(
          finalTodayStops.map((stop) => ({
            id: String(stop.id),
            routeSequence: stop.routeSequence as number | undefined,
            neighborhoodKey: stop.neighborhoodKey as string | undefined,
          }))
        );
      } catch (routeError) {
        console.warn("[Stops] Route optimization skipped:", routeError);
      }
    }

    const finalUpcomingStops = sortStopsByRouteSequence(
      processedUpcomingStops,
      (a: any, b: any) => {
        const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
        if (dateCompare !== 0) return dateCompare;
        return compareCleaningPriority(a, b);
      }
    );

    return NextResponse.json({
      todayStops: finalTodayStops,
      upcomingStops: finalUpcomingStops,
    });
  } catch (error: any) {
    console.error("Error getting stops:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get stops" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const {
      cleaningId,
      priority,
      recurring,
      assignmentType,
      recurringDays,
      assignmentSource,
    } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } =
      firestore;

    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const employeeData = employeeSnap.data();
    const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
    }

    const cleaningData = cleaningSnap.data();

    if (cleaningData.assignedEmployeeId && cleaningData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Cleaning is already assigned to another employee" },
        { status: 400 }
      );
    }

    const schedule = await loadEmployeeScheduleForDate(
      employeeId,
      cleaningData.scheduledDate || getTodayDateString()
    );
    const scheduleWarnings: string[] = [];

    if (
      cleaningData.trashDay &&
      !employeeWorksOnDayName(schedule, cleaningData.trashDay)
    ) {
      scheduleWarnings.push(
        `Employee is not scheduled to work on ${normalizeDayName(cleaningData.trashDay)}`
      );
    }

    const isRecurring = Boolean(recurring) || assignmentType === "recurring";
    const targetDays = Array.isArray(recurringDays)
      ? recurringDays.map((day: string) => normalizeDayName(day)).filter(Boolean)
      : cleaningData.trashDay
        ? [normalizeDayName(cleaningData.trashDay)]
        : [];

    const assignmentPayload = {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
      jobStatus: "pending",
      priority: priority || "normal",
      assignmentSource: assignmentSource || "manual",
      updatedAt: serverTimestamp(),
    };

    await updateDoc(cleaningRef, assignmentPayload);

    let assignedCount = 1;
    const assignedCleaningIds = [cleaningId];

    if (isRecurring && cleaningData.userId) {
      const today = getTodayDateString();
      const userRef = doc(db, "users", cleaningData.userId);
      const cleaningsRef = collection(db, "scheduledCleanings");
      const customerCleaningsQuery = query(
        cleaningsRef,
        where("userId", "==", cleaningData.userId)
      );
      const customerCleaningsSnapshot = await getDocs(customerCleaningsQuery);

      for (const customerCleaningDoc of customerCleaningsSnapshot.docs) {
        if (customerCleaningDoc.id === cleaningId) continue;

        const data = customerCleaningDoc.data();
        if (data.status === "completed" || data.status === "cancelled" || data.jobStatus === "completed") {
          continue;
        }
        if (!data.scheduledDate || data.scheduledDate < today) {
          continue;
        }
        if (!cleaningMatchesDayList(data, targetDays)) {
          continue;
        }
        if (data.assignedEmployeeId && data.assignedEmployeeId !== employeeId) {
          continue;
        }

        await updateDoc(customerCleaningDoc.ref, assignmentPayload);
        assignedCount += 1;
        assignedCleaningIds.push(customerCleaningDoc.id);
      }

      await updateDoc(userRef, {
        defaultAssignedEmployeeId: employeeId,
        defaultAssignedEmployeeName: employeeName,
        preferredAssignedDays: targetDays,
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: isRecurring
        ? `Assigned ${assignedCount} recurring cleaning(s) to ${employeeName}`
        : "Stop assigned successfully",
      assignedCount,
      assignedCleaningIds,
      warnings: scheduleWarnings,
    });
  } catch (error: any) {
    console.error("Error assigning stop:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign stop" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { cleaningId, priority, reassignToEmployeeId } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (priority) {
      updateData.priority = priority;
    }

    if (reassignToEmployeeId) {
      // Get new employee name
      const newEmployeeRef = doc(db, "users", reassignToEmployeeId);
      const newEmployeeSnap = await getDoc(newEmployeeRef);
      if (newEmployeeSnap.exists()) {
        const newEmployeeData = newEmployeeSnap.data();
        const newEmployeeName = `${newEmployeeData.firstName || ""} ${newEmployeeData.lastName || ""}`.trim();
        updateData.assignedEmployeeId = reassignToEmployeeId;
        updateData.assignedEmployeeName = newEmployeeName;
      }
    }

    await updateDoc(cleaningRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Stop updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating stop:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update stop" },
      { status: 500 }
    );
  }
}

