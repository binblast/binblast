// lib/certificate-pdf.ts
// Certificate PDF generation utilities

import { TrainingCertificate } from "@/components/Certificate/TrainingCertificate";
import React from "react";
import { renderToString } from "react-dom/server";

export interface CertificateData {
  employeeName: string;
  certificateId: string;
  issueDate: string;
  expiryDate: string;
  scoreSummary?: number;
}

/**
 * Generate certificate HTML string
 * This can be used with puppeteer or similar tools to generate PDFs
 */
export function generateCertificateHTML(data: CertificateData): string {
  // For server-side rendering, we'll create the HTML directly
  // since we can't use React components in this context easily
  const issueDateFormatted = new Date(data.issueDate).toLocaleDateString();
  const expiryDateFormatted = new Date(data.expiryDate).toLocaleDateString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Certificate - ${data.employeeName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 20px;
    }
    .certificate {
      width: 8.5in;
      height: 11in;
      background: #ffffff;
      padding: 2rem;
      border: 4px solid #16a34a;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .header {
      margin-bottom: 2rem;
    }
    .company-name {
      font-size: 2.5rem;
      font-weight: 700;
      color: #16a34a;
      margin-bottom: 0.5rem;
    }
    .certificate-title {
      font-size: 1.25rem;
      color: #6b7280;
      font-weight: 600;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
    }
    .intro-text {
      font-size: 1.125rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }
    .employee-name {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2rem;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 1rem;
      display: inline-block;
    }
    .description {
      font-size: 1rem;
      color: #6b7280;
      margin-bottom: 1rem;
      line-height: 1.6;
    }
    .certification-text {
      font-size: 1rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }
    .footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
    .footer-section {
      text-align: center;
    }
    .footer-label {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .certificate-id {
      margin-top: 2rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .certificate {
        box-shadow: none;
        border: none;
        width: 100%;
        height: 100vh;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="company-name">Bin Blast Co.</div>
      <div class="certificate-title">Certificate of Training Completion</div>
    </div>
    <div class="content">
      <div class="intro-text">This is to certify that</div>
      <div class="employee-name">${escapeHtml(data.employeeName)}</div>
      <div class="description">
        has successfully completed all required training modules
        ${data.scoreSummary !== undefined ? `with an average score of ${data.scoreSummary}%` : ''}
      </div>
      <div class="certification-text">
        and is certified to perform bin cleaning services for Bin Blast Co.
      </div>
    </div>
    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Issue Date</div>
        <div>${issueDateFormatted}</div>
      </div>
      <div class="footer-section">
        <div class="footer-label">Expiry Date</div>
        <div>${expiryDateFormatted}</div>
      </div>
    </div>
    <div class="certificate-id">Certificate ID: ${data.certificateId}</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate certificate as data URL (for client-side PDF generation)
 * Note: This requires a PDF generation library like jsPDF or html2pdf.js
 */
export async function generateCertificateDataURL(data: CertificateData): Promise<string> {
  // This is a placeholder - actual implementation would use a PDF library
  // For now, return the HTML as a data URL
  const html = generateCertificateHTML(data);
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Generate PDF blob (for server-side PDF generation)
 * This would typically use puppeteer or similar
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Blob> {
  // This is a placeholder - actual implementation would use puppeteer
  // For now, return HTML as text blob
  const html = generateCertificateHTML(data);
  return new Blob([html], { type: 'text/html' });
}
