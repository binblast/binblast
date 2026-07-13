import { NextRequest, NextResponse } from "next/server";
import { geocodeAddressServer, geocodeStopServer } from "@/lib/geocoding-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get("address");
    const addressLine1 = searchParams.get("addressLine1");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const zipCode = searchParams.get("zipCode");
    const addressLine2 = searchParams.get("addressLine2");

    let result = null;

    if (addressLine1 || city || state || zipCode) {
      result = await geocodeStopServer({
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
      });
    } else if (address) {
      result = await geocodeAddressServer(address);
    } else {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error geocoding address:", error);
    const message = error instanceof Error ? error.message : "Failed to geocode address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
