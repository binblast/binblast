// components/AdminDashboard/MessagingCenter.tsx
// Unified messaging center for team communication

"use client";

import { useState, useEffect, useMemo } from "react";

type ConversationType = "employee" | "operator" | "admin" | "owner" | "partner";
type MessageType = "praise" | "request" | "warning" | "general";
type PortalMode = "staff" | "employee";
type ContactFilter = "all" | "employees" | "operators" | "management" | "partners";

interface Conversation {
  id: string;
  type: ConversationType;
  employeeId?: string;
  partnerId?: string;
  employeeName?: string;
  employeeEmail?: string;
  partnerName?: string;
  partnerEmail?: string;
  lastMessage?: string;
  lastMessageTime?: { toDate?: () => Date };
  unreadCount: number;
  messageCount: number;
  hasConversation?: boolean;
}

interface Message {
  id: string;
  message: string;
  subject?: string;
  type?: MessageType;
  from: string;
  senderId?: string;
  employeeId?: string;
  read: boolean;
  createdAt?: { toDate?: () => Date };
}

interface MessagingCenterProps {
  userId: string;
  mode?: PortalMode;
}

function getRoleLabel(type: ConversationType) {
  switch (type) {
    case "employee":
      return "Employee";
    case "operator":
      return "Operator";
    case "admin":
      return "Admin";
    case "owner":
      return "Owner";
    default:
      return "Partner";
  }
}

function getRoleBadgeStyle(type: ConversationType) {
  switch (type) {
    case "employee":
      return { background: "#dbeafe", color: "#1e40af" };
    case "operator":
      return { background: "#ede9fe", color: "#5b21b6" };
    case "admin":
    case "owner":
      return { background: "#fef3c7", color: "#92400e" };
    default:
      return { background: "#dcfce7", color: "#166534" };
  }
}

