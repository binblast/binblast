// app/api/trash-schedule/lookup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postalCode = searchParams.get("postalCode");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    if (!postalCode && !city) {
      return NextResponse.json(
        { message: "postalCode or city is required" },
        { status: 400 }
      );
    }

    const record = await prisma.trashScheduleLookup.findFirst({
      where: {
        postalCode: postalCode ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "No schedule found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        defaultTrashDayOfWeek: record.defaultTrashDayOfWeek,
        notes: record.notes,
      },
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

