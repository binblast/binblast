import type { Metadata } from "next";
import "./globals.css";
import { FirebaseInitializer } from "@/components/FirebaseInitializer";

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Initialize Firebase before any children render to prevent dynamic chunk errors */}
        <FirebaseInitializer />
        {children}
      </body>
    </html>
  );
}