function useIsMobile(breakpoint = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function MessagingCenter({ userId, mode = "staff" }: MessagingCenterProps) {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("request");
  const [subject, setSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>(
    mode === "employee" ? "management" : "all"
  );

  useEffect(() => {
    loadConversations();
  }, [mode, userId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedConversation, mode, userId]);

  async function loadConversations() {
    try {
      setLoading(true);
      const endpoint =
        mode === "employee"
          ? `/api/employee/messages?employeeId=${encodeURIComponent(userId)}`
          : `/api/admin/messages/conversations?viewerUserId=${encodeURIComponent(userId)}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setConversations(data.contacts || data.conversations || []);
      } else {
        console.error("Failed to load conversations:", data.error);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    if (!selectedConversation) return;

    try {
      setLoading(true);
      let endpoint = "";

      if (mode === "employee") {
        const contactId = selectedConversation.employeeId || selectedConversation.id;
        endpoint = `/api/employee/messages?employeeId=${encodeURIComponent(userId)}&contactId=${encodeURIComponent(contactId)}`;
      } else if (selectedConversation.type === "partner") {
        endpoint = `/api/admin/partners/${selectedConversation.partnerId}/messages`;
      } else {
        const contactId = selectedConversation.employeeId || selectedConversation.id;
        endpoint = `/api/admin/employees/${contactId}/messages?viewerUserId=${encodeURIComponent(userId)}&contactId=${encodeURIComponent(contactId)}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      } else {
        console.error("Failed to load messages:", data.error);
        alert(`Failed to load messages: ${data.error}`);
      }
    } catch (error: any) {
      console.error("Error loading messages:", error);
      alert(`Error loading messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      setSending(true);
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (mode === "employee") {
        endpoint = "/api/employee/messages";
        body = {
          employeeId: userId,
          recipientId: selectedConversation.employeeId || selectedConversation.id,
          message: messageText.trim(),
          subject: subject.trim() || undefined,
        };
      } else if (selectedConversation.type === "partner") {
        endpoint = `/api/admin/partners/${selectedConversation.partnerId}/messages`;
        body = { message: messageText.trim(), type: messageType };
      } else {
        endpoint = `/api/admin/employees/${selectedConversation.employeeId}/messages`;
        body = {
          message: messageText.trim(),
          type: messageType,
          subject: subject.trim() || undefined,
          senderId: userId,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        setMessageText("");
        setSubject("");
        await loadMessages();
        await loadConversations();
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error: any) {
      console.error("[Send Message] Error:", error);
      alert(`Failed to send message: ${error.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conv) => {
      const name =
        conv.type === "partner"
          ? conv.partnerName || conv.partnerEmail || ""
          : conv.employeeName || conv.employeeEmail || "";
      const email = conv.type === "partner" ? conv.partnerEmail || "" : conv.employeeEmail || "";

      if (query && !name.toLowerCase().includes(query) && !email.toLowerCase().includes(query)) {
        return false;
      }

      if (mode === "employee") {
        return conv.type === "operator" || conv.type === "admin" || conv.type === "owner";
      }

      if (contactFilter === "employees") return conv.type === "employee";
      if (contactFilter === "operators") return conv.type === "operator";
      if (contactFilter === "management") return conv.type === "admin" || conv.type === "owner";
      if (contactFilter === "partners") return conv.type === "partner";
      return true;
    });
  }, [conversations, contactFilter, mode, searchQuery]);

  const displayName = selectedConversation
    ? selectedConversation.type === "partner"
      ? selectedConversation.partnerName || selectedConversation.partnerEmail || "Partner"
      : selectedConversation.employeeName || selectedConversation.employeeEmail || "Team Member"
    : "";

  const isStaffToStaff =
    mode === "staff" &&
    selectedConversation &&
    selectedConversation.type !== "partner";

  const isEmployeePortal = mode === "employee";

  const centerClassName = [
    "messaging-center",
    isMobile && selectedConversation ? "messaging-center--thread-open" : "",
    isMobile && !selectedConversation ? "messaging-center--list-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={centerClassName}>
      <div className="messaging-sidebar">
        <div className="messaging-sidebar-header">
          <h2 className="messaging-sidebar-title">
            {mode === "employee" ? "Team Messages" : "Messages"}
          </h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members..."
            className="messaging-search"
          />
          {mode === "staff" && (
            <div className="messaging-filters">
              {(["all", "employees", "operators", "management", "partners"] as ContactFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setContactFilter(filter)}
                  className="messaging-filter-btn"
                  style={{
                    background: contactFilter === filter ? "#16a34a" : "#ffffff",
                    color: contactFilter === filter ? "#ffffff" : "#374151",
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="messaging-conversation-list">
          {loading && filteredConversations.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading team...</div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              {mode === "employee" ? "No operators available to message" : "No team members found"}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const name =
                conv.type === "partner"
                  ? conv.partnerName || conv.partnerEmail || "Partner"
                  : conv.employeeName || conv.employeeEmail || "Team Member";

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="messaging-conversation-item"
                  style={{
                    background: selectedConversation?.id === conv.id ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "12px",
                          flexShrink: 0,
                          ...getRoleBadgeStyle(conv.type),
                        }}
                      >
                        {getRoleLabel(conv.type)}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.hasConversation
                        ? `${conv.lastMessage?.substring(0, 50) || "No messages yet"}${conv.lastMessage && conv.lastMessage.length > 50 ? "..." : ""}`
                        : "Start a conversation"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      {conv.lastMessageTime?.toDate?.()?.toLocaleString() || conv.employeeEmail || conv.partnerEmail || ""}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span
                      style={{
                        background: "#dc2626",
                        color: "#ffffff",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        flexShrink: 0,
                      }}
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="messaging-thread">
        {selectedConversation ? (
          <>
            <div className="messaging-thread-header">
              {isMobile && (
                <button
                  type="button"
                  className="messaging-back-btn"
                  onClick={() => setSelectedConversation(null)}
                >
                  ← Back to conversations
                </button>
              )}
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>{displayName}</h3>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                {selectedConversation.type === "partner"
                  ? selectedConversation.partnerEmail
                  : selectedConversation.employeeEmail}
              </div>
            </div>

            <div className="messaging-messages">
              {loading ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>
                  No messages yet. Send the first message below.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {messages.map((msg) => {
                    const recipientId = (msg as Message & { employeeId?: string }).employeeId;
                    const isMine =
                      msg.senderId === userId ||
                      (mode === "staff" &&
                        !msg.senderId &&
                        msg.from !== "employee" &&
                        recipientId === (selectedConversation.employeeId || selectedConversation.id));

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          className="messaging-bubble"
                          style={{
                            background: isMine ? "#16a34a" : "#f3f4f6",
                            color: isMine ? "#ffffff" : "#111827",
                            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          }}
                        >
                          <div>{msg.message}</div>
                          <div
                            style={{
                              fontSize: "0.6875rem",
                              marginTop: "0.35rem",
                              opacity: 0.75,
                              textAlign: isMine ? "right" : "left",
                            }}
                          >
                            {msg.createdAt?.toDate?.()?.toLocaleString() || ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="messaging-compose">
              {isStaffToStaff && (
                <div className="messaging-quick-actions">
                  <button
                    type="button"
                    className="messaging-quick-btn"
                    onClick={() => {
                      setMessageText("Good job this week");
                      setMessageType("praise");
                    }}
                  >
                    Good job this week
                  </button>
                  {selectedConversation.type === "employee" && (
                    <button
                      type="button"
                      className="messaging-quick-btn"
                      onClick={() => {
                        setMessageText("Please check your schedule for updates");
                        setMessageType("request");
                        setSubject("Schedule Update");
                      }}
                    >
                      Schedule Update
                    </button>
                  )}
                </div>
              )}

              <div className="messaging-compose-meta">
                {isStaffToStaff && (
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as MessageType)}
                  >
                    <option value="praise">Praise</option>
                    <option value="request">Request</option>
                    <option value="warning">Warning</option>
                  </select>
                )}
                {(isStaffToStaff || isEmployeePortal) && (
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject (optional)"
                  />
                )}
              </div>

              <div className="messaging-compose-row">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    mode === "employee"
                      ? "Message your operator or management team..."
                      : "Type your message..."
                  }
                  rows={3}
                />
                <button
                  type="button"
                  className="messaging-send-btn"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  style={{
                    background: !messageText.trim() || sending ? "#9ca3af" : "#0369a1",
                    cursor: !messageText.trim() || sending ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280", padding: "1rem", textAlign: "center" }}>
            {mode === "employee"
              ? "Select an operator or manager to start messaging"
              : "Select an employee, operator, or partner to start messaging"}
          </div>
        )}
      </div>
    </div>
  );
}
