import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { AiChatInterface } from "./components/AiChatInterface";
import { AiAccessDenied } from "./components/AiAccessDenied";
import { getConversations } from "@/actions/ai/get-conversations";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { hasAiAssistantAccess } from "@/lib/ai/access";

const AiPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  // Check organization access
  const orgId = await getCurrentOrgIdSafe();
  const hasAccess = orgId ? await hasAiAssistantAccess(orgId) : false;

  // If no access, show the access denied component
  if (!hasAccess) {
    return (
      <Container
        title={dict.ai?.pageTitle || "AI Assistant"}
        description={dict.ai?.pageDescription || "Your intelligent assistant for managing properties, clients, and more"}
      >
        <AiAccessDenied locale={locale} />
      </Container>
    );
  }
  
  // Fetch user's recent conversations and user info
  const [rawConversations, user] = await Promise.all([
    getConversations({ limit: 20 }),
    getCurrentUser(),
  ]);

  // Transform conversations to ensure proper typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = rawConversations.map((c: any) => ({
    ...c,
    messages: Array.isArray(c.messages) ? c.messages : [],
  }));

  // Get user's first name for personalized greeting
  const userName = user?.firstName || undefined;

  return (
    <Container
      title={dict.ai?.pageTitle || "AI Assistant"}
      description={dict.ai?.pageDescription || "Your intelligent assistant for managing properties, clients, and more"}
    >
      <AiChatInterface 
        locale={locale} 
        dict={dict}
        initialConversations={conversations}
        userName={userName}
      />
    </Container>
  );
};

export default AiPage;
