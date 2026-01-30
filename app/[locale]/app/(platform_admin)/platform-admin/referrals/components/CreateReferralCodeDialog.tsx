"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  adminSearchUsersWithoutReferralCode,
  adminCreateReferralCode,
} from "@/actions/referrals/admin-create-referral-code";

interface CreateReferralCodeDialogProps {
  locale: string;
}

export function CreateReferralCodeDialog({ locale }: CreateReferralCodeDialogProps) {
  const t = useTranslations("platformAdmin.referrals");
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [userSearchOpen, setUserSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    { id: string; email: string; name: string | null }[]
  >([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<{
    id: string;
    email: string;
    name: string | null;
  } | null>(null);
  const [commissionRate, setCommissionRate] = React.useState("10");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  // Debounced search
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await adminSearchUsersWithoutReferralCode(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error(t("createCode.errors.selectUser"));
      return;
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error(t("createCode.errors.invalidCommission"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminCreateReferralCode({
        userId: selectedUser.id,
        commissionRate: rate,
      });

      if (result.success && result.code) {
        setCreatedCode(result.code);
        toast.success(t("createCode.success"));
        router.refresh();
      } else {
        toast.error(result.error || t("createCode.errors.failed"));
      }
    } catch {
      toast.error(t("createCode.errors.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      toast.success(t("createCode.codeCopied"));
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after closing
    setTimeout(() => {
      setSelectedUser(null);
      setCommissionRate("10");
      setSearchQuery("");
      setSearchResults([]);
      setCreatedCode(null);
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("createCode.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("createCode.title")}</DialogTitle>
          <DialogDescription>{t("createCode.description")}</DialogDescription>
        </DialogHeader>

        {createdCode ? (
          // Success state
          <div className="py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 dark:bg-success/20/20">
                <CheckCircle className="h-6 w-6 text-success dark:text-success" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t("createCode.createdFor", { email: selectedUser?.email })}
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg w-full">
                <code className="flex-1 text-center font-mono text-lg">
                  {createdCode}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Form state
          <div className="grid gap-4 py-4">
            {/* User Selection */}
            <div className="grid gap-2">
              <Label>{t("createCode.selectUser")}</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="justify-between"
                  >
                    {selectedUser ? (
                      <span className="truncate">
                        {selectedUser.name || selectedUser.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("createCode.searchPlaceholder")}
                      </span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("createCode.searchPlaceholder")}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : searchResults.length === 0 ? (
                        <CommandEmpty>
                          {searchQuery.length < 2
                            ? t("createCode.typeToSearch")
                            : t("createCode.noUsersFound")}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {searchResults.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => {
                                setSelectedUser(user);
                                setUserSearchOpen(false);
                                setSearchQuery("");
                              }}
                              onClick={() => {
                                setSelectedUser(user);
                                setUserSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {user.name || "No name"}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {user.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedUser && (
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
              )}
            </div>

            {/* Commission Rate */}
            <div className="grid gap-2">
              <Label htmlFor="commissionRate">{t("createCode.commissionRate")}</Label>
              <div className="relative">
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("createCode.commissionNote")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdCode ? (
            <Button onClick={handleClose}>{t("createCode.done")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("createCode.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!selectedUser || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("createCode.create")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
