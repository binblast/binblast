// lib/training-pdf-template.ts
// HTML template for generating styled PDFs from markdown content

export interface PDFTemplateOptions {
  title: string;
  moduleId: string;
  content: string; // HTML content (rendered from markdown)
  brandColor?: string;
}

export function generatePDFHTML({ title, moduleId, content, brandColor = "#16a34a" }: PDFTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Bin Blast Co.</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin: 0.75in;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.7;
      color: #374151;
      font-size: 11pt;
    }
    
    /* Header */
    .header {
      border-bottom: 3px solid ${brandColor};
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.25rem;
    }
    
    .header .subtitle {
      font-size: 10pt;
      color: #6b7280;
    }
    
    /* Footer */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 0.75in;
      border-top: 2px solid #e5e7eb;
      padding-top: 0.25rem;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
      background: white;
    }
    
    .footer .page-number {
      margin-top: 0.25rem;
    }
    
    /* Content */
    .content {
      padding-bottom: 1in;
    }
    
    /* Headings */
    h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #111827;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid ${brandColor};
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 16pt;
      font-weight: 600;
      color: #1e40af;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      padding-bottom: 0.375rem;
      border-bottom: 2px solid #bfdbfe;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #2563eb;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      page-break-after: avoid;
    }
    
    h4 {
      font-size: 12pt;
      font-weight: 600;
      color: #374151;
      margin-top: 0.75rem;
      margin-bottom: 0.375rem;
      page-break-after: avoid;
    }
    
    /* Paragraphs */
    p {
      margin-bottom: 0.75rem;
      line-height: 1.7;
      color: #374151;
    }
    
    /* Lists */
    ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 0.75rem;
      margin-top: 0.5rem;
    }
    
    ul {
      list-style: none;
      padding-left: 0;
    }
    
    ul li {
      margin-bottom: 0.375rem;
      padding-left: 1.25rem;
      position: relative;
      line-height: 1.6;
    }
    
    ul li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: ${brandColor};
      font-weight: 700;
      font-size: 14pt;
    }
    
    ol li {
      margin-bottom: 0.375rem;
      line-height: 1.6;
    }
    
    /* Strong and emphasis */
    strong {
      font-weight: 700;
      color: #111827;
    }
    
    em {
      font-style: italic;
      color: #4b5563;
    }
    
    /* Code */
    code {
      background: #f3f4f6;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: monospace;
      color: #dc2626;
      font-weight: 600;
    }
    
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 0.75rem;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 0.75rem;
      page-break-inside: avoid;
    }
    
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-weight: normal;
    }
    
    /* Blockquotes / Callouts */
    blockquote {
      padding: 0.75rem 1rem;
      border-left: 4px solid ${brandColor};
      background: #f9fafb;
      margin: 0.75rem 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0.75rem;
      page-break-inside: avoid;
    }
    
    thead {
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    
    th {
      padding: 0.5rem 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #111827;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      color: #374151;
      font-size: 10pt;
    }
    
    /* Horizontal rules */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5rem 0;
    }
    
    /* Links */
    a {
      color: #2563eb;
      text-decoration: underline;
    }
    
    /* Print optimizations */
    @media print {
      .header {
        page-break-after: avoid;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
      
      pre, blockquote, table {
        page-break-inside: avoid;
      }
      
      .footer {
        position: fixed;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">Bin Blast Co. - Employee Training Module</div>
  </div>
  
  <div class="content">
    ${content}
  </div>
  
  <div class="footer">
    <div>Bin Blast Co. - Professional Sanitation Services</div>
    <div class="page-number">
      <span class="page"></span>
    </div>
  </div>
  
  <script>
    // Add page numbers
    window.addEventListener('DOMContentLoaded', function() {
      // This will be handled by PDF generation tool
    });
  </script>
</body>
</html>`;
}
