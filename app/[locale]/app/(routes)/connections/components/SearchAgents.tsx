"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  User,
  Search,
  UserPlus,
  Check,
  Clock,
  Loader2,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/navigation";
import useDebounce from "@/hooks/useDebounce";
import { useSendConnectionRequest } from "@/hooks/swr";

interface Agent {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  agentProfile?: {
    slug: string;
    bio: string | null;
    specializations: string[];
    serviceAreas: string[];
    visibility: "PERSONAL" | "SECURE" | "PUBLIC";
  } | null;
  _count: {
    properties: number;
  };
  connectionStatus: {
    status: string;
    connectionId?: string;
    isIncoming?: boolean;
  };
}

interface SearchAgentsProps {
  translations: Record<string, Record<string, string>>;
}

export function SearchAgents({ translations: t }: SearchAgentsProps) {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const { toast } = useAppToast();
  const { sendRequest, isSending } = useSendConnectionRequest();

  useEffect(() => {
    const searchAgents = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `/api/connections/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        setAgents(response.data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    searchAgents();
  }, [debouncedQuery]);

  const handleConnect = async (agentId: string) => {
    try {
      setConnectingId(agentId);
      await sendRequest(agentId);
      toast.success(t.toast.requestSent, { description: t.toast.requestSentDesc, isTranslationKey: false });
      // Refresh the list to update status
      const response = await axios.get(
        `/api/connections/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      setAgents(response.data);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.sendError;
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: message,
      });
    } finally {
      setConnectingId(null);
    }
  };

  const getStatusButton = (agent: Agent) => {
    const { status, isIncoming } = agent.connectionStatus;

    if (connectingId === agent.id || (isSending && connectingId === agent.id)) {
      return (
        <Button size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      );
    }

    switch (status) {
      case "ACCEPTED":
        return (
          <Button size="sm" variant="secondary" disabled>
            <Check className="h-4 w-4 mr-1" />
            {t.actions.connected}
          </Button>
        );
      case "PENDING":
        if (isIncoming) {
          return (
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/connections?tab=pending">
                <Clock className="h-4 w-4 mr-1" />
                {t.actions.respond}
              </Link>
            </Button>
          );
        }
        return (
          <Button size="sm" variant="secondary" disabled>
            <Clock className="h-4 w-4 mr-1" />
            {t.actions.pending}
          </Button>
        );
      default:
        return (
          <Button size="sm" onClick={() => handleConnect(agent.id)}>
            <UserPlus className="h-4 w-4 mr-1" />
            {t.actions.connect}
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">{t.search.searching}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {query ? t.search.noResults : t.search.emptyPrompt}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={agent.avatar || ""} alt={agent.name || ""} />
                  <AvatarFallback className="bg-primary/10">
                    {agent.name?.charAt(0) || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{agent.name || "Unknown"}</h4>
                    {agent.agentProfile?.visibility !== "PERSONAL" &&
                      agent.agentProfile?.slug && (
                        <Link
                          href={`/agent/${agent.agentProfile.slug}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {agent._count.properties > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {agent._count.properties} {t.search.properties}
                      </span>
                    )}
                  </div>
                  {agent.agentProfile?.specializations &&
                    agent.agentProfile.specializations.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {agent.agentProfile.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {getStatusButton(agent)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
