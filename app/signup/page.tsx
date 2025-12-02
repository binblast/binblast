// app/signup/page.tsx (Next.js App Router)

import { Suspense } from "react";
import { TrashOnboardingWizard } from "@/components/TrashOnboardingWizard";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <TrashOnboardingWizard />
      </Suspense>
    </main>
  );
}

