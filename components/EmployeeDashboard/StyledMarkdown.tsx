// components/EmployeeDashboard/StyledMarkdown.tsx
// Enhanced markdown renderer with styled components, colors, and visual elements

"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { MarkdownCallout } from "./MarkdownCallout";

interface StyledMarkdownProps {
  content: string;
  moduleId?: string;
  moduleType?: string;
}

export function StyledMarkdown({ content, moduleId, moduleType }: StyledMarkdownProps) {
  // Custom components for react-markdown
  const components = {
    // Headings with brand colors and styling
    h1: ({ children }: any) => (
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "700",
          color: "#111827",
          marginTop: "2rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "3px solid #16a34a",
          lineHeight: "1.2",
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: "#1e40af",
          marginTop: "1.75rem",
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: "2px solid #bfdbfe",
          lineHeight: "1.3",
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          color: "#2563eb",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
          lineHeight: "1.4",
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4
        style={{
          fontSize: "1.125rem",
          fontWeight: "600",
          color: "#374151",
          marginTop: "1.25rem",
          marginBottom: "0.5rem",
          lineHeight: "1.4",
        }}
      >
        {children}
      </h4>
    ),

    // Paragraphs with better spacing
    p: ({ children }: any) => {
      // Check if this is a callout block
      const text = React.Children.toArray(children).join("");
      if (text.startsWith("> [!") || text.startsWith("> [!")) {
        return null; // Handled by blockquote
      }
      return (
        <p
          style={{
            fontSize: "1rem",
            lineHeight: "1.7",
            color: "#374151",
            marginBottom: "1rem",
            marginTop: "0",
          }}
        >
          {children}
        </p>
      );
    },

    // Lists with custom styling
    ul: ({ children }: any) => (
      <ul
        className="styled-markdown-ul"
        style={{
          marginLeft: "1.5rem",
          marginBottom: "1rem",
          marginTop: "0.5rem",
          paddingLeft: "0",
          listStyle: "none",
        }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol
        style={{
          marginLeft: "1.5rem",
          marginBottom: "1rem",
          marginTop: "0.5rem",
          paddingLeft: "1rem",
          counterReset: "list-counter",
        }}
      >
        {children}
      </ol>
    ),
    li: ({ children, className }: any) => {
      // Check if this is an ordered list item (ol) or unordered (ul)
      const isOrdered = className?.includes('task-list-item') === false && 
                       React.Children.toArray(children).some((child: any) => 
                         child?.props?.className?.includes('task-list-item')
                       ) === false;
      // Simple check: if parent is ol, it's ordered
      const isInOrderedList = false; // We'll handle this differently
      
      return (
        <li
          style={{
            marginBottom: "0.5rem",
            paddingLeft: "1.5rem",
            position: "relative",
            lineHeight: "1.6",
            color: "#374151",
            fontSize: "1rem",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "0",
              color: "#16a34a",
              fontWeight: "700",
              fontSize: "1.25rem",
            }}
          >
            •
          </span>
          <span style={{ display: "block", marginLeft: "0.5rem" }}>{children}</span>
        </li>
      );
    },

    // Strong/bold text
    strong: ({ children }: any) => (
      <strong
        style={{
          fontWeight: "700",
          color: "#111827",
        }}
      >
        {children}
      </strong>
    ),

    // Emphasis/italic
    em: ({ children }: any) => (
      <em
        style={{
          fontStyle: "italic",
          color: "#4b5563",
        }}
      >
        {children}
      </em>
    ),

    // Code blocks
    code: ({ inline, children }: any) => {
      if (inline) {
        return (
          <code
            style={{
              background: "#f3f4f6",
              padding: "0.125rem 0.375rem",
              borderRadius: "4px",
              fontSize: "0.875em",
              fontFamily: "monospace",
              color: "#dc2626",
              fontWeight: "600",
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            display: "block",
            background: "#1f2937",
            color: "#f9fafb",
            padding: "1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            overflowX: "auto",
            marginBottom: "1rem",
            lineHeight: "1.5",
          }}
        >
          {children}
        </code>
      );
    },

    pre: ({ children }: any) => (
      <pre
        style={{
          background: "#1f2937",
          padding: "1rem",
          borderRadius: "8px",
          overflowX: "auto",
          marginBottom: "1rem",
        }}
      >
        {children}
      </pre>
    ),

    // Blockquotes as callouts
    blockquote: ({ children }: any) => {
      const text = React.Children.toArray(children).join("");
      let calloutType: "info" | "warning" | "success" | "important" = "info";
      let title = "";

      // Parse callout syntax: > [!TYPE] Title
      const calloutMatch = text.match(/^\[!(\w+)\]\s*(.*?)$/m);
      if (calloutMatch) {
        const type = calloutMatch[1].toLowerCase();
        if (type === "warning" || type === "warn") calloutType = "warning";
        else if (type === "success" || type === "check") calloutType = "success";
        else if (type === "important" || type === "danger" || type === "error") calloutType = "important";
        title = calloutMatch[2] || type.charAt(0).toUpperCase() + type.slice(1);
      }

      // Extract content without the callout marker
      const content = text.replace(/^\[!(\w+)\]\s*(.*?)$/m, "").trim();

      return (
        <MarkdownCallout type={calloutType} title={title || undefined}>
          {content || children}
        </MarkdownCallout>
      );
    },

    // Horizontal rules as section dividers
    hr: () => (
      <hr
        style={{
          border: "none",
          borderTop: "2px solid #e5e7eb",
          margin: "2rem 0",
          borderRadius: "1px",
        }}
      />
    ),

    // Links
    a: ({ href, children }: any) => (
      <a
        href={href}
        style={{
          color: "#2563eb",
          textDecoration: "underline",
          fontWeight: "500",
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),

    // Tables
    table: ({ children }: any) => (
      <div
        style={{
          overflowX: "auto",
          marginBottom: "1.5rem",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead
        style={{
          background: "#f9fafb",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th
        style={{
          padding: "0.75rem 1rem",
          textAlign: "left",
          fontWeight: "600",
          color: "#111827",
          fontSize: "0.875rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          color: "#374151",
          fontSize: "0.9375rem",
        }}
      >
        {children}
      </td>
    ),
  };

  return (
    <div
      style={{
        maxWidth: "100%",
        color: "#111827",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
