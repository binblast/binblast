// components/EmployeeDashboard/TrainingModuleViewer.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface TrainingModuleViewerProps {
  moduleId: string;
  moduleName: string;
  pdfUrl?: string;
  pdfFileName?: string;
  onPdfViewed: () => void;
  onStartQuiz: () => void;
  pdfViewed: boolean;
}

// Simple Markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Lists - convert list items first, then wrap consecutive items in ul tags
    .replace(/^- (.*$)/gim, '<li>$1</li>');
  
  // Wrap consecutive list items in ul tags (using [\s\S] instead of . to match newlines in ES5)
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
  
  // Line breaks
  html = html
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');
  
  // Wrap in paragraphs
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, '');
  html = html.replace(/<p>(<[h|u])/gim, '$1');
  html = html.replace(/(<\/[h|u]>)<\/p>/gim, '$1');
  
  return html;
}

export function TrainingModuleViewer({
  moduleId,
  moduleName,
  pdfUrl,
  pdfFileName,
  onPdfViewed,
  onStartQuiz,
  pdfViewed,
}: TrainingModuleViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [viewed, setViewed] = useState(pdfViewed);
  const [loading, setLoading] = useState(true);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Fetch Markdown content as fallback
  useEffect(() => {
    const fetchMarkdownContent = async () => {
      try {
        const response = await fetch(`/api/employee/training/${moduleId}/content`);
        if (response.ok) {
          const data = await response.json();
          setMarkdownContent(data.content);
          // If no PDF URL, show Markdown immediately
          if (!pdfUrl) {
            setShowMarkdown(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching Markdown content:", err);
      }
    };
    
    fetchMarkdownContent();
  }, [moduleId, pdfUrl]);

  useEffect(() => {
    // Mark as viewed after a delay (user has had time to view)
    if (!viewed && (pdfLoaded || showMarkdown)) {
      const timer = setTimeout(() => {
        setViewed(true);
        onPdfViewed();
      }, 5000); // Mark as viewed after 5 seconds of viewing
      return () => clearTimeout(timer);
    }
  }, [pdfUrl, viewed, pdfLoaded, showMarkdown, onPdfViewed]);

  // Reset loading state when PDF URL changes and check if we should show Markdown
  useEffect(() => {
    if (pdfUrl) {
      // If PDF URL is a relative path (not Firebase Storage), it likely doesn't exist yet
      // Proactively show Markdown if available instead of trying to load non-existent PDF
      if (!pdfUrl.startsWith('http') && markdownContent) {
        // Relative path - PDF doesn't exist yet, show Markdown immediately
        setShowMarkdown(true);
        setPdfLoaded(false);
        setLoading(false);
        setError(null);
      } else {
        // Firebase Storage URL or absolute URL - try to load PDF
        setLoading(true);
        setError(null);
        setPdfLoaded(false);
        setShowMarkdown(false);
      }
    } else if (markdownContent) {
      // No PDF URL but we have Markdown - show it
      setShowMarkdown(true);
      setLoading(false);
      setPdfLoaded(false);
    }
  }, [pdfUrl, markdownContent]);

  const handleDownload = () => {
    if (pdfUrl) {
      // Try to open in new tab first, then fallback to download
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = pdfFileName || `${moduleId}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
    
    // Check if iframe content indicates an error (404 page)
    if (iframeRef.current?.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        const bodyText = iframeDoc?.body?.innerText || "";
        if (bodyText.includes("404") || bodyText.includes("not found") || bodyText.includes("could not be found")) {
          // PDF not found, show Markdown fallback if available
          if (markdownContent) {
            setShowMarkdown(true);
            setPdfLoaded(false);
            setError(null);
          } else {
            setError("The PDF file could not be found. Please contact support if this issue persists.");
            setPdfLoaded(false);
          }
        } else {
          // PDF loaded successfully
          setPdfLoaded(true);
          setShowMarkdown(false);
          setError(null);
        }
      } catch (e) {
        // Cross-origin restrictions may prevent access
        // If we have Markdown and PDF hasn't loaded after timeout, show Markdown
        const checkTimeout = setTimeout(() => {
          if (!pdfLoaded && markdownContent && !showMarkdown) {
            setShowMarkdown(true);
            setPdfLoaded(false);
            setError(null);
            setLoading(false);
          } else if (!showMarkdown) {
            // Assume PDF loaded if we can't check
            setPdfLoaded(true);
            setError(null);
            setLoading(false);
          }
        }, 3000);
        
        // Clean up timeout if component unmounts
        return () => clearTimeout(checkTimeout);
      }
    } else {
      // Can't access iframe, assume PDF loaded after delay
      setTimeout(() => {
        if (!showMarkdown && markdownContent) {
          // If we still haven't shown Markdown and PDF seems to not be loading, show Markdown
          setShowMarkdown(true);
          setPdfLoaded(false);
          setLoading(false);
        } else {
          setPdfLoaded(true);
          setLoading(false);
        }
      }, 2000);
    }
  };

  const handleIframeError = () => {
    setLoading(false);
    setPdfLoaded(false);
    // Show Markdown fallback if available
    if (markdownContent) {
      setShowMarkdown(true);
      setError(null);
    } else {
      setError("Failed to load PDF. The file may not be available. Please try downloading it instead or contact support.");
    }
  };

  const handleMarkViewed = () => {
    setViewed(true);
    onPdfViewed();
  };

  // If no PDF URL and no Markdown, show message
  if (!pdfUrl && !markdownContent && !loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#6b7280",
        }}
      >
        Training material not yet available for this module.
      </div>
    );
  }

  return (
    <div>
      {/* Header with Download Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {moduleName}
        </h3>
        <button
          onClick={handleDownload}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          📥 Download PDF
        </button>
      </div>

      {/* PDF Viewer or Markdown Content */}
      <div
        style={{
          border: "2px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#ffffff",
          marginBottom: "1rem",
          position: "relative",
        }}
      >
        {loading && !showMarkdown && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              padding: "1rem",
              background: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading PDF...</span>
          </div>
        )}
        {showMarkdown && markdownContent ? (
          <div
            style={{
              padding: "2rem",
              maxHeight: "calc(100vh - 300px)",
              minHeight: "700px",
              overflowY: "auto",
              lineHeight: "1.6",
              color: "#111827",
            }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(markdownContent) }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            style={{
              width: "100%",
              height: "calc(100vh - 300px)",
              minHeight: "700px",
              border: "none",
              display: loading && error ? "none" : "block",
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={moduleName}
            allow="fullscreen"
          />
        )}
      </div>

      {error && !showMarkdown && (
        <div
          style={{
            padding: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>⚠️ PDF Loading Error</div>
          <div style={{ fontSize: "0.875rem" }}>{error}</div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
            You can still try downloading the PDF using the button above, or contact support if the issue persists.
          </div>
        </div>
      )}
      {showMarkdown && (
        <div
          style={{
            padding: "0.75rem",
            background: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#1e40af",
            marginBottom: "1rem",
          }}
        >
          ℹ️ PDF not yet available. Displaying training content from Markdown.
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        {!viewed && (
          <button
            onClick={handleMarkViewed}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f3f4f6",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Mark as Viewed
          </button>
        )}
        <button
          onClick={onStartQuiz}
          disabled={!viewed}
          style={{
            padding: "0.75rem 1.5rem",
            background: viewed ? "#16a34a" : "#9ca3af",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: viewed ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => {
            if (viewed) {
              e.currentTarget.style.background = "#15803d";
            }
          }}
          onMouseOut={(e) => {
            if (viewed) {
              e.currentTarget.style.background = "#16a34a";
            }
          }}
        >
          {viewed ? "Take Quiz →" : "View PDF First"}
        </button>
      </div>

      {!viewed && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#92400e",
          }}
        >
          ⚠️ Please review the training material before taking the quiz.
        </div>
      )}
    </div>
  );
}

