import { getAdminFirestore } from "@/lib/firebase-admin";

export type StaffRole = "employee" | "operator" | "admin" | "owner";

export interface StaffContact {
  id: string;
  type: StaffRole;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  lastMessage?: string;
  lastMessageTime?: { toMillis?: () => number; toDate?: () => Date } | null;
  unreadCount: number;
  messageCount: number;
  hasConversation: boolean;
}

export interface PartnerConversation {
  id: string;
  type: "partner";
  partnerId: string;
  partnerName?: string;
  partnerEmail?: string;
  lastMessage?: string;
  lastMessageTime?: { toMillis?: () => number; toDate?: () => Date } | null;
  unreadCount: number;
  messageCount: number;
  hasConversation: boolean;
}

export type TeamConversation = StaffContact | PartnerConversation;

const STAFF_ROLES: StaffRole[] = ["employee", "operator", "admin", "owner"];

function getDisplayName(data: Record<string, any>): string {
  const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  return name || data.email || "Team Member";
}

function getConversationPartnerId(
  message: Record<string, any>,
  currentUserId: string,
  contactsById: Map<string, StaffContact>
): string | null {
  if (message.senderId === currentUserId) {
    return message.employeeId || null;
  }

  if (message.employeeId === currentUserId) {
    if (message.senderId) return message.senderId;
    const fallback = Array.from(contactsById.values()).find((contact) => contact.type === message.from);
    return fallback?.id || null;
  }

  return null;
}

function compareByRecentThenName(a: TeamConversation, b: TeamConversation) {
  const aTime = a.lastMessageTime?.toMillis?.() || 0;
  const bTime = b.lastMessageTime?.toMillis?.() || 0;
  if (bTime !== aTime) return bTime - aTime;

  const aName = "employeeName" in a ? a.employeeName : a.partnerName || "";
  const bName = "employeeName" in b ? b.employeeName : b.partnerName || "";
  return aName.localeCompare(bName);
}

export async function getStaffContacts(options?: {
  includePartners?: boolean;
  visibleRoles?: StaffRole[];
  excludeUserId?: string;
}): Promise<TeamConversation[]> {
  const db = await getAdminFirestore();
  const includePartners = options?.includePartners ?? true;
  const visibleRoles = options?.visibleRoles ?? STAFF_ROLES;
  const excludeUserId = options?.excludeUserId;

  const staffContacts = new Map<string, StaffContact>();

  const usersSnapshot = await db.collection("users").get();
  usersSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const role = (data.role || "employee") as StaffRole;
    if (!visibleRoles.includes(role)) return;
    if (excludeUserId && doc.id === excludeUserId) return;

    staffContacts.set(doc.id, {
      id: doc.id,
      type: role,
      employeeId: doc.id,
      employeeName: getDisplayName(data),
      employeeEmail: data.email || "",
      unreadCount: 0,
      messageCount: 0,
      hasConversation: false,
    });
  });

  const employeeMessagesSnapshot = await db.collection("employeeMessages").get();
  employeeMessagesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const recipientId = data.employeeId;
    if (!recipientId) return;

    if (!staffContacts.has(recipientId)) {
      staffContacts.set(recipientId, {
        id: recipientId,
        type: (data.recipientRole as StaffRole) || "employee",
        employeeId: recipientId,
        employeeName: data.employeeName || data.employeeEmail || "Team Member",
        employeeEmail: data.employeeEmail || "",
        unreadCount: 0,
        messageCount: 0,
        hasConversation: false,
      });
    }

    const contact = staffContacts.get(recipientId)!;
    contact.hasConversation = true;
    contact.messageCount += 1;
    if (!data.read && data.from !== "employee") {
      contact.unreadCount += 1;
    }

    if (
      !contact.lastMessageTime ||
      (data.createdAt?.toMillis?.() || 0) > (contact.lastMessageTime?.toMillis?.() || 0)
    ) {
      contact.lastMessage = data.message;
      contact.lastMessageTime = data.createdAt || null;
      contact.employeeName = data.employeeName || contact.employeeName;
      contact.employeeEmail = data.employeeEmail || contact.employeeEmail;
    }
  });

  const conversations: TeamConversation[] = Array.from(staffContacts.values());

  if (includePartners) {
    const partnerConversations = new Map<string, PartnerConversation>();
    const partnerMessagesSnapshot = await db.collection("partnerMessages").get();

    partnerMessagesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const partnerId = data.partnerId;
      if (!partnerId) return;

      if (!partnerConversations.has(partnerId)) {
        partnerConversations.set(partnerId, {
          id: partnerId,
          type: "partner",
          partnerId,
          unreadCount: 0,
          messageCount: 0,
          hasConversation: true,
        });
      }

      const conv = partnerConversations.get(partnerId)!;
      conv.messageCount += 1;
      if (!data.read) conv.unreadCount += 1;

      if (
        !conv.lastMessageTime ||
        (data.createdAt?.toMillis?.() || 0) > (conv.lastMessageTime?.toMillis?.() || 0)
      ) {
        conv.lastMessage = data.message;
        conv.lastMessageTime = data.createdAt || null;
      }
    });

    const partnerIds = Array.from(partnerConversations.keys());
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

    conversations.push(...Array.from(partnerConversations.values()));
  }

  return conversations.sort(compareByRecentThenName);
}

