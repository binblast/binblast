import { getAdminFirestore } from "@/lib/firebase-admin";

export type StaffRole = "employee" | "operator" | "admin" | "owner";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
  exists?: boolean;
}

export type TeamMessage = Record<string, unknown> & {
  id: string;
  employeeId?: string;
  senderId?: string;
  from?: string;
  read?: boolean;
  message?: string;
  subject?: string;
  type?: string;
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

export function getThreadContactId(
  message: TeamMessage,
  viewerUserId: string,
  contactsById: Map<string, StaffContact>
): string | null {
  const recipientId = typeof message.employeeId === "string" ? message.employeeId : "";
  const senderId = typeof message.senderId === "string" ? message.senderId : "";

  if (senderId === viewerUserId) {
    return recipientId || null;
  }

  if (recipientId === viewerUserId) {
    if (senderId) return senderId;
    const fallback = Array.from(contactsById.values()).find((contact) => contact.type === message.from);
    return fallback?.id || null;
  }

  return null;
}

export function isMessageInThread(
  message: TeamMessage,
  viewerUserId: string,
  contactId: string,
  contactsById: Map<string, StaffContact>
): boolean {
  return getThreadContactId(message, viewerUserId, contactsById) === contactId;
}

export function sortMessagesChronologically(messages: TeamMessage[]): TeamMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return aTime - bTime;
  });
}

function compareByRecentThenName(a: TeamConversation, b: TeamConversation) {
  const aTime = a.lastMessageTime?.toMillis?.() || 0;
  const bTime = b.lastMessageTime?.toMillis?.() || 0;
  if (bTime !== aTime) return bTime - aTime;

  const aName = "employeeName" in a ? a.employeeName : a.partnerName || "";
  const bName = "employeeName" in b ? b.employeeName : b.partnerName || "";
  return aName.localeCompare(bName);
}

function applyMessageToContact(
  contact: StaffContact,
  message: TeamMessage,
  viewerUserId: string
) {
  contact.hasConversation = true;
  contact.messageCount += 1;

  const recipientId = typeof message.employeeId === "string" ? message.employeeId : "";
  const isIncoming = recipientId === viewerUserId;
  if (isIncoming && !message.read) {
    contact.unreadCount += 1;
  }

  const createdAt = message.createdAt;
  if (
    !contact.lastMessageTime ||
    (createdAt?.toMillis?.() || 0) > (contact.lastMessageTime?.toMillis?.() || 0)
  ) {
    contact.lastMessage = typeof message.message === "string" ? message.message : "";
    contact.lastMessageTime = createdAt || null;
  }
}

export async function getStaffContacts(options?: {
  includePartners?: boolean;
  visibleRoles?: StaffRole[];
  viewerUserId?: string;
}): Promise<TeamConversation[]> {
  const db = await getAdminFirestore();
  const includePartners = options?.includePartners ?? true;
  const visibleRoles = options?.visibleRoles ?? STAFF_ROLES;
  const viewerUserId = options?.viewerUserId;

  const staffContacts = new Map<string, StaffContact>();

  const usersSnapshot = await db.collection("users").get();
  const userDocs = usersSnapshot.docs as FirestoreDocument[];
  userDocs.forEach((doc) => {
    const data = doc.data();
    const role = (typeof data.role === "string" ? data.role : "employee") as StaffRole;
    if (!visibleRoles.includes(role)) return;
    if (viewerUserId && doc.id === viewerUserId) return;

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

  const contactsById = new Map(staffContacts);

  if (viewerUserId) {
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      db.collection("employeeMessages").where("senderId", "==", viewerUserId).get(),
      db.collection("employeeMessages").where("employeeId", "==", viewerUserId).get(),
    ]);

    const threadMessages = new Map<string, TeamMessage>();
    sentSnapshot.docs.forEach((doc: FirestoreDocument) => {
      threadMessages.set(doc.id, { id: doc.id, ...doc.data() });
    });
    receivedSnapshot.docs.forEach((doc: FirestoreDocument) => {
      threadMessages.set(doc.id, { id: doc.id, ...doc.data() });
    });

    threadMessages.forEach((message) => {
      const contactId = getThreadContactId(message, viewerUserId, contactsById);
      if (!contactId || contactId === viewerUserId) return;

      if (!staffContacts.has(contactId)) {
        staffContacts.set(contactId, {
          id: contactId,
          type: "employee",
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

      applyMessageToContact(staffContacts.get(contactId)!, message, viewerUserId);
    });
  } else {
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

      const createdAt = data.createdAt as TeamMessage["createdAt"];
      if (
        !contact.lastMessageTime ||
        (createdAt?.toMillis?.() || 0) > (contact.lastMessageTime?.toMillis?.() || 0)
      ) {
        contact.lastMessage = typeof data.message === "string" ? data.message : "";
        contact.lastMessageTime = createdAt || null;
      }
    });
  }

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

export async function getThreadMessages(viewerUserId: string, contactId: string) {
  const db = await getAdminFirestore();

  const usersSnapshot = await db.collection("users").get();
  const contactsById = new Map<string, StaffContact>();
  (usersSnapshot.docs as FirestoreDocument[]).forEach((doc) => {
    const data = doc.data();
    const role = (typeof data.role === "string" ? data.role : "employee") as StaffRole;
    contactsById.set(doc.id, {
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

  const [sentSnapshot, receivedSnapshot] = await Promise.all([
    db.collection("employeeMessages").where("senderId", "==", viewerUserId).get(),
    db.collection("employeeMessages").where("employeeId", "==", viewerUserId).get(),
  ]);

  const messageMap = new Map<string, TeamMessage>();
  sentSnapshot.docs.forEach((doc: FirestoreDocument) => {
    messageMap.set(doc.id, { id: doc.id, ...doc.data() });
  });
  receivedSnapshot.docs.forEach((doc: FirestoreDocument) => {
    messageMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  const threadMessages = Array.from(messageMap.values()).filter((message) =>
    isMessageInThread(message, viewerUserId, contactId, contactsById)
  );

  return sortMessagesChronologically(threadMessages);
}

export async function markThreadMessagesAsRead(
  viewerUserId: string,
  contactId: string
): Promise<void> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");

  const receivedSnapshot = await db
    .collection("employeeMessages")
    .where("employeeId", "==", viewerUserId)
    .get();

  const batch = db.batch();
  let hasUpdates = false;

  receivedSnapshot.docs.forEach((doc: FirestoreDocument) => {
    const data = doc.data();
    const senderId = typeof data.senderId === "string" ? data.senderId : "";
    if (senderId === contactId && !data.read) {
      batch.update(db.collection("employeeMessages").doc(doc.id), {
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
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

  const sortedMessages = sortMessagesChronologically(Array.from(messages.values()));

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
    const contactId = getThreadContactId(message, employeeId, contactsById);
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

    applyMessageToContact(conversations.get(contactId)!, message, employeeId);
  });

  return {
    contacts: Array.from(conversations.values()).sort(compareByRecentThenName),
    messages: sortedMessages,
  };
}
