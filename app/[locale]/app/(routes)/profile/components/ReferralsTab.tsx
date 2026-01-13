"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Gift,
  Copy,
  Check,
  RefreshCw,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  getReferralCode,
  regenerateReferralCode,
  type ReferralCodeData,
} from "@/actions/referrals/get-referral-code";
import {
  getUserReferrals,
  type UserReferralsResult,
} from "@/actions/referrals/get-referrals";

export function ReferralsTab() {
  const t = useTranslations("referrals");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [referralCode, setReferralCode] = useState<ReferralCodeData | null>(null);
  const [referralsData, setReferralsData] = useState<UserReferralsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load referral data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [codeData, referrals] = await Promise.all([
          getReferralCode(),
          getUserReferrals(),
        ]);
        setReferralCode(codeData);
        setReferralsData(referrals);
      } catch (error) {
        console.error("Failed to load referral data:", error);
        toast.error(t("errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [t]);

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode.code);
    setCopied("code");
    toast.success(t("codeCopied"));
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyLink = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode.referralUrl);
    setCopied("link");
    toast.success(t("linkCopied"));
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerateCode = () => {
    startTransition(async () => {
      try {
        const newCode = await regenerateReferralCode();
        setReferralCode(newCode);
        toast.success(t("codeRegenerated"));
      } catch (error) {
        console.error("Failed to regenerate code:", error);
        toast.error(t("errors.regenerateFailed"));
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = referralsData?.stats;

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("yourReferralCode")}</CardTitle>
              <CardDescription>{t("shareCodeDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code Display */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                {t("referralCode")}
              </label>
              <div className="flex gap-2">
                <Input
                  value={referralCode?.code || ""}
                  readOnly
                  className="font-mono text-lg tracking-wider"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyCode}
                      >
                        {copied === "code" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("copyCode")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Link Display */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              {t("referralLink")}
            </label>
            <div className="flex gap-2">
              <Input
                value={referralCode?.referralUrl || ""}
                readOnly
                className="text-sm"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {copied === "link" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("copyLink")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Commission Rate & Regenerate */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {t("commissionRate")}:{" "}
              <span className="font-semibold text-foreground">
                {referralCode?.commissionRate}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerateCode}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t("regenerateCode")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("stats.totalReferrals")}</p>
                <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("stats.converted")}</p>
                <p className="text-2xl font-bold">{stats?.convertedReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("stats.pendingEarnings")}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.pendingEarnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("stats.totalEarnings")}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("yourReferrals")}</CardTitle>
          <CardDescription>{t("referralsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {referralsData?.referrals && referralsData.referrals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.user")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.earnings")}</TableHead>
                  <TableHead>{t("table.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralsData.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {referral.referredUserName || t("anonymous")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {referral.referredUserEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          referral.status === "CONVERTED"
                            ? "default"
                            : referral.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {t(`status.${referral.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(referral.totalEarnings)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(referral.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("noReferrals")}</p>
              <p className="text-sm mt-1">{t("shareToGetStarted")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      {referralsData?.payouts && referralsData.payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("payoutHistory")}</CardTitle>
            <CardDescription>{t("payoutHistoryDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.amount")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralsData.payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {formatCurrency(payout.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payout.status === "PAID"
                            ? "default"
                            : payout.status === "PROCESSING"
                            ? "secondary"
                            : payout.status === "PENDING"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {t(`payoutStatus.${payout.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payout.paidAt
                        ? formatDate(payout.paidAt)
                        : formatDate(payout.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {payout.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
