import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { isAtLeastLead } from "@/lib/permissions";
import { getOrganizationAgentConfigs } from "@/actions/organization/ai-config";
import { AiSettingsClient } from "./components/AiSettingsClient";

export const metadata: Metadata = {
  title: "AI Settings | Admin",
  description: "Configure AI assistant settings for your organization",
};

export default async function AiSettingsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const isAdmin = await isAtLeastLead();
  
  if (!isAdmin) {
    redirect("/app/dashboard");
  }

  const { agents, error } = await getOrganizationAgentConfigs();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">AI Settings</h2>
            <p className="text-muted-foreground">
              Configure AI assistant behavior and capabilities for your organization
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <AiSettingsClient agents={agents || []} />
        )}
      </div>
    </div>
  );
}
