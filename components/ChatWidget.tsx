// components/ChatWidget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  quickReplies?: string[];
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        text: "Hi! I'm the Bin Blast Assistant. I can help with pricing, booking, and explaining how our bin cleaning works. What can I help you with today?",
        sender: "assistant",
        timestamp: new Date(),
        quickReplies: ["What are your prices?", "Schedule a cleaning", "How does it work?"],
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleQuickReply = (text: string) => {
    handleSendMessage(text);
  };

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate typing delay, then generate response
    setTimeout(() => {
      try {
        // Generate response
        const response = generateResponse(messageText);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.text,
          sender: "assistant",
          timestamp: new Date(),
          quickReplies: response.quickReplies,
        };

        setIsTyping(false);
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error generating response:", error);
        setIsTyping(false);
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          text: "I apologize, but I encountered an error. Please try asking your question again or scroll down to our pricing section for more information.",
          sender: "assistant",
          timestamp: new Date(),
        }]);
      }
    }, 500);
  };

  const generateResponse = (userInput: string): { text: string; quickReplies?: string[] } => {
    try {
      const lowerInput = userInput.toLowerCase();

      // Pricing questions
      if (
        lowerInput.includes("price") ||
        lowerInput.includes("cost") ||
        lowerInput.includes("how much") ||
        lowerInput.includes("pricing") ||
        lowerInput.includes("plan")
      ) {
        const plans = Object.values(PLAN_CONFIGS || {});
        let response = "Here are our current pricing plans:\n\n";
        
        if (plans.length > 0) {
          plans.forEach((plan) => {
            if (plan.id === "commercial") {
              response += `• ${plan.name}: Custom Quote\n`;
            } else {
              response += `• ${plan.name}: $${plan.price}${plan.priceSuffix}\n`;
            }
          });
        } else {
          response += "• Monthly Clean: $35/month\n";
          response += "• Bi-Weekly Clean (2x/Month): $65/month\n";
          response += "• Bi-Monthly Plan – Yearly Package: $210/year\n";
          response += "• Quarterly Plan – Yearly Package: $160/year\n";
          response += "• Commercial & HOA Plans: Custom Quote\n";
        }
        
        response += "\nAdditional bins: +$10 each\n\n";
        response += "Would you like to book a cleaning now?";

        return {
          text: response,
          quickReplies: ["Schedule a cleaning", "How does it work?"],
        };
      }

    // Booking questions
    if (
      lowerInput.includes("book") ||
      lowerInput.includes("schedule") ||
      lowerInput.includes("sign up") ||
      lowerInput.includes("start") ||
      lowerInput.includes("get started")
    ) {
      return {
        text: "Great! To schedule a cleaning, you can:\n\n1. Scroll down to our pricing section and select a plan\n2. Click 'Book Now' or 'Get Started' to begin\n3. Choose your service type (one-time or subscription)\n4. Select your trash day and confirm your address\n\nWould you like me to scroll you to the booking section?",
        quickReplies: ["Yes, show me pricing", "How does it work?"],
      };
    }

    // Process questions
    if (
      lowerInput.includes("how") ||
      lowerInput.includes("work") ||
      lowerInput.includes("process") ||
      lowerInput.includes("what do you do")
    ) {
      return {
        text: "Here's how our bin cleaning process works:\n\n1. You leave your bins out on your normal trash day\n2. Our truck arrives and high-pressure cleans, sanitizes, and deodorizes your bins\n3. We place them back at your curb or driveway once they're fresh and clean\n4. For subscribers, we return automatically on your scheduled frequency\n\nIt's that simple! Would you like to schedule a cleaning?",
        quickReplies: ["Schedule a cleaning", "What are your prices?"],
      };
    }

    // Availability questions
    if (
      lowerInput.includes("available") ||
      lowerInput.includes("when") ||
      lowerInput.includes("date") ||
      lowerInput.includes("next")
    ) {
      return {
        text: "We typically can schedule within 2-3 business days. For exact dates, please start a booking and choose the day that works best for you. Our booking system will show you available dates based on your location and trash day.\n\nWould you like to check availability now?",
        quickReplies: ["Schedule a cleaning", "What are your prices?"],
      };
    }

    // Default response
    return {
      text: "I can help you with:\n\n• Pricing information\n• Scheduling a cleaning\n• Understanding how our service works\n• Checking availability\n\nWhat would you like to know?",
      quickReplies: ["What are your prices?", "Schedule a cleaning", "How does it work?"],
    };
    } catch (error) {
      console.error("Error in generateResponse:", error);
      return {
        text: "I apologize, but I encountered an error processing your question. Please try asking again or scroll down to our pricing section for more information.",
        quickReplies: ["What are your prices?", "Schedule a cleaning"],
      };
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToPricing = () => {
    setIsOpen(false);
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            zIndex: 1000,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
          }}
          aria-label="Open chat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "380px",
            maxWidth: "calc(100vw - 48px)",
            height: "600px",
            maxHeight: "calc(100vh - 48px)",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1001,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.25rem",
              borderBottom: "1px solid #e5e7eb",
              background: "#16a34a",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "600" }}>
                Bin Blast Assistant
              </h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.9 }}>
                Ask about pricing, booking, or how our service works.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close chat"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: message.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    background: message.sender === "user" ? "#16a34a" : "#f3f4f6",
                    color: message.sender === "user" ? "#ffffff" : "#111827",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.text}
                </div>
                {message.quickReplies && message.quickReplies.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginTop: "0.75rem",
                      width: "100%",
                    }}
                  >
                    {message.quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (reply.includes("pricing") || reply.includes("show me")) {
                            scrollToPricing();
                          } else {
                            handleQuickReply(reply);
                          }
                        }}
                        style={{
                          padding: "0.625rem 1rem",
                          background: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "0.875rem",
                          color: "#111827",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#16a34a";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                  padding: "0.75rem 1rem",
                }}
              >
                <div
                  className="chat-typing-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#9ca3af",
                  }}
                />
                <div
                  className="chat-typing-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#9ca3af",
                    animationDelay: "0.2s",
                  }}
                />
                <div
                  className="chat-typing-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#9ca3af",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "1rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#16a34a";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              style={{
                padding: "0.75rem 1.25rem",
                background: inputValue.trim() ? "#16a34a" : "#d1d5db",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: inputValue.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

    </>
  );
}

