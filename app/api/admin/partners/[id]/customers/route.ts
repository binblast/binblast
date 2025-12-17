// app/api/admin/partners/[id]/customers/route.ts
// Get customers assigned to a partner

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where } = firestore;

    // Get bookings for this partner
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("partnerId", "==", partnerId)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    // Get unique customers
    const customerEmails = new Set<string>();
    const customerMap = new Map<string, any>();

    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      if (booking.customerEmail) {
        customerEmails.add(booking.customerEmail);
        if (!customerMap.has(booking.customerEmail)) {
          customerMap.set(booking.customerEmail, {
            email: booking.customerEmail,
            name: booking.customerName || booking.customerEmail,
            city: booking.city,
            county: booking.county,
            planName: booking.planName || "N/A",
          });
        }
      }
    });

    // Get customer details from users collection
    const customers = Array.from(customerMap.values());
    const customersWithDetails = await Promise.all(
      customers.map(async (customer) => {
        try {
          const usersQuery = query(
            collection(db, "users"),
            where("email", "==", customer.email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            return {
              ...customer,
              id: usersSnapshot.docs[0].id,
              name: userData.name || customer.name,
              city: userData.city || customer.city,
              county: userData.county || customer.county,
            };
          }
          return { ...customer, id: customer.email };
        } catch (err) {
          return { ...customer, id: customer.email };
        }
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithDetails,
    });
  } catch (error: any) {
    console.error("[Get Partner Customers] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
