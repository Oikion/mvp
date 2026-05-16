"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Mail, Clock, Loader2, UserPlus } from "lucide-react";
import moment from "moment";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppToast } from "@/hooks/use-app-toast";
import { revokeInvitation } from "@/actions/revoke-invitation";
import type { PendingInvitation } from "@/actions/get-pending-invitations";

const ROLE_LABEL_KEYS: Record<string, string> = {
  "org:owner": "roleOwner",
  "org:lead": "roleLead",
  "org:member": "roleMember",
  "org:viewer": "roleViewer",
};

const ROLE_DESC_KEYS: Record<string, string> = {
  "org:owner": "roleOwnerDescription",
  "org:lead": "roleLeadDescription",
  "org:member": "roleMemberDescription",
  "org:viewer": "roleViewerDescription",
};

function isExpiringSoon(expiresAt: number, daysThreshold = 7): boolean {
  const daysUntil = moment(expiresAt).diff(moment(), "days");
  return daysUntil >= 0 && daysUntil <= daysThreshold;
}

interface RevokeButtonProps {
  invitation: PendingInvitation;
}

function RevokeButton({ invitation }: RevokeButtonProps) {
  const t = useTranslations("admin");
  const { toast } = useAppToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (result.success) {
        toast.success(t("revokeSuccess"), {
          description: t("revokeSuccessDescription", { email: invitation.emailAddress }),
          isTranslationKey: false,
        });
        router.refresh();
      } else {
        toast.error(t("revokeError"), {
          description: result.error ?? t("somethingWentWrong"),
          isTranslationKey: false,
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-destructive/70 border-destructive/30 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t("revokeInvitation")
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("revokeInvitationTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("revokeInvitationConfirm", { email: invitation.emailAddress })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("revokeInvitation")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PendingInvitationsSectionProps {
  invitations: PendingInvitation[];
}

export function PendingInvitationsSection({ invitations }: PendingInvitationsSectionProps) {
  const t = useTranslations("admin");

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold leading-none">
            {t("pendingInvitations")}
          </h3>
        </div>
        <div className="rounded-md border border-dashed px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("noPendingInvitations")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {t("pendingInvitationsDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold leading-none">
            {t("pendingInvitations")}
          </h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
            {invitations.length}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("pendingInvitationsDescription")}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {t("emailAddress")}
                </div>
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {t("role")}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t("invited")}
                </div>
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {t("expires")}
              </TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => {
              const roleTranslationKey = ROLE_LABEL_KEYS[inv.role];
              const roleDescriptionKey = ROLE_DESC_KEYS[inv.role];
              const roleLabel = roleTranslationKey
                ? t(roleTranslationKey as any)
                : inv.roleName;
              const roleDescription = roleDescriptionKey
                ? t(roleDescriptionKey as any)
                : undefined;
              const expiringSoon = inv.expiresAt ? isExpiringSoon(inv.expiresAt) : false;

              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-sm">
                    {inv.emailAddress}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="cursor-default text-xs font-normal">
                            {roleLabel}
                          </Badge>
                        </TooltipTrigger>
                        {roleDescription && (
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            {roleDescription}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {moment(inv.createdAt).format("YYYY/MM/DD")}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-xs whitespace-nowrap",
                      expiringSoon
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {inv.expiresAt
                      ? moment(inv.expiresAt).format("YYYY/MM/DD")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <RevokeButton invitation={inv} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
