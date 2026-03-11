"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  useStartGroupDM,
} from "@/hooks/swr/useMessaging";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { useConnections } from "@/hooks/swr/useConnections";
import {
  Loader2,
  MessageCircle,
  Check,
  Users,
  UserCircle,
  Link2,
  Search,
  X,
} from "lucide-react";

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

  // Mode
  const [mode, setMode] = useState<"dm" | "group">("dm");

  // DM state
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Group state
  const [groupSelections, setGroupSelections] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const { credentials } = useMessagingCredentials();
  const { users, isLoading: isLoadingUsers } = useOrgUsers();
  const { contacts, isLoading: isLoadingContacts } = useMessagingContacts();
  const { connections, isLoading: isLoadingConnections } = useConnections({ status: "ACCEPTED" });
  const { startDM, isStarting: isStartingUserDM, error: userDMError } = useStartDM();
  const { startContactDM, isStarting: isStartingContactDM, error: contactDMError } = useStartContactDM();
  const { startGroupDM, isStarting: isStartingGroup } = useStartGroupDM();

  const isStartingDM = isStartingUserDM || isStartingContactDM;
  const error = userDMError || contactDMError;
  const isLoading = isLoadingUsers || isLoadingContacts || isLoadingConnections;

  // Get connection user IDs to filter them out from team members
  const connectionUserIds = useMemo(() => {
    return new Set(connections.map((conn) => conn.user?.id).filter(Boolean));
  }, [connections]);

  // Filter out current user and connections from team members list
  const availableUsers = useMemo(() => {
    if (!users || !credentials?.userId) return [];
    return users.filter(
      (user) => user.id !== credentials.userId && !connectionUserIds.has(user.id)
    );
  }, [users, credentials?.userId, connectionUserIds]);

  // All org users except current user (for group mode)
  const allOrgUsers = useMemo(() => {
    if (!users || !credentials?.userId) return [];
    return users.filter((user) => user.id !== credentials.userId);
  }, [users, credentials?.userId]);

  // Client-side filtering based on search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter(
      (conn) =>
        conn.user?.name?.toLowerCase().includes(query) ||
        conn.user?.email?.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.clientName?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Get the selected item (DM mode)
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
    return connections.find((conn) => conn.user?.id === selection.id);
  }, [selection, connections]);

  const handleSelect = (type: SelectionType, id: string) => {
    setSelection({ type, id });
  };

  const handleStartDM = async () => {
    if (!selection) return;
    try {
      let conversationId: string | undefined;
      if (selection.type === "user" || selection.type === "connection") {
        const result = await startDM({ targetUserId: selection.id });
        conversationId = result?.conversationId;
      } else {
        const result = await startContactDM({ contactId: selection.id });
        conversationId = result?.conversationId;
      }
      if (conversationId) {
        router.push(`/${locale}/app/network/messages?conversationId=${conversationId}`);
        onOpenChange(false);
        setSelection(null);
        setSearchQuery("");
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (groupSelections.length < 2) return;
    try {
      const result = await startGroupDM({
        participantIds: groupSelections,
        name: groupName.trim() || undefined,
      });
      if (result?.conversationId) {
        router.push(`/${locale}/app/network/messages?conversationId=${result.conversationId}`);
        onOpenChange(false);
        setGroupSelections([]);
        setGroupName("");
        setMode("dm");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as "dm" | "group");
    setSelection(null);
    setGroupSelections([]);
    setGroupName("");
    setSearchQuery("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Smart group name placeholder: first names of selected members
  const groupNamePlaceholder = useMemo(() => {
    if (groupSelections.length < 2) return "Group name (optional)";
    const firstNames = groupSelections
      .slice(0, 3)
      .map((id) => allOrgUsers.find((u) => u.id === id)?.name?.split(" ")[0] ?? "")
      .filter(Boolean)
      .join(", ");
    return firstNames || "Group name (optional)";
  }, [groupSelections, allOrgUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            New Message
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group DM</TabsTrigger>
          </TabsList>

          {/* === DM TAB === */}
          <TabsContent value="dm" className="mt-4">
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
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
                <ScrollArea className="h-[280px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredConnections.length === 0 &&
                    filteredUsers.length === 0 &&
                    filteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No results found.
                    </div>
                  ) : (
                    <div className="p-1">
                      {/* Connections */}
                      {filteredConnections.length > 0 && (
                        <div className="mb-2">
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Connections
                          </div>
                          {filteredConnections.map((connection) => (
                            <button
                              key={`connection-${connection.user?.id}`}
                              type="button"
                              onClick={() => handleSelect("connection", connection.user?.id ?? "")}
                              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent focus:bg-accent outline-none cursor-pointer transition-colors"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={connection.user?.avatar || undefined} />
                                <AvatarFallback className="text-xs bg-success/10 text-success dark:bg-success/20/30 dark:text-success">
                                  {getInitials(connection.user?.name || connection.user?.email || "U")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {connection.user?.name || "Deleted User"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {connection.user?.email ?? ""}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-success/50 text-success dark:text-success"
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Connection
                              </Badge>
                              {selection?.type === "connection" &&
                                selection.id === connection.user?.id && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                            </button>
                          ))}
                        </div>
                      )}

                      {filteredConnections.length > 0 &&
                        (filteredUsers.length > 0 || filteredContacts.length > 0) && (
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
                                  {contact.email ||
                                    contact.phone ||
                                    contact.clientName ||
                                    "No contact info"}
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
                <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
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
                        <AvatarImage src={selectedConnection.user?.avatar || undefined} />
                        <AvatarFallback className="bg-success/10 text-success dark:bg-success/20/30 dark:text-success">
                          {getInitials(
                            selectedConnection.user?.name ||
                              selectedConnection.user?.email ||
                              "U"
                          )}
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
                      {selectedUser?.name ||
                        selectedConnection?.user?.name ||
                        selectedContact?.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedUser?.email ||
                        selectedConnection?.user?.email ||
                        selectedContact?.email ||
                        selectedContact?.clientName ||
                        "Contact"}
                    </p>
                  </div>
                  <Badge
                    variant={selectedUser ? "secondary" : "outline"}
                    className={
                      selectedConnection ? "border-success/50 text-success dark:text-success" : ""
                    }
                  >
                    {selectedUser ? "Team" : selectedConnection ? "Connection" : "Contact"}
                  </Badge>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error.message}</p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isStartingDM}
              >
                Cancel
              </Button>
              <Button onClick={handleStartDM} disabled={!selection || isStartingDM}>
                {isStartingDM ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Conversation"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* === GROUP TAB === */}
          <TabsContent value="group" className="mt-4 space-y-3">
            {/* Optional group name */}
            <Input
              placeholder={groupNamePlaceholder}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            {/* Selected member chips */}
            {groupSelections.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {groupSelections.map((id) => {
                  const user = allOrgUsers.find((u) => u.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {user?.name ?? id}
                      <button
                        type="button"
                        onClick={() =>
                          setGroupSelections((prev) => prev.filter((s) => s !== id))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Team member list (multi-select) */}
            <div className="rounded-lg border">
              <ScrollArea className="h-[240px]">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-1">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Team Members
                    </div>
                    {allOrgUsers.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No team members found.
                      </div>
                    ) : (
                      allOrgUsers.map((user) => {
                        const isSelected = groupSelections.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() =>
                              setGroupSelections((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== user.id)
                                  : [...prev, user.id]
                              )
                            }
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent outline-none cursor-pointer transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(user.name || user.email || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isStartingGroup}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={groupSelections.length < 2 || isStartingGroup}
              >
                {isStartingGroup ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create Group${groupSelections.length >= 2 ? ` (${groupSelections.length + 1})` : ""}`
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
