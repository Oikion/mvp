"use client";

import { CreateOrganizationWizard } from "./components/CreateOrganizationWizard";

export default function CreateOrganizationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted/20">
      <CreateOrganizationWizard />
    </div>
  );
}
