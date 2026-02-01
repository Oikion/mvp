"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Building2,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  UserPlus,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { AudienceMemberManager } from "./AudienceMemberManager";
import type { AudienceWithMembers } from "@/actions/audiences";
import { formatDistanceToNow } from "date-fns";
import { createAudienceGroupChat } from "@/actions/messaging/audience-conversations";

interface AudienceCardProps {
  audience: AudienceWithMembers;
  translations: any;
}

export function AudienceCard({ audience, translations: t }: AudienceCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberManagerOpen, setMemberManagerOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useAppToast();

  const isOrgAudience = !!audience.organizationId;
  const displayedMembers = audience.members.slice(0, 5);
  const remainingCount = audience.memberCount - displayedMembers.length;

  const handleMessageAudience = async () => {
    if (audience.memberCount === 0) {
      toast.error(t.toast, { description: t.toast?.noMembers || "This audience has no members to message", isTranslationKey: false });
      return;
    }

    try {
      setIsMessaging(true);
      const result = await createAudienceGroupChat(audience.id);
      if (result.success && result.conversationId) {
        router.push(`/${locale}/app/messages?conversationId=${result.conversationId}`);
      } else {
        toast.error(t.toast, { description: result.error || "Failed to create group chat", isTranslationKey: false });
      }
    } catch (error) {
      toast.error(t.toast, { description: "Failed to create group chat", isTranslationKey: false });
    } finally {
      setIsMessaging(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/audiences/${audience.id}`);
      toast.success(t.toast.deleted, { description: `"${audience.name}" ${t.toast.deletedDescription}`, isTranslationKey: false });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: t.toast.errorDelete,
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await axios.post(`/api/audiences/${audience.id}/sync`);
      const addedCount = response.data.addedCount || 0;
      toast.success(t.toast.syncComplete, { description: addedCount, isTranslationKey: false });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: t.toast.errorSync,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Card className="relative group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isOrgAudience ? 'bg-primary/10' : 'bg-muted'}`}>
                {isOrgAudience ? (
                  <Building2 className="h-4 w-4 text-primary" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">{audience.name}</CardTitle>
                <CardDescription className="text-xs">
                  {audience.memberCount} {audience.memberCount !== 1 ? t.card.membersPlural : t.card.members}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMemberManagerOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t.actions.manageMembers}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleMessageAudience} 
                  disabled={isMessaging || audience.memberCount === 0}
                >
                  {isMessaging ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  {t.actions?.messageAudience || "Message Audience"}
                </DropdownMenuItem>
                {isOrgAudience && audience.isAutoSync && (
                  <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t.actions.syncOrgMembers}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.actions.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {audience.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {audience.description}
            </p>
          )}

          {/* Member avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {displayedMembers.map((member) => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.user.avatar || ""} />
                  <AvatarFallback className="text-xs bg-muted">
                    {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs font-medium">
                  +{remainingCount}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {isOrgAudience && (
              <Badge variant="outline" className="text-xs">
                {t.card.organization}
              </Badge>
            )}
            {audience.isAutoSync && (
              <Badge variant="secondary" className="text-xs">
                {t.card.autoSync}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(audience.createdAt), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.deleteDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t.deleteDialog.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Member manager */}
      <AudienceMemberManager
        open={memberManagerOpen}
        onOpenChange={setMemberManagerOpen}
        audience={audience}
        translations={t}
      />
    </>
  );
}


