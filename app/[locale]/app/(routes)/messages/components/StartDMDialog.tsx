"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  useStartDM, 
  useMessagingCredentials, 
  useMessagingContacts,
  useStartContactDM,
} from "@/hooks/swr/useMessaging";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { useConnections } from "@/hooks/swr/useConnections";
import { Loader2, MessageCircle, Check, Users, UserCircle, Link2, Search } from "lucide-react";

interface StartDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SelectionType = "user" | "contact" | "connection";
interface Selection {
  type: SelectionType;
  id: string;
}

export function StartDMDialog({ open, onOpenChange }: StartDMDialogProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { credentials } = useMessagingCredentials();
  const { users, isLoading: isLoadingUsers } = useOrgUsers();
  const { contacts, isLoading: isLoadingContacts } = useMessagingContacts();
  const { connections, isLoading: isLoadingConnections } = useConnections({ status: "ACCEPTED" });
  const { startDM, isStarting: isStartingUserDM, error: userDMError } = useStartDM();
  const { startContactDM, isStarting: isStartingContactDM, error: contactDMError } = useStartContactDM();

  const isStarting = isStartingUserDM || isStartingContactDM;
  const error = userDMError || contactDMError;
  const isLoading = isLoadingUsers || isLoadingContacts || isLoadingConnections;

  // Get connection user IDs to filter them out from team members
  const connectionUserIds = useMemo(() => {
    return new Set(connections.map((conn) => conn.user.id));
  }, [connections]);

  // Filter out current user and connections from team members list
  const availableUsers = useMemo(() => {
    if (!users || !credentials?.userId) return [];
    return users.filter(
      (user) => user.id !== credentials.userId && !connectionUserIds.has(user.id)
    );
  }, [users, credentials?.userId, connectionUserIds]);

  // Client-side filtering based on search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter((conn) => 
      conn.user.name?.toLowerCase().includes(query) ||
      conn.user.email.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter((user) =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.clientName?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Get the selected item
  const selectedUser = useMemo(() => {
    if (!selection || selection.type !== "user") return null;
    return availableUsers.find((user) => user.id === selection.id);
  }, [selection, availableUsers]);

  const selectedContact = useMemo(() => {
    if (!selection || selection.type !== "contact") return null;
    return contacts.find((contact) => contact.id === selection.id);
  }, [selection, contacts]);

  const selectedConnection = useMemo(() => {
    if (!selection || selection.type !== "connection") return null;
    return connections.find((conn) => conn.user.id === selection.id);
  }, [selection, connections]);

  const handleSelect = (type: SelectionType, id: string) => {
    setSelection({ type, id });
  };

  const handleStartDM = async () => {
    if (!selection) return;

    try {
      let conversationId: string | undefined;

      if (selection.type === "user" || selection.type === "connection") {
        // Both users and connections use the same startDM with targetUserId
        const result = await startDM({ targetUserId: selection.id });
        conversationId = result?.conversationId;
      } else {
        const result = await startContactDM({ contactId: selection.id });
        conversationId = result?.conversationId;
      }

      if (conversationId) {
        // Navigate to the new conversation
        router.push(`/${locale}/app/messages?conversationId=${conversationId}`);
        onOpenChange(false);
        // Reset form
        setSelection(null);
        setSearchQuery("");
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Start a Direct Message
          </DialogTitle>
          <DialogDescription>
            Select a team member or contact to start a conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members & contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Scrollable list */}
          <div className="rounded-lg border">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConnections.length === 0 && filteredUsers.length === 0 && filteredContacts.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                <div className="p-1">
                  {/* Connections - Show first as the primary option */}
                  {filteredConnections.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Connections
                      </div>
                      {filteredConnections.map((connection) => (
                        <button
                          key={`connection-${connection.user.id}`}
                          type="button"
                          onClick={() => handleSelect("connection", connection.user.id)}
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent focus:bg-accent outline-none cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={connection.user.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-success/10 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {getInitials(connection.user.name || connection.user.email || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {connection.user.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {connection.user.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-success/50 text-success dark:text-green-400">
                            <Link2 className="h-3 w-3 mr-1" />
                            Connection
                          </Badge>
                          {selection?.type === "connection" && selection.id === connection.user.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredConnections.length > 0 && (filteredUsers.length > 0 || filteredContacts.length > 0) && (
                    <div className="h-px bg-border my-1 mx-1" />
                  )}

                  {/* Team Members */}
                  {filteredUsers.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Team Members
                      </div>
                      {filteredUsers.map((user) => (
                        <button
                          key={`user-${user.id}`}
                          type="button"
                          onClick={() => handleSelect("user", user.id)}
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent focus:bg-accent outline-none cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(user.name || user.email || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            <Users className="h-3 w-3 mr-1" />
                            Team
                          </Badge>
                          {selection?.type === "user" && selection.id === user.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredUsers.length > 0 && filteredContacts.length > 0 && (
                    <div className="h-px bg-border my-1 mx-1" />
                  )}

                  {/* CRM Contacts */}
                  {filteredContacts.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Contacts
                      </div>
                      {filteredContacts.map((contact) => (
                        <button
                          key={`contact-${contact.id}`}
                          type="button"
                          onClick={() => handleSelect("contact", contact.id)}
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent focus:bg-accent outline-none cursor-pointer transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {contact.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.email || contact.phone || contact.clientName || "No contact info"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            <UserCircle className="h-3 w-3 mr-1" />
                            Contact
                          </Badge>
                          {selection?.type === "contact" && selection.id === contact.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected preview */}
          {(selectedUser || selectedContact || selectedConnection) && (
            <div className="mt-4 p-3 rounded-lg bg-muted flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {selectedUser ? (
                  <>
                    <AvatarImage src={selectedUser.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedUser.name || selectedUser.email || "U")}
                    </AvatarFallback>
                  </>
                ) : selectedConnection ? (
                  <>
                    <AvatarImage src={selectedConnection.user.avatar || undefined} />
                    <AvatarFallback className="bg-success/10 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {getInitials(selectedConnection.user.name || selectedConnection.user.email || "U")}
                    </AvatarFallback>
                  </>
                ) : selectedContact ? (
                  <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {getInitials(selectedContact.name)}
                  </AvatarFallback>
                ) : null}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {selectedUser?.name || selectedConnection?.user.name || selectedContact?.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedUser?.email || selectedConnection?.user.email || selectedContact?.email || selectedContact?.clientName || "Contact"}
                </p>
              </div>
              <Badge variant={selectedUser ? "secondary" : "outline"} className={selectedConnection ? "border-success/50 text-success dark:text-green-400" : ""}>
                {selectedUser ? "Team" : selectedConnection ? "Connection" : "Contact"}
              </Badge>
            </div>
          )}
          
          {error && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartDM}
            disabled={!selection || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
