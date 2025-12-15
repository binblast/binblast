// app/api/training/modules/[moduleId]/generate-pdf/route.ts
// Generate styled PDF from markdown content

import { NextRequest, NextResponse } from "next/server";
import { getModuleById } from "@/lib/training-modules";
import { readFile } from "fs/promises";
import { join } from "path";
import { marked } from "marked";
import { generatePDFHTML } from "@/lib/training-pdf-template";
import puppeteer from "puppeteer";

export const dynamic = 'force-dynamic';

const MARKDOWN_FILES: Record<string, string> = {
  "welcome": "welcome-to-bin-blast.md",
  "safety-basics": "safety-basics.md",
  "cleaning-process": "cleaning-process.md",
  "sticker-placement": "sticker-placement.md",
  "photo-documentation": "photo-documentation.md",
  "route-zone-awareness": "route-zone-awareness.md",
  "company-policies": "company-policies.md",
};

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: false,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;
    const module = getModuleById(moduleId);
    
    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    const markdownFileName = MARKDOWN_FILES[moduleId];
    if (!markdownFileName) {
      return NextResponse.json(
        { error: "Content not available for this module" },
        { status: 404 }
      );
    }

    // Read Markdown file
    const filePath = join(process.cwd(), "docs", "training-pdfs", markdownFileName);
    const markdownContent = await readFile(filePath, "utf-8");
    
    // Convert markdown to HTML
    const htmlContent = await marked(markdownContent);
    
    // Generate PDF HTML template
    const pdfHTML = generatePDFHTML({
      title: module.name,
      moduleId,
      content: htmlContent,
      brandColor: "#16a34a",
    });

    // Generate PDF using Puppeteer
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(pdfHTML, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in',
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #6b7280;">
            <span>Bin Blast Co. - Professional Sanitation Services</span>
            <span style="margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      await browser.close();

      // Return PDF as response
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${moduleId}.pdf"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (puppeteerError: any) {
      console.error("Puppeteer error:", puppeteerError);
      if (browser) {
        await browser.close();
      }
      
      // Fallback: return HTML instead of PDF if Puppeteer fails
      return new NextResponse(pdfHTML, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
