// app/api/subscription/preferred-time/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId, preferredTimeWindow } = await req.json();

    if (!subscriptionId || !preferredTimeWindow) {
      return NextResponse.json(
        { message: "Missing subscriptionId or preferredTimeWindow" },
        { status: 400 }
      );
    }

    // Ensure this subscription belongs to the logged-in user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: user.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { message: "Subscription not found" },
        { status: 404 }
      );
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { preferredTimeWindow },
    });

    return NextResponse.json({ message: "Updated" }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

