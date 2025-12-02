// app/api/subscription/mark-cleaned/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextCleaningDate } from "@/lib/scheduling";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { message: "subscriptionId required" },
        { status: 400 }
      );
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      return NextResponse.json(
        { message: "Subscription not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Set lastCleaningDate to now, nextCleaningDate to next cycle
    const nextDate = getNextCleaningDate(
      sub.trashDayOfWeek,
      sub.frequency as any,
      now
    );

    // after updating subscription in mark-cleaned route
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        lastCleaningDate: now,
        nextCleaningDate: nextDate,
      },
      select: {
        id: true,
        nextCleaningDate: true,
      },
    });

    return NextResponse.json(
      { message: "Updated", subscription: updated },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

