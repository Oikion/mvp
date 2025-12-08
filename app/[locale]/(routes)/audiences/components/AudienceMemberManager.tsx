"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  UserPlus,
  Loader2,
  Users,
  X,
} from "lucide-react";
import type { AudienceWithMembers } from "@/actions/audiences";

interface Connection {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface AudienceMemberManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: AudienceWithMembers;
  translations: any;
}

export function AudienceMemberManager({
  open,
  onOpenChange,
  audience,
  translations: t,
}: AudienceMemberManagerProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const memberIds = new Set(audience.members.map((m) => m.userId));

  useEffect(() => {
    if (open) {
      fetchConnections();
    }
  }, [open]);

  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await axios.get("/api/connections?status=ACCEPTED");
      setConnections(response.data.map((c: any) => c.user));
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      setIsAdding(userId);
      await axios.post(`/api/audiences/${audience.id}/members`, {
        memberIds: [userId],
      });
      toast({
        variant: "success",
        title: t.toast.memberAdded,
        description: t.toast.memberAddedDescription,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: t.toast.errorAddMember,
      });
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setIsRemoving(userId);
      await axios.delete(`/api/audiences/${audience.id}/members`, {
        data: { memberIds: [userId] },
      });
      toast({
        variant: "success",
        title: t.toast.memberRemoved,
        description: t.toast.memberRemovedDescription,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: t.toast.errorRemoveMember,
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const filteredConnections = connections.filter(
    (conn) =>
      searchQuery === "" ||
      conn.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split connections into members and non-members
  const currentMembers = filteredConnections.filter((c) => memberIds.has(c.id));
  const availableToAdd = filteredConnections.filter((c) => !memberIds.has(c.id));

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
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Connections */}
          <div>
            <h4 className="text-sm font-medium mb-2">{t.memberManager.addFromConnections}</h4>
            <ScrollArea className="h-[160px] rounded-md border">
              {isLoadingConnections ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableToAdd.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                  {connections.length === 0
                    ? t.memberManager.noConnections
                    : searchQuery
                    ? t.memberManager.noMatchingConnections
                    : t.memberManager.allMembersAdded}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableToAdd.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={conn.avatar || ""} />
                          <AvatarFallback className="text-xs">
                            {conn.name?.charAt(0) || conn.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {conn.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conn.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddMember(conn.id)}
                        disabled={isAdding === conn.id}
                      >
                        {isAdding === conn.id ? (
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
    </Dialog>
  );
}