export async function getEmployeeMessagingData(employeeId: string) {
  const db = await getAdminFirestore();

  const [sentSnapshot, receivedSnapshot, usersSnapshot] = await Promise.all([
    db.collection("employeeMessages").where("senderId", "==", employeeId).get(),
    db.collection("employeeMessages").where("employeeId", "==", employeeId).get(),
    db.collection("users").get(),
  ]);

  const messages = new Map<string, FirebaseFirestore.DocumentData & { id: string }>();

  sentSnapshot.docs.forEach((doc) => {
    messages.set(doc.id, { id: doc.id, ...doc.data() });
  });
  receivedSnapshot.docs.forEach((doc) => {
    messages.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const sortedMessages = Array.from(messages.values()).sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  const contacts: StaffContact[] = usersSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const role = (data.role || "") as StaffRole;
      if (!["operator", "admin", "owner"].includes(role) || doc.id === employeeId) {
        return null;
      }

      return {
        id: doc.id,
        type: role,
        employeeId: doc.id,
        employeeName: getDisplayName(data),
        employeeEmail: data.email || "",
        unreadCount: 0,
        messageCount: 0,
        hasConversation: false,
      } satisfies StaffContact;
    })
    .filter((contact): contact is StaffContact => contact !== null)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const conversations = new Map<string, StaffContact>();
  contacts.forEach((contact) => conversations.set(contact.id, { ...contact }));

  sortedMessages.forEach((message) => {
    const contactId = getConversationPartnerId(message, employeeId, contactsById);
    if (!contactId || contactId === employeeId) return;

    if (!conversations.has(contactId)) {
      const contact = contactsById.get(contactId);
      conversations.set(contactId, contact || {
        id: contactId,
        type: "operator",
        employeeId: contactId,
        employeeName: message.senderName || message.employeeName || "Team Member",
        employeeEmail: message.senderEmail || message.employeeEmail || "",
        unreadCount: 0,
        messageCount: 0,
        hasConversation: true,
      });
    }

    const conversation = conversations.get(contactId)!;
    conversation.hasConversation = true;
    conversation.messageCount += 1;

    const isIncoming = message.employeeId === employeeId && message.from !== "employee";
    if (isIncoming && !message.read) {
      conversation.unreadCount += 1;
    }

    if (
      !conversation.lastMessageTime ||
      (message.createdAt?.toMillis?.() || 0) > (conversation.lastMessageTime?.toMillis?.() || 0)
    ) {
      conversation.lastMessage = message.message;
      conversation.lastMessageTime = message.createdAt || null;
    }
  });

  return {
    contacts: Array.from(conversations.values()).sort(compareByRecentThenName),
    messages: sortedMessages,
  };
}
