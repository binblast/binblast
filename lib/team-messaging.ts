import { getAdminFirestore } from "@/lib/firebase-admin";

export type StaffRole = "employee" | "operator" | "admin" | "owner";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
  exists?: boolean;
}

type TeamMessage = Record<string, unknown> & {
  id: string;
  employeeId?: string;
  senderId?: string;
  from?: string;
  read?: boolean;
  message?: string;
  createdAt?: { toMillis?: () => number; toDate?: () => Date };
  employeeName?: string;
  employeeEmail?: string;
  senderName?: string;
  senderEmail?: string;
  recipientRole?: string;
};

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

function getDisplayName(data: Record<string, unknown>): string {
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";
  const email = typeof data.email === "string" ? data.email : "";
  const name = `${firstName} ${lastName}`.trim();
  return name || email || "Team Member";
}

function getConversationPartnerId(
  message: TeamMessage,
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
  const userDocs = usersSnapshot.docs as FirestoreDocument[];
  userDocs.forEach((doc) => {
    const data = doc.data();
    const role = (typeof data.role === "string" ? data.role : "employee") as StaffRole;
    if (!visibleRoles.includes(role)) return;
    if (excludeUserId && doc.id === excludeUserId) return;

    staffContacts.set(doc.id, {
      id: doc.id,
      type: role,
      employeeId: doc.id,
      employeeName: getDisplayName(data),
      employeeEmail: typeof data.email === "string" ? data.email : "",
      unreadCount: 0,
      messageCount: 0,
      hasConversation: false,
    });
  });

  const employeeMessagesSnapshot = await db.collection("employeeMessages").get();
  employeeMessagesSnapshot.docs.forEach((doc: FirestoreDocument) => {
    const data = doc.data();
    const recipientId = typeof data.employeeId === "string" ? data.employeeId : "";
    if (!recipientId) return;

    if (!staffContacts.has(recipientId)) {
      staffContacts.set(recipientId, {
        id: recipientId,
        type: (typeof data.recipientRole === "string" ? data.recipientRole : "employee") as StaffRole,
        employeeId: recipientId,
        employeeName:
          (typeof data.employeeName === "string" ? data.employeeName : "") ||
          (typeof data.employeeEmail === "string" ? data.employeeEmail : "") ||
          "Team Member",
        employeeEmail: typeof data.employeeEmail === "string" ? data.employeeEmail : "",
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

    const createdAt = data.createdAt as TeamMessage["createdAt"];
    if (
      !contact.lastMessageTime ||
      (createdAt?.toMillis?.() || 0) > (contact.lastMessageTime?.toMillis?.() || 0)
    ) {
      contact.lastMessage = typeof data.message === "string" ? data.message : "";
      contact.lastMessageTime = createdAt || null;
      contact.employeeName =
        (typeof data.employeeName === "string" ? data.employeeName : "") || contact.employeeName;
      contact.employeeEmail =
        (typeof data.employeeEmail === "string" ? data.employeeEmail : "") || contact.employeeEmail;
    }
  });

  const conversations: TeamConversation[] = Array.from(staffContacts.values());

  if (includePartners) {
    const partnerConversations = new Map<string, PartnerConversation>();
    const partnerMessagesSnapshot = await db.collection("partnerMessages").get();

    partnerMessagesSnapshot.docs.forEach((doc: FirestoreDocument) => {
      const data = doc.data();
      const partnerId = typeof data.partnerId === "string" ? data.partnerId : "";
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

      const createdAt = data.createdAt as TeamMessage["createdAt"];
      if (
        !conv.lastMessageTime ||
        (createdAt?.toMillis?.() || 0) > (conv.lastMessageTime?.toMillis?.() || 0)
      ) {
        conv.lastMessage = typeof data.message === "string" ? data.message : "";
        conv.lastMessageTime = createdAt || null;
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
            conv.partnerName =
              (typeof partnerData.businessName === "string" ? partnerData.businessName : "") ||
              (typeof partnerData.ownerName === "string" ? partnerData.ownerName : "") ||
              "";
            conv.partnerEmail = typeof partnerData.email === "string" ? partnerData.email : "";
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

  const messages = new Map<string, TeamMessage>();

  sentSnapshot.docs.forEach((doc: FirestoreDocument) => {
    messages.set(doc.id, { id: doc.id, ...doc.data() });
  });
  receivedSnapshot.docs.forEach((doc: FirestoreDocument) => {
    messages.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const sortedMessages = Array.from(messages.values()).sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  const userDocs = usersSnapshot.docs as FirestoreDocument[];
  const contacts: StaffContact[] = userDocs
    .map((doc): StaffContact | null => {
      const data = doc.data();
      const role = (typeof data.role === "string" ? data.role : "") as StaffRole;
      if (!["operator", "admin", "owner"].includes(role) || doc.id === employeeId) {
        return null;
      }

      return {
        id: doc.id,
        type: role,
        employeeId: doc.id,
        employeeName: getDisplayName(data),
        employeeEmail: typeof data.email === "string" ? data.email : "",
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
        employeeName:
          (typeof message.senderName === "string" ? message.senderName : "") ||
          (typeof message.employeeName === "string" ? message.employeeName : "") ||
          "Team Member",
        employeeEmail:
          (typeof message.senderEmail === "string" ? message.senderEmail : "") ||
          (typeof message.employeeEmail === "string" ? message.employeeEmail : "") ||
          "",
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
      conversation.lastMessage = typeof message.message === "string" ? message.message : "";
      conversation.lastMessageTime = message.createdAt || null;
    }
  });

  return {
    contacts: Array.from(conversations.values()).sort(compareByRecentThenName),
    messages: sortedMessages,
  };
}
