"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import {
  getXeSyncHistory,
  getXeSyncHistoryDetail,
  retrySyncPackage,
  type SyncHistoryItem,
  type SyncHistoryDetail,
} from "@/actions/xe";
import type { XeSyncStatus } from "@prisma/client";

// ============================================
// COMPONENT
// ============================================

export function XeSyncHistoryTable() {
  const locale = useLocale() as "en" | "el";
  const dateLocale = locale === "el" ? el : enUS;
  
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SyncHistoryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const limit = 10;

  useEffect(() => {
    loadHistory();
  }, [offset, statusFilter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const status = statusFilter === "all" ? undefined : (statusFilter as XeSyncStatus);
      const result = await getXeSyncHistory({ limit, offset, status });
      
      if (result.success && result.data) {
        setHistory(result.data.items);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load sync history:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης ιστορικού"
          : "Failed to load history"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (historyId: string) => {
    setLoadingDetail(true);
    setDetailDialogOpen(true);
    
    try {
      const result = await getXeSyncHistoryDetail(historyId);
      
      if (result.success && result.data) {
        setSelectedDetail(result.data);
      } else {
        toast.error(result.error || "Failed to load details");
        setDetailDialogOpen(false);
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης λεπτομερειών"
          : "Failed to load details"
      );
      setDetailDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRetry = async (historyId: string) => {
    setRetrying(historyId);
    try {
      const result = await retrySyncPackage(historyId);
      
      if (result.success) {
        toast.success(
          locale === "el"
            ? `Νέο πακέτο δημιουργήθηκε: ${result.newPackageId}`
            : `New package created: ${result.newPackageId}`
        );
        loadHistory();
      } else {
        toast.error(result.error || "Retry failed");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία επανάληψης"
          : "Retry failed"
      );
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: XeSyncStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge className="bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {locale === "el" ? "Επιτυχία" : "Success"}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {locale === "el" ? "Αποτυχία" : "Failed"}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {locale === "el" ? "Αναμονή" : "Pending"}
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-primary/10 text-primary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {locale === "el" ? "Επεξεργασία" : "Processing"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (requestType: string) => {
    if (requestType === "ADD_ITEMS") {
      return (
        <Badge variant="outline" className="text-success">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          {locale === "el" ? "Προσθήκη" : "Add"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-destructive">
        <ArrowDownCircle className="h-3 w-3 mr-1" />
        {locale === "el" ? "Αφαίρεση" : "Remove"}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {locale === "el" ? "Ιστορικό Συγχρονισμού" : "Sync History"}
            </CardTitle>
            <CardDescription>
              {locale === "el"
                ? `${total} συνολικοί συγχρονισμοί`
                : `${total} total syncs`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {locale === "el" ? "Όλα" : "All"}
                </SelectItem>
                <SelectItem value="SUCCESS">
                  {locale === "el" ? "Επιτυχία" : "Success"}
                </SelectItem>
                <SelectItem value="FAILED">
                  {locale === "el" ? "Αποτυχία" : "Failed"}
                </SelectItem>
                <SelectItem value="PENDING">
                  {locale === "el" ? "Αναμονή" : "Pending"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {locale === "el"
                  ? "Δεν υπάρχει ιστορικό συγχρονισμού"
                  : "No sync history found"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "el" ? "Πακέτο" : "Package"}</TableHead>
                    <TableHead>{locale === "el" ? "Τύπος" : "Type"}</TableHead>
                    <TableHead>{locale === "el" ? "Ακίνητα" : "Properties"}</TableHead>
                    <TableHead>{locale === "el" ? "Κατάσταση" : "Status"}</TableHead>
                    <TableHead>{locale === "el" ? "Ημερομηνία" : "Date"}</TableHead>
                    <TableHead className="text-right">
                      {locale === "el" ? "Ενέργειες" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.packageId.slice(0, 20)}...
                      </TableCell>
                      <TableCell>{getRequestTypeBadge(item.requestType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{item.totalItems}</span>
                          {item.successCount > 0 && (
                            <span className="text-xs text-success">
                              (+{item.successCount})
                            </span>
                          )}
                          {item.failureCount > 0 && (
                            <span className="text-xs text-destructive">
                              (-{item.failureCount})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(item.submittedAt), "dd MMM yyyy HH:mm", {
                          locale: dateLocale,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status === "FAILED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(item.id)}
                              disabled={retrying === item.id}
                            >
                              {retrying === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {locale === "el"
                      ? `Εμφάνιση ${offset + 1}-${Math.min(offset + limit, total)} από ${total}`
                      : `Showing ${offset + 1}-${Math.min(offset + limit, total)} of ${total}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                    >
                      {locale === "el" ? "Προηγούμενο" : "Previous"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(offset + limit)}
                      disabled={!hasMore}
                    >
                      {locale === "el" ? "Επόμενο" : "Next"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "el" ? "Λεπτομέρειες Συγχρονισμού" : "Sync Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedDetail?.packageId}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedDetail ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{selectedDetail.totalItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "el" ? "Σύνολο" : "Total"}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">
                    {selectedDetail.successCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "el" ? "Επιτυχή" : "Success"}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">
                    {selectedDetail.failureCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locale === "el" ? "Αποτυχία" : "Failed"}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {selectedDetail.errorMessage && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-1">
                    {locale === "el" ? "Σφάλμα" : "Error"}
                  </p>
                  <p className="text-sm">{selectedDetail.errorMessage}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-2">
                  {locale === "el" ? "Ακίνητα" : "Properties"}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {locale === "el" ? "Ακίνητο" : "Property"}
                      </TableHead>
                      <TableHead>Ref ID</TableHead>
                      <TableHead>
                        {locale === "el" ? "Κατάσταση" : "Status"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDetail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.propertyName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.refId.slice(0, 20)}...
                        </TableCell>
                        <TableCell>
                          {item.status === "SUCCESS" ? (
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : item.status === "FAILED" ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              {locale === "el" ? "Αποτυχία" : "Failed"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {locale === "el" ? "Αναμονή" : "Pending"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
