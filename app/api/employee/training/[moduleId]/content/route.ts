// app/api/employee/training/[moduleId]/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getModuleById } from "@/lib/training-modules";
import { readFile } from "fs/promises";
import { join } from "path";

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

    // Read Markdown file from docs/training-pdfs/
    const filePath = join(process.cwd(), "docs", "training-pdfs", markdownFileName);
    
    try {
      const markdownContent = await readFile(filePath, "utf-8");
      return NextResponse.json({
        moduleId,
        content: markdownContent,
        format: "markdown",
      });
    } catch (fileError) {
      console.error(`Error reading Markdown file for ${moduleId}:`, fileError);
      return NextResponse.json(
        { error: "Content file not found" },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching training content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch content" },
      { status: 500 }
    );
  }
}
