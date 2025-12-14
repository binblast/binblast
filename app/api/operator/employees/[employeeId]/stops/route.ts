// app/api/operator/employees/[employeeId]/stops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getNext7Days(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(getDateString(date));
  }
  return dates;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
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
    const { collection, query, where, getDocs, orderBy, doc, updateDoc } = firestore;

    const today = getTodayDateString();
    const next7Days = getNext7Days();

    const cleaningsRef = collection(db, "scheduledCleanings");

    // Helper function to extract coordinates from Firestore data
    const extractCoordinates = (data: any): { latitude?: number; longitude?: number } => {
      // Check if coordinates exist as direct properties
      if (data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude };
      }
      
      // Check if coordinates exist as GeoPoint
      if (data.location && typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
        return { latitude: data.location.latitude, longitude: data.location.longitude };
      }
      
      return {};
    };

    // Helper function to build address string
    const buildAddressString = (stop: any): string => {
      const parts: string[] = [];
      if (stop.addressLine1) parts.push(stop.addressLine1);
      if (stop.city) parts.push(stop.city);
      if (stop.state) parts.push(stop.state);
      if (stop.zipCode) parts.push(stop.zipCode);
      return parts.join(", ");
    };

    // Geocoding is disabled to prevent API timeouts
    // Coordinates should be added via separate geocoding process

    // Get today's stops
    let todayStops: any[];
    try {
      const todayStopsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employeeId),
        where("scheduledDate", "==", today),
        orderBy("scheduledTime", "asc")
      );
      const todaySnapshot = await getDocs(todayStopsQuery);
      todayStops = todaySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error: any) {
      // If orderBy fails (missing index), try without orderBy and sort manually
      console.warn("OrderBy query failed, trying without orderBy:", error.message);
      const todayStopsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employeeId),
        where("scheduledDate", "==", today)
      );
      const todaySnapshot = await getDocs(todayStopsQuery);
      todayStops = todaySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort manually by scheduledTime
      todayStops.sort((a: any, b: any) => {
        const timeA = a.scheduledTime || "";
        const timeB = b.scheduledTime || "";
        return timeA.localeCompare(timeB);
      });
    }

    // Get next 7 days stops
    let upcomingStops: any[];
    try {
      const upcomingStopsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employeeId),
        where("scheduledDate", ">=", next7Days[1]),
        where("scheduledDate", "<=", next7Days[6]),
        orderBy("scheduledDate", "asc"),
        orderBy("scheduledTime", "asc")
      );
      const upcomingSnapshot = await getDocs(upcomingStopsQuery);
      upcomingStops = upcomingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error: any) {
      // Fallback without orderBy
      console.warn("OrderBy query failed for upcoming stops:", error.message);
      const upcomingStopsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employeeId),
        where("scheduledDate", ">=", next7Days[1]),
        where("scheduledDate", "<=", next7Days[6])
      );
      const upcomingSnapshot = await getDocs(upcomingStopsQuery);
      upcomingStops = upcomingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort manually
      upcomingStops.sort((a: any, b: any) => {
        const dateA = a.scheduledDate || "";
        const dateB = b.scheduledDate || "";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.scheduledTime || "";
        const timeB = b.scheduledTime || "";
        return timeA.localeCompare(timeB);
      });
    }

    // Process stops to add coordinates (non-blocking - don't wait for geocoding)
    // Skip geocoding if it causes issues - just return stops with existing coordinates
    const processStops = async (stops: any[]): Promise<any[]> => {
      try {
        const processedStops = await Promise.allSettled(
          stops.map(async (stop) => {
            try {
              const coords = extractCoordinates(stop);
              
              // If coordinates exist, return stop with coordinates
              if (coords.latitude && coords.longitude) {
                return {
                  ...stop,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                };
              }

              // Skip geocoding for now to prevent API timeouts
              // Geocoding can be done asynchronously via a separate process
              // Return stop without coordinates
              return stop;
            } catch (error) {
              console.error("Error processing stop:", error);
              // Return original stop on error
              return stop;
            }
          })
        );

        // Extract successful results, fallback to original stop on failure
        return processedStops.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error("Failed to process stop:", result.reason);
            return stops[index]; // Return original stop
          }
        });
      } catch (error) {
        console.error("Error in processStops:", error);
        // If processing fails entirely, just return original stops
        return stops;
      }
    };

    // Process both today's and upcoming stops
    // Use Promise.allSettled to ensure we return even if some geocoding fails
    const [processedTodayStops, processedUpcomingStops] = await Promise.allSettled([
      processStops(todayStops),
      processStops(upcomingStops),
    ]);

    // Extract results, fallback to original arrays on failure
    const finalTodayStops = processedTodayStops.status === 'fulfilled' 
      ? processedTodayStops.value 
      : todayStops;
    const finalUpcomingStops = processedUpcomingStops.status === 'fulfilled'
      ? processedUpcomingStops.value
      : upcomingStops;

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
    const { cleaningId, priority, recurring } = body;

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

    // Get employee name
    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    const employeeData = employeeSnap.data();
    const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

    // Get cleaning document
    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const cleaningData = cleaningSnap.data();

    // Validate assignment (check counties, drive time, etc.)
    // This is a basic validation - can be enhanced
    if (cleaningData.assignedEmployeeId && cleaningData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Cleaning is already assigned to another employee" },
        { status: 400 }
      );
    }

    // Update cleaning assignment
    await updateDoc(cleaningRef, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
      jobStatus: "pending",
      priority: priority || "normal",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Stop assigned successfully",
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

