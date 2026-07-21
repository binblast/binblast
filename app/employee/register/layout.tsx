import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";

export const metadata: Metadata = buildPageMetadata({
  path: "/employee/register",
  title: "Bin Blaster Job Application | Bin Blast Co.",
  description:
    "Apply to join Bin Blast Co. as a Bin Blaster and clean trash bins on assigned routes throughout Metro Atlanta.",
  noIndex: true,
});

export default function EmployeeRegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
