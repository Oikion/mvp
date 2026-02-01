import React from "react";
import Container from "../components/ui/Container";
import { getDictionary } from "@/dictionaries";
import { AiChatInterface } from "./components/AiChatInterface";
import { getConversations } from "@/actions/ai/get-conversations";
import { getCurrentUser } from "@/lib/get-current-user";

const AiPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  // Fetch user's recent conversations and user info
  const [conversations, user] = await Promise.all([
    getConversations({ limit: 20 }),
    getCurrentUser(),
  ]);

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
