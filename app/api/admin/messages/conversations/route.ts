// app/api/admin/messages/conversations/route.ts
// Get all conversations (employees and partners) for admin/operator

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminFirestore();

    // Get all employee messages grouped by employee
    // Query without orderBy to avoid index requirement, sort in memory instead
    const employeeMessagesSnapshot = await db
      .collection("employeeMessages")
      .get();

    // Get all partner messages grouped by partner
    // Query without orderBy to avoid index requirement, sort in memory instead
    const partnerMessagesSnapshot = await db
      .collection("partnerMessages")
      .get();

    // Group employee messages by employeeId
    const employeeConversations = new Map<string, any>();
    employeeMessagesSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const employeeId = data.employeeId;
      
      if (!employeeConversations.has(employeeId)) {
        employeeConversations.set(employeeId, {
          id: employeeId,
          type: "employee",
          employeeId,
          employeeEmail: data.employeeEmail || "",
          employeeName: data.employeeName || "",
          lastMessage: data.message,
          lastMessageTime: data.createdAt,
          unreadCount: 0,
          messageCount: 0,
        });
      }
      
      const conv = employeeConversations.get(employeeId);
      conv.messageCount++;
      if (!data.read) {
        conv.unreadCount++;
      }
      
      // Update last message if this is more recent
      if (!conv.lastMessageTime || (data.createdAt && data.createdAt.toMillis && data.createdAt.toMillis() > conv.lastMessageTime.toMillis())) {
        conv.lastMessage = data.message;
        conv.lastMessageTime = data.createdAt;
      }
    });

    // Group partner messages by partnerId
    const partnerConversations = new Map<string, any>();
    partnerMessagesSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const partnerId = data.partnerId;
      
      if (!partnerConversations.has(partnerId)) {
        partnerConversations.set(partnerId, {
          id: partnerId,
          type: "partner",
          partnerId,
          lastMessage: data.message,
          lastMessageTime: data.createdAt,
          unreadCount: 0,
          messageCount: 0,
        });
      }
      
      const conv = partnerConversations.get(partnerId);
      conv.messageCount++;
      if (!data.read) {
        conv.unreadCount++;
      }
      
      // Update last message if this is more recent
      if (!conv.lastMessageTime || (data.createdAt && data.createdAt.toMillis && data.createdAt.toMillis() > conv.lastMessageTime.toMillis())) {
        conv.lastMessage = data.message;
        conv.lastMessageTime = data.createdAt;
      }
    });

    // Get partner names - fetch individually since Firestore 'in' queries have limitations
    const partnerIds = Array.from(partnerConversations.keys());
    if (partnerIds.length > 0) {
      // Fetch partners individually to avoid 'in' query limitations
      for (const partnerId of partnerIds) {
        try {
          const partnerDoc = await db.collection("partners").doc(partnerId).get();
          if (partnerDoc.exists) {
            const partnerData = partnerDoc.data();
            const conv = partnerConversations.get(partnerId);
            if (conv && partnerData) {
              conv.partnerName = partnerData.businessName || partnerData.ownerName || "";
              conv.partnerEmail = partnerData.email || "";
            }
          }
        } catch (error) {
          console.error(`Error fetching partner ${partnerId}:`, error);
        }
      }
    }

    // Combine and sort by last message time
    const allConversations = [
      ...Array.from(employeeConversations.values()),
      ...Array.from(partnerConversations.values()),
    ].sort((a, b) => {
      const aTime = a.lastMessageTime?.toMillis?.() || 0;
      const bTime = b.lastMessageTime?.toMillis?.() || 0;
      return bTime - aTime; // Most recent first
    });

    return NextResponse.json({
      success: true,
      conversations: allConversations,
    });
  } catch (error: any) {
    console.error("[Get Conversations] Error:", error);
    
    let errorMessage = error.message || "Failed to fetch conversations";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
