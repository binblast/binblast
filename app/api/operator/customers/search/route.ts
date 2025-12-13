// app/api/operator/customers/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const county = searchParams.get("county") || "";
    const city = searchParams.get("city") || "";
    const plan = searchParams.get("plan") || "";
    const status = searchParams.get("status") || "";
    const serviceType = searchParams.get("serviceType") || "";

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy, limit } = firestore;

    const usersRef = collection(db, "users");
    let usersQuery = query(usersRef, where("role", "==", "customer"), limit(500));

    const snapshot = await getDocs(usersQuery);
    let customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter((c: any) => {
        const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const email = (c.email || "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    if (county) {
      customers = customers.filter((c: any) => 
        (c.county || "").toLowerCase() === county.toLowerCase()
      );
    }

    if (city) {
      customers = customers.filter((c: any) => 
        (c.city || "").toLowerCase() === city.toLowerCase()
      );
    }

    if (plan) {
      customers = customers.filter((c: any) => c.selectedPlan === plan);
    }

    if (status) {
      if (status === "active") {
        customers = customers.filter((c: any) => 
          c.subscriptionStatus === "active" && !c.servicePaused
        );
      } else if (status === "paused") {
        customers = customers.filter((c: any) => c.servicePaused);
      } else if (status === "canceled") {
        customers = customers.filter((c: any) => 
          c.subscriptionStatus === "cancelled" || c.subscriptionStatus === "canceled"
        );
      }
    }

    if (serviceType) {
      // This would need to be determined from scheduledCleanings or plan type
      // For now, we'll skip this filter or implement based on plan
    }

    // Format for dropdown display
    const formattedCustomers = customers.map((c: any) => ({
      id: c.id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      email: c.email || "",
      county: c.county || c.city || "",
      city: c.city || "",
      address: c.addressLine1 || "",
      plan: c.selectedPlan || "",
      status: c.subscriptionStatus || "",
    }));

    return NextResponse.json({
      customers: formattedCustomers,
      count: formattedCustomers.length,
    });
  } catch (error: any) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search customers" },
      { status: 500 }
    );
  }
}

