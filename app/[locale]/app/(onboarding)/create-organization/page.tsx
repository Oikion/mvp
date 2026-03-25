"use client";

import { CreateOrganizationWizard } from "./components/CreateOrganizationWizard";

export default function CreateOrganizationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-8 py-4 md:py-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-2xl">
        <div className="bg-card/80 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl border shadow-xl">
          <CreateOrganizationWizard />
        </div>
      </div>
    </div>
  );
}
