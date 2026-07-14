// components/ChatWidget.tsx
"use client";

import { useState, useRef, useEffect } from "react";

const FALLBACK_PLANS = {
  "one-time": { id: "one-time", name: "Monthly Clean", price: 35, priceSuffix: "/month" },
  "twice-month": { id: "twice-month", name: "Bi-Weekly Clean (2x/Month)", price: 65, priceSuffix: "/month" },
  "bi-monthly": { id: "bi-monthly", name: "Bi-Monthly Plan – Yearly Package", price: 210, priceSuffix: "/year" },
  "quarterly": { id: "quarterly", name: "Quarterly Plan – Yearly Package", price: 160, priceSuffix: "/year" },
  "commercial": { id: "commercial", name: "Commercial & HOA Plans", price: 0, priceSuffix: "/month" },
};

function getPricingPlans() {
  return FALLBACK_PLANS;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  quickReplies?: string[];
}

function getResponseDelay(text: string): number {
  return Math.min(1200, Math.max(450, text.length * 18));
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQuickReply = (text: string) => {
    handleSendMessage(text);
  };

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    window.setTimeout(() => {
      try {
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
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "I apologize, but I encountered an error. Please try asking your question again or scroll down to our pricing section for more information.",
            sender: "assistant",
            timestamp: new Date(),
          },
        ]);
      }
    }, getResponseDelay(messageText));
  };

  const generateResponse = (userInput: string): { text: string; quickReplies?: string[] } => {
    try {
      const lowerInput = userInput.toLowerCase();

      if (
        lowerInput.includes("price") ||
        lowerInput.includes("cost") ||
        lowerInput.includes("how much") ||
        lowerInput.includes("pricing") ||
        lowerInput.includes("plan")
      ) {
        const PLAN_CONFIGS = getPricingPlans();
        const plans = Object.values(PLAN_CONFIGS);
        let response = "Here are our current pricing plans:\n\n";

        plans.forEach((plan: { id: string; name: string; price: number; priceSuffix: string }) => {
          if (plan.id === "commercial") {
            response += `• ${plan.name}: Custom Quote\n`;
          } else {
            response += `• ${plan.name}: $${plan.price}${plan.priceSuffix}\n`;
          }
        });

        response += "\nAdditional bins: +$10 each\n\n";
        response += "Would you like to book a cleaning now?";

        return {
          text: response,
          quickReplies: ["Schedule a cleaning", "How does it work?"],
        };
      }

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

  if (!mounted) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="chat-widget-fab"
          aria-label="Open Bin Blast Assistant"
        >
          <span className="chat-widget-fab__pulse" aria-hidden="true" />
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="chat-widget-panel" role="dialog" aria-label="Bin Blast Assistant chat">
          <header className="chat-widget-header">
            <div className="chat-widget-header__brand">
              <img
                src="/bin-blast-mascot.png"
                alt=""
                className="chat-widget-avatar"
                width={42}
                height={42}
              />
              <div>
                <h3 className="chat-widget-header__title">Bin Blast Assistant</h3>
                <p className="chat-widget-header__subtitle">
                  Ask about pricing, booking, or how our service works.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="chat-widget-close"
              aria-label="Close chat"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="chat-widget-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-widget-message chat-widget-message--${message.sender}`}
              >
                {message.sender === "assistant" && (
                  <img
                    src="/bin-blast-mascot.png"
                    alt=""
                    className="chat-widget-message__avatar"
                    width={30}
                    height={30}
                  />
                )}
                <div className="chat-widget-message__content">
                  <div className="chat-widget-bubble">{message.text}</div>
                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="chat-widget-quick-replies">
                      {message.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => {
                            if (reply.includes("pricing") || reply.includes("show me")) {
                              scrollToPricing();
                            } else {
                              handleQuickReply(reply);
                            }
                          }}
                          className="chat-widget-quick-btn"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-widget-typing" aria-live="polite" aria-label="Assistant is typing">
                <img
                  src="/bin-blast-mascot.png"
                  alt=""
                  className="chat-widget-message__avatar"
                  width={30}
                  height={30}
                />
                <div className="chat-widget-typing__bubble">
                  <span className="chat-widget-typing__dot" />
                  <span className="chat-widget-typing__dot" />
                  <span className="chat-widget-typing__dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-widget-compose">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="chat-widget-input"
              aria-label="Chat message"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="chat-widget-send"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
