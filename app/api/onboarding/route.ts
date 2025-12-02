// app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Frequency } from "@prisma/client";
import { getNextCleaningDate } from "@/lib/scheduling";

// Map wizard planId to Frequency enum
const PLAN_TO_FREQUENCY: Record<string, Frequency> = {
  basic: Frequency.MONTHLY,
  standard: Frequency.BIWEEKLY,
  premium: Frequency.WEEKLY,
};

// Map wizard planId to price
const PLAN_TO_PRICE: Record<string, number> = {
  basic: 25,
  standard: 40,
  premium: 60,
};


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, customer, service } = body;

    // Validation
    if (!planId || !customer?.email || !service?.addressLine1) {
      return NextResponse.json(
        { message: "Missing required onboarding fields." },
        { status: 400 }
      );
    }

    // Validate planId
    if (!PLAN_TO_FREQUENCY[planId]) {
      return NextResponse.json(
        { message: "Invalid plan ID." },
        { status: 400 }
      );
    }

    const frequency = PLAN_TO_FREQUENCY[planId];
    const pricePerClean = PLAN_TO_PRICE[planId];
    const startDate = new Date(service.startDate);
    
    // Use the scheduling utility to calculate next cleaning date
    const nextCleaningDate = getNextCleaningDate(
      service.trashDayOfWeek,
      frequency,
      startDate
    );

    // Use Prisma transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1) Upsert user (create or update if exists)
      const user = await tx.user.upsert({
        where: { email: customer.email },
        create: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
        },
        update: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
        },
      });

      // 2) Create service address
      const serviceAddress = await tx.serviceAddress.create({
        data: {
          line1: service.addressLine1,
          line2: service.addressLine2 || null,
          city: service.city,
          state: service.state,
          postalCode: service.postalCode,
        },
      });

      // 3) Create subscription
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: planId,
          pricePerClean: pricePerClean,
          frequency: frequency,
          serviceAddressId: serviceAddress.id,
          trashDayOfWeek: service.trashDayOfWeek,
          preferredTimeWindow: service.preferredTimeWindow,
          startDate: startDate,
          nextCleaningDate: nextCleaningDate,
        },
        include: {
          user: true,
          serviceAddress: true,
        },
      });

      return { user, serviceAddress, subscription };
    });

    // TODO: Create Stripe checkout session if needed
    // const checkoutSession = await createStripeCheckoutSession({
    //   subscriptionId: result.subscription.id,
    //   pricePerClean: pricePerClean,
    //   frequency: frequency,
    // });

    return NextResponse.json(
      {
        message: "Onboarding created successfully.",
        subscriptionId: result.subscription.id,
        userId: result.user.id,
        nextCleaningDate: result.subscription.nextCleaningDate,
        // checkoutUrl: checkoutSession.url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Onboarding error:", err);

    // Handle Prisma-specific errors
    if (err.code === "P2002") {
      return NextResponse.json(
        { message: "A user with this email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: err.message || "Server error. Please try again." },
      { status: 500 }
    );
  }
}

