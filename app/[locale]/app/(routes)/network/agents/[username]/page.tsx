import { redirect, notFound } from "next/navigation";
import { getInAppAgentProfile } from "@/actions/network/get-agent-profile";
import { AgentProfileInApp } from "./components/AgentProfileInApp";

interface AgentProfilePageProps {
  params: Promise<{ username: string; locale: string }>;
}

export default async function AgentProfilePage({ params }: AgentProfilePageProps) {
  const { username, locale } = await params;

  const data = await getInAppAgentProfile(username);

  if (!data) {
    notFound();
  }

  if (data.isSelf) {
    redirect(`/${locale}/app/network/profile`);
  }

  return (
    <AgentProfileInApp
      data={JSON.parse(JSON.stringify(data))}
      locale={locale}
    />
  );
}
