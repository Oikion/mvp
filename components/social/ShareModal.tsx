"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  User,
  Share2,
  Loader2,
  Check,
  Eye,
  MessageSquare,
  Users,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useConnections, useShareEntity } from "@/hooks/swr";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "PROPERTY" | "CLIENT" | "DOCUMENT";
  entityId: string;
  entityName: string;
  existingShares?: Array<{ sharedWithId: string }>;
}

export function ShareModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  existingShares = [],
}: ShareModalProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<"VIEW_ONLY" | "VIEW_COMMENT">("VIEW_COMMENT");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { toast } = useAppToast();

  // Use SWR for connections - only fetch when modal is open
  const { connections: rawConnections, isLoading: isLoadingConnections } = useConnections({
    status: "ACCEPTED",
    enabled: open,
  });

  // Use mutation hook for sharing
  const { shareWithUser, isSharing } = useShareEntity();

  // Transform connections to get the user objects, deduplicating by user ID
  const connections = useMemo(() => {
    const seen = new Set<string>();
    return rawConnections
      .map((c) => c.user)
      .filter((user) => {
        if (seen.has(user.id)) return false;
        seen.add(user.id);
        return true;
      });
  }, [rawConnections]);

  const existingShareIds = useMemo(
    () => new Set(existingShares.map((s) => s.sharedWithId)),
    [existingShares]
  );

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setMessage("");
      setSearchQuery("");
    }
  }, [open]);

  const handleShare = async () => {
    if (!selectedUser) return;

    try {
      await shareWithUser(entityType, entityId, selectedUser, permissions, message.trim() || undefined);
      toast.success("Shared Successfully", { description: `${entityName} has been shared.`, isTranslationKey: false });
      onOpenChange(false);
      setSelectedUser(null);
      setMessage("");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to share";
      toast.error("Error", { description: msg, isTranslationKey: false });
    }
  };

  const filteredConnections = useMemo(() => {
    return connections.filter(
      (conn) =>
        !existingShareIds.has(conn.id) &&
        (searchQuery === "" ||
          conn.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [connections, existingShareIds, searchQuery]);

  const entityTypeLabels = {
    PROPERTY: "property",
    CLIENT: "client",
    DOCUMENT: "document",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share {entityTypeLabels[entityType]}
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{entityName}&rdquo; with a connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Connections list */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {isLoadingConnections ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading...</p>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {connections.length === 0
                    ? "You need connections to share with"
                    : existingShareIds.size === connections.length
                    ? "Already shared with all connections"
                    : "No connections match your search"}
                </p>
              </div>
            ) : (
              filteredConnections.map((conn) => (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => setSelectedUser(conn.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedUser === conn.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conn.avatar || ""} />
                    <AvatarFallback className="bg-primary/10">
                      {conn.name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{conn.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{conn.email}</p>
                  </div>
                  {selectedUser === conn.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Permissions */}
          {selectedUser && (
            <>
              <div className="space-y-3">
                <Label>Permissions</Label>
                <RadioGroup
                  value={permissions}
                  onValueChange={(v: string) =>
                    setPermissions(v as "VIEW_ONLY" | "VIEW_COMMENT")
                  }
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="VIEW_COMMENT" id="view-comment" />
                    <div className="flex items-center gap-2 flex-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="view-comment" className="cursor-pointer flex-1">
                        <span className="font-medium">Can view & comment</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Can view details and add notes/comments
                        </p>
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="VIEW_ONLY" id="view-only" />
                    <div className="flex items-center gap-2 flex-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="view-only" className="cursor-pointer flex-1">
                        <span className="font-medium">View only</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Can only view details
                        </p>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a note about why you're sharing this..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={!selectedUser || isSharing}>
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
