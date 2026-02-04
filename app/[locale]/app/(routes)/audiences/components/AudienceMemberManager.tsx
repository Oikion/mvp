"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Search,
  UserPlus,
  Loader2,
  Users,
  X,
  Plus,
  MessageCircle,
} from "lucide-react";
import type { AudienceWithMembers } from "@/actions/audiences";
import { QuickAddClient } from "../../crm/components/QuickAddClient";
import { startDirectMessage } from "@/actions/messaging/direct-messages";

interface Client {
  id: string;
  client_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  client_status: string | null;
}

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
}

interface TranslationsType {
  memberManager: {
    title: string;
    description: string;
    searchPlaceholder: string;
    currentMembers: string;
    noMembers: string;
    addFromConnections: string;
    noConnections: string;
    noMatchingConnections: string;
    allMembersAdded: string;
    add: string;
    done: string;
    addClient?: string;
  };
  toast: {
    memberAdded: string;
    memberAddedDescription: string;
    memberRemoved: string;
    memberRemovedDescription: string;
    error: string;
    errorAddMember: string;
    errorRemoveMember: string;
  };
}

interface AudienceMemberManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: AudienceWithMembers;
  translations: TranslationsType;
}

export function AudienceMemberManager({
  open,
  onOpenChange,
  audience,
  translations: t,
}: AudienceMemberManagerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isMessaging, setIsMessaging] = useState<string | null>(null);
  const [quickAddClientOpen, setQuickAddClientOpen] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useAppToast();

  const memberIds = new Set(audience.members.map((m) => m.userId));

  const handleMessageMember = async (userId: string) => {
    try {
      setIsMessaging(userId);
      const result = await startDirectMessage(userId);
      if (result.success && result.conversationId) {
        onOpenChange(false);
        router.push(`/${locale}/app/messages?conversationId=${result.conversationId}`);
      } else {
        toast.error(t.toast.error, { description: result.error || "Failed to start conversation", isTranslationKey: false });
      }
    } catch (error) {
      toast.error(t.toast.error, { description: "Failed to start conversation", isTranslationKey: false });
    } finally {
      setIsMessaging(null);
    }
  };

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchOrgUsers();
    }
  }, [open]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await axios.get("/api/crm/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchOrgUsers = async () => {
    try {
      const response = await axios.get("/api/org/users");
      setOrgUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch org users:", error);
    }
  };

  const handleClientCreated = () => {
    // Refresh clients after a new client is created
    fetchClients();
  };

  const handleAddMember = async (userId: string) => {
    try {
      setIsAdding(userId);
      await axios.post(`/api/audiences/${audience.id}/members`, {
        memberIds: [userId],
      });
      toast.success(t.toast.memberAdded, { description: t.toast.memberAddedDescription, isTranslationKey: false });
      router.refresh();
    } catch (error) {
      toast.error(t.toast.error, { description: t.toast.errorAddMember, isTranslationKey: false });
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveMember = async (clientId: string) => {
    try {
      setIsRemoving(clientId);
      await axios.delete(`/api/audiences/${audience.id}/members`, {
        data: { memberIds: [clientId] },
      });
      toast.success(t.toast.memberRemoved, { description: t.toast.memberRemovedDescription, isTranslationKey: false });
      router.refresh();
    } catch (error) {
      toast.error(t.toast.error, { description: t.toast.errorRemoveMember, isTranslationKey: false });
    } finally {
      setIsRemoving(null);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      searchQuery === "" ||
      client.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.primary_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.primary_phone?.includes(searchQuery)
  );

  // Split clients into members and non-members
  const availableToAdd = filteredClients.filter((c) => !memberIds.has(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.memberManager.title}
          </DialogTitle>
          <DialogDescription>
            {t.memberManager.description} &ldquo;{audience.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.memberManager.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {/* Current Members */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t.memberManager.currentMembers} ({audience.memberCount})
            </h4>
            <ScrollArea className="h-[160px] rounded-md border">
              {audience.members.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {t.memberManager.noMembers}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {audience.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.avatar || ""} />
                          <AvatarFallback className="text-xs">
                            {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleMessageMember(member.userId)}
                          disabled={isMessaging === member.userId}
                          title={(t.memberManager as Record<string, string>)?.messageMember || "Message"}
                        >
                          {isMessaging === member.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MessageCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={isRemoving === member.userId}
                        >
                          {isRemoving === member.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Clients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">{t.memberManager.addFromConnections}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuickAddClientOpen(true)}
                className="gap-1 h-7 text-xs"
              >
                <Plus className="h-3 w-3" />
                {t.memberManager.addClient || "Add Client"}
              </Button>
            </div>
            <ScrollArea className="h-[160px] rounded-md border">
              {isLoadingClients ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableToAdd.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground p-4 text-center gap-3">
                  <span>
                    {clients.length === 0
                      ? t.memberManager.noConnections
                      : searchQuery
                      ? t.memberManager.noMatchingConnections
                      : t.memberManager.allMembersAdded}
                  </span>
                  {clients.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAddClientOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t.memberManager.addClient || "Add Client"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableToAdd.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {client.client_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {client.client_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client.primary_email || client.primary_phone || "No contact info"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddMember(client.id)}
                        disabled={isAdding === client.id}
                      >
                        {isAdding === client.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            {t.memberManager.add}
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.memberManager.done}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Quick Add Client Sheet */}
      <QuickAddClient
        open={quickAddClientOpen}
        onOpenChange={setQuickAddClientOpen}
        users={orgUsers}
        onContinueToFull={handleClientCreated}
      />
    </Dialog>
  );
}


