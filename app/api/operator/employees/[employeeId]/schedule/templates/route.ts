// app/api/operator/employees/[employeeId]/schedule/templates/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Return predefined schedule templates
    const templates = [
      {
        id: "full_time",
        name: "Full Time (Mon-Fri, 8am-5pm)",
        schedule: [
          { dayOfWeek: 0, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 1, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 20 },
          { dayOfWeek: 2, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 20 },
          { dayOfWeek: 3, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 20 },
          { dayOfWeek: 4, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 20 },
          { dayOfWeek: 5, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 20 },
          { dayOfWeek: 6, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
        ],
      },
      {
        id: "part_time_morning",
        name: "Part Time Morning (Mon-Fri, 8am-12pm)",
        schedule: [
          { dayOfWeek: 0, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 1, isWorking: true, startTime: "08:00", endTime: "12:00", maxStops: 10 },
          { dayOfWeek: 2, isWorking: true, startTime: "08:00", endTime: "12:00", maxStops: 10 },
          { dayOfWeek: 3, isWorking: true, startTime: "08:00", endTime: "12:00", maxStops: 10 },
          { dayOfWeek: 4, isWorking: true, startTime: "08:00", endTime: "12:00", maxStops: 10 },
          { dayOfWeek: 5, isWorking: true, startTime: "08:00", endTime: "12:00", maxStops: 10 },
          { dayOfWeek: 6, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
        ],
      },
      {
        id: "weekend_only",
        name: "Weekend Only (Sat-Sun, 8am-5pm)",
        schedule: [
          { dayOfWeek: 0, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 15 },
          { dayOfWeek: 1, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 2, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 3, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 4, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 5, isWorking: false, startTime: "", endTime: "", maxStops: 0 },
          { dayOfWeek: 6, isWorking: true, startTime: "08:00", endTime: "17:00", maxStops: 15 },
        ],
      },
    ];

    return NextResponse.json({
      templates,
    });
  } catch (error: any) {
    console.error("Error getting templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get templates" },
      { status: 500 }
    );
  }
}

