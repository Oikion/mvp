"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { Icons } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EligibleMember {
  userId: string;
  clerkUserId: string;
  name: string;
  email: string;
  currentRole: string;
  avatar?: string;
  dbName?: string;
}

interface TransferData {
  canTransfer: boolean;
  eligibleMembers: EligibleMember[];
  memberCount: number;
}

export function OwnershipTransfer() {
  const t = useTranslations("admin");
  const { toast } = useAppToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const { data, error, isLoading } = useSWR<TransferData>(
    open ? "/api/org/transfer-ownership" : null,
    fetcher
  );

  const handleTransfer = async () => {
    if (!selectedUserId) {
      toast.error(t, { description: t, isTranslationKey: false });
      return;
    }

    setIsTransferring(true);
    try {
      const response = await fetch("/api/org/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerUserId: selectedUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Transfer failed");
      }

      const result = await response.json();

      toast.success(t, { description: result.message, isTranslationKey: false });

      setOpen(false);
      setConfirmStep(false);
      setSelectedUserId("");
      
      // Refresh the page to reflect new role
      router.refresh();
    } catch (error: any) {
      toast.error(t, { description: error.message, isTranslationKey: false });
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedMember = data?.eligibleMembers.find((m) => m.userId === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setConfirmStep(false);
        setSelectedUserId("");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
          {t("transferOwnership") || "Transfer Ownership"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("transferOwnership") || "Transfer Ownership"}</DialogTitle>
          <DialogDescription>
            {t("transferOwnershipDescription") || "Transfer organization ownership to another member. You will become a Lead after the transfer."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("error")}</AlertTitle>
            <AlertDescription>{t("loadError") || "Failed to load transfer options"}</AlertDescription>
          </Alert>
        ) : !data?.canTransfer ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("noEligibleMembers") || "No Eligible Members"}</AlertTitle>
            <AlertDescription>
              {t("noEligibleMembersDescription") || "There are no other members in this organization to transfer ownership to. Invite members first."}
            </AlertDescription>
          </Alert>
        ) : !confirmStep ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("selectNewOwner") || "Select New Owner"}
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMember") || "Select a member"} />
                </SelectTrigger>
                <SelectContent>
                  {data.eligibleMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {(member.dbName || member.name || member.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.dbName || member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("confirmTransfer") || "Confirm Transfer"}</AlertTitle>
              <AlertDescription>
                {t("confirmTransferDescription") || "This action cannot be undone. You will lose owner privileges and become a Lead."}
              </AlertDescription>
            </Alert>

            {selectedMember && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMember.avatar} />
                  <AvatarFallback>
                    {(selectedMember.dbName || selectedMember.name)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedMember.dbName || selectedMember.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!confirmStep ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => setConfirmStep(true)}
                disabled={!selectedUserId || isLoading}
              >
                {t("continue") || "Continue"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setConfirmStep(false)}>
                {t("back") || "Back"}
              </Button>
              <Button
                variant="destructive"
                onClick={handleTransfer}
                disabled={isTransferring}
              >
                {isTransferring ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {t("transferring") || "Transferring..."}
                  </>
                ) : (
                  t("confirmTransferOwnership") || "Transfer Ownership"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
