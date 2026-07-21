import { NextResponse } from "next/server";
import { getBinBlasterPayInfo } from "@/lib/bin-blaster-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payInfo = await getBinBlasterPayInfo();
    return NextResponse.json({ success: true, payInfo });
  } catch (error: unknown) {
    console.error("[Bin Blaster Pay Info GET]", error);
    return NextResponse.json({ error: "Failed to load pay information." }, { status: 500 });
  }
}
