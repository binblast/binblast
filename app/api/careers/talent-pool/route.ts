import { NextRequest, NextResponse } from "next/server";
import { addTalentPoolEntry } from "@/lib/careers-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !body.firstName || !body.lastName) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const id = await addTalentPoolEntry({
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email,
      phone: String(body.phone || ""),
      city: String(body.city || ""),
      state: String(body.state || "GA"),
      zip: String(body.zip || ""),
      skills: Array.isArray(body.skills) ? body.skills.map(String) : [],
      desiredPosition: String(body.desiredPosition || ""),
      availability: String(body.availability || ""),
      yearsExperience: String(body.yearsExperience || ""),
    });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error("[Talent Pool POST]", error);
    return NextResponse.json({ error: "Failed to join talent pool." }, { status: 500 });
  }
}
