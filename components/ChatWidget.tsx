// components/ChatWidget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  generateAssistantResponse,
  resolveQuickReplyAction,
} from "@/lib/chat-assistant";

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
        text:
          "Hi! I'm your Bin Blast Co. assistant — here to help you get started, manage your account, answer questions about pricing and service, and point you in the right direction.\n\nWhat can I help you with?",
        sender: "assistant",
        timestamp: new Date(),
        quickReplies: [
          "What are your prices?",
          "Schedule a cleaning",
          "How do I cancel?",
          "Contact support",
        ],
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

  const runQuickReply = (reply: string) => {
    const action = resolveQuickReplyAction(reply);

    if (action.type === "scroll") {
      setIsOpen(false);
      document.getElementById(action.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action.type === "navigate") {
      setIsOpen(false);
      window.location.href = action.href;
      return;
    }
    if (action.type === "call") {
      window.location.href = `tel:${action.tel}`;
      return;
    }
    handleSendMessage(action.text);
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
        const response = generateAssistantResponse(messageText);
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
            text: "Sorry, something went wrong on my end. Try again, or contact us at (470) 305-0823 or support@binblastco.com.",
            sender: "assistant",
            timestamp: new Date(),
            quickReplies: ["Contact support", "What are your prices?"],
          },
        ]);
      }
    }, getResponseDelay(messageText));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
                  Your on-site helper for pricing, booking, billing &amp; support.
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
                          onClick={() => runQuickReply(reply)}
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
              placeholder="Ask about pricing, booking, billing..."
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
