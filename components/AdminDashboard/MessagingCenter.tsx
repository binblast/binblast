// components/AdminDashboard/MessagingCenter.tsx
// Unified messaging center for admin/operator to message employees and partners

"use client";

import { useState, useEffect } from "react";

interface Conversation {
  id: string;
  type: "employee" | "partner";
  employeeId?: string;
  partnerId?: string;
  employeeName?: string;
  employeeEmail?: string;
  partnerName?: string;
  partnerEmail?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount: number;
  messageCount: number;
}

interface Message {
  id: string;
  message: string;
  subject?: string;
  type?: "praise" | "request" | "warning";
  from: string;
  read: boolean;
  createdAt: any;
}

interface MessagingCenterProps {
  userId: string;
}

export function MessagingCenter({ userId }: MessagingCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"praise" | "request" | "warning">("request");
  const [subject, setSubject] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation]);

  async function loadConversations() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/messages/conversations");
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
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
      const endpoint = selectedConversation.type === "employee"
        ? `/api/admin/employees/${selectedConversation.employeeId}/messages`
        : `/api/admin/partners/${selectedConversation.partnerId}/messages`;

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
      const endpoint = selectedConversation.type === "employee"
        ? `/api/admin/employees/${selectedConversation.employeeId}/messages`
        : `/api/admin/partners/${selectedConversation.partnerId}/messages`;

      const body = selectedConversation.type === "employee"
        ? { message: messageText.trim(), type: messageType, subject: subject.trim() || undefined }
        : { message: messageText.trim(), type: messageType };

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
        await loadConversations(); // Refresh to update unread counts
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

  const displayName = selectedConversation?.type === "employee"
    ? selectedConversation.employeeName || selectedConversation.employeeEmail || "Employee"
    : selectedConversation?.partnerName || selectedConversation?.partnerEmail || "Partner";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 200px)", gap: "1rem" }}>
      {/* Conversations List */}
      <div style={{ width: "300px", border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Messages</h2>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && conversations.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: "pointer",
                  background: selectedConversation?.id === conv.id ? "#eff6ff" : "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                      {conv.type === "employee"
                        ? conv.employeeName || conv.employeeEmail || "Employee"
                        : conv.partnerName || conv.partnerEmail || "Partner"}
                    </span>
                    <span style={{
                      fontSize: "0.75rem",
                      padding: "0.125rem 0.5rem",
                      borderRadius: "12px",
                      background: conv.type === "employee" ? "#dbeafe" : "#dcfce7",
                      color: conv.type === "employee" ? "#1e40af" : "#166534",
                    }}>
                      {conv.type === "employee" ? "Employee" : "Partner"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                    {conv.lastMessage?.substring(0, 50) || "No messages yet"}
                    {conv.lastMessage && conv.lastMessage.length > 50 ? "..." : ""}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {conv.lastMessageTime?.toDate?.()?.toLocaleString() || "N/A"}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span style={{
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
                  }}>
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
        {selectedConversation ? (
          <>
            <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>{displayName}</h3>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                {selectedConversation.type === "employee" ? selectedConversation.employeeEmail : selectedConversation.partnerEmail}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              {loading ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>No messages yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: "1rem",
                        background: msg.type === "praise" ? "#dcfce7" : msg.type === "warning" ? "#fee2e2" : "#e0e7ff",
                        borderRadius: "8px",
                        maxWidth: "80%",
                        alignSelf: msg.from === "admin" ? "flex-end" : "flex-start",
                      }}
                    >
                      {msg.subject && (
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                          {msg.subject}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: msg.type === "praise" ? "#16a34a" : msg.type === "warning" ? "#dc2626" : "#6366f1",
                        }}>
                          {msg.type?.toUpperCase() || "MESSAGE"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          {msg.createdAt?.toDate?.()?.toLocaleString() || "N/A"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.875rem" }}>{msg.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div style={{ padding: "1rem", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setMessageText("Good job this week 🔥");
                    setMessageType("praise");
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Good job this week 🔥
                </button>
                {selectedConversation.type === "employee" && (
                  <button
                    onClick={() => {
                      setMessageText("Please check your schedule for updates");
                      setMessageType("request");
                      setSubject("Schedule Update");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#e5e7eb",
                      color: "#111827",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    Schedule Update
                  </button>
                )}
                {selectedConversation.type === "partner" && (
                  <button
                    onClick={() => {
                      setMessageText("Reminder: proof photos required (inside + outside)");
                      setMessageType("request");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#e5e7eb",
                      color: "#111827",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    Reminder: proof photos required
                  </button>
                )}
                <button
                  onClick={() => {
                    setMessageText("Call us ASAP");
                    setMessageType("warning");
                    if (selectedConversation.type === "employee") {
                      setSubject("Urgent");
                    }
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Call us ASAP
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as "praise" | "request" | "warning")}
                  style={{
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="praise">Praise</option>
                  <option value="request">Request</option>
                  <option value="warning">Warning</option>
                </select>
                {selectedConversation.type === "employee" && (
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject (optional)"
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: !messageText.trim() || sending ? "#9ca3af" : "#0369a1",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: !messageText.trim() || sending ? "not-allowed" : "pointer",
                    alignSelf: "flex-end",
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
