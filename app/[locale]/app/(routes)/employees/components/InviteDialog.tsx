"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppToast } from "@/hooks/use-app-toast";
import { useDemoMode } from "@/components/demo/DemoModeProvider";

type ClerkRole = "org:owner" | "org:lead" | "org:member" | "org:viewer";

interface RoleOption {
  value: ClerkRole;
  labelKey: string;
  descriptionKey: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "org:viewer",  labelKey: "roleViewer",  descriptionKey: "roleViewerDescription" },
  { value: "org:member",  labelKey: "roleMember",  descriptionKey: "roleMemberDescription" },
  { value: "org:lead",    labelKey: "roleLead",    descriptionKey: "roleLeadDescription" },
  { value: "org:owner",   labelKey: "roleOwner",   descriptionKey: "roleOwnerDescription" },
];

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClerkRole>("org:member");
  const [isLoading, setIsLoading] = useState(false);

  const { organization } = useOrganization();
  const { isDemoMode } = useDemoMode();
  const t = useTranslations("admin");
  const { toast } = useAppToast();
  const router = useRouter();

  const selectedOption = ROLE_OPTIONS.find((r) => r.value === role);

  const handleInvite = async () => {
    if (!organization || !email.trim()) return;

    setIsLoading(true);
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role });

      toast.success(t("invitationSent"), {
        description: t("invitationSentDescription", { email: email.trim() }),
        isTranslationKey: false,
      });

      setEmail("");
      setRole("org:member");
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      console.error("[INVITE_MEMBER]", error);
      const clerkError = error as { errors?: Array<{ message?: string }> };
      const msg = clerkError?.errors?.[0]?.message ?? t("invitationError");
      toast.error(t("invitationError"), { description: msg, isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  if (isDemoMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button size="sm" className="gap-2" disabled>
              <UserPlus className="h-4 w-4" />
              {t("inviteButton")}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">{t("inviteDisabledDemo")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("inviteDisabledDemoDescription")}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t("inviteButton")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("inviteNewMember")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("inviteNewMember")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-1">

          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">{t("emailAddress")}</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>

          {/* Role field — description shown beneath trigger, not inside dropdown items */}
          <div className="flex flex-col gap-1.5">
            <Label>{t("role")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as ClerkRole)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue>
                  {selectedOption ? t(selectedOption.labelKey as any) : t("selectRole")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground leading-snug">
                {t(selectedOption.descriptionKey as any)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleInvite} disabled={isLoading || !email.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("sendInvitation")
              )}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
