"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Trash2,
  Clock,
} from "lucide-react";
import { DataRequestActionDialog } from "./DataRequestActionDialog";

interface DataRequestItem {
  id: string;
  type: "EXPORT" | "DELETION";
  userEmail: string;
  userName: string | null;
  organizationId: string;
  status: string;
  reason?: string | null;
  gracePeriodEndsAt?: Date | null;
  reviewNote?: string | null;
  createdAt: Date;
}

interface DataRequestsDataTableProps {
  requests: DataRequestItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentType: string;
  currentStatus: string;
  locale: string;
}

export function DataRequestsDataTable({
  requests,
  totalCount,
  page,
  totalPages,
  currentSearch,
  currentType,
  currentStatus,
  locale,
}: DataRequestsDataTableProps) {
  const t = useTranslations("platformAdmin.dataRequests");
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [selectedRequest, setSelectedRequest] =
    useState<DataRequestItem | null>(null);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "execute" | null
  >(null);

  const updateUrl = (params: Record<string, string>) => {
    const url = new URL(globalThis.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    url.searchParams.delete("page"); // Reset page on filter change
    router.push(url.pathname + url.search);
  };

  const handleSearch = () => {
    updateUrl({ search });
  };

  const handlePageChange = (newPage: number) => {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("page", String(newPage));
    router.push(url.pathname + url.search);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: "bg-amber-500/10 border-amber-500/30 text-amber-700",
      APPROVED: "bg-green-500/10 border-green-500/30 text-green-700",
      PROCESSING: "bg-blue-500/10 border-blue-500/30 text-blue-700",
      COMPLETED: "bg-green-500/10 border-green-500/30 text-green-700",
      FAILED: "bg-red-500/10 border-red-500/30 text-red-700",
      EXPIRED: "bg-muted border-muted-foreground/30 text-muted-foreground",
      CANCELLED: "bg-muted border-muted-foreground/30 text-muted-foreground",
      REJECTED: "bg-red-500/10 border-red-500/30 text-red-700",
    };

    return (
      <Badge
        variant="outline"
        className={statusColors[status] || ""}
      >
        {t(`status.${status}` as Parameters<typeof t>[0])}
      </Badge>
    );
  };

  const getTypeBadge = (type: "EXPORT" | "DELETION") => {
    if (type === "EXPORT") {
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 border-blue-500/30 text-blue-700"
        >
          <Download className="h-3 w-3 mr-1" />
          {t("table.export")}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-red-500/10 border-red-500/30 text-red-700"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        {t("table.deletion")}
      </Badge>
    );
  };

  const canTakeAction = (req: DataRequestItem) => {
    return req.type === "DELETION" && ["PENDING", "APPROVED"].includes(req.status);
  };

  const gracePeriodExpired = (req: DataRequestItem) => {
    if (!req.gracePeriodEndsAt) return false;
    return new Date(req.gracePeriodEndsAt) < new Date();
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("table.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} aria-label="Search">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <Select
          value={currentType}
          onValueChange={(value) => updateUrl({ type: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("filters.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
            <SelectItem value="EXPORT">{t("filters.exports")}</SelectItem>
            <SelectItem value="DELETION">{t("filters.deletions")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentStatus}
          onValueChange={(value) => updateUrl({ status: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
            <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
            <SelectItem value="APPROVED">{t("status.APPROVED")}</SelectItem>
            <SelectItem value="PROCESSING">{t("status.PROCESSING")}</SelectItem>
            <SelectItem value="COMPLETED">{t("status.COMPLETED")}</SelectItem>
            <SelectItem value="REJECTED">{t("status.REJECTED")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.organization")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.created")}</TableHead>
              <TableHead>{t("table.gracePeriod")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("table.noRequests")}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={`${req.type}-${req.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{req.userEmail}</p>
                      {req.userName && (
                        <p className="text-xs text-muted-foreground">
                          {req.userName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {req.organizationId.slice(0, 12)}...
                  </TableCell>
                  <TableCell>{getTypeBadge(req.type)}</TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {req.type === "DELETION" && req.gracePeriodEndsAt ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(req.gracePeriodEndsAt).toLocaleDateString()}
                        {gracePeriodExpired(req) && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-xs bg-red-500/10 text-red-700"
                          >
                            Expired
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canTakeAction(req) && (
                      <div className="flex gap-1 justify-end">
                        {req.status === "PENDING" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("approve");
                              }}
                            >
                              {t("actions.approve")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("reject");
                              }}
                            >
                              {t("actions.reject")}
                            </Button>
                          </>
                        )}
                        {req.status === "APPROVED" &&
                          gracePeriodExpired(req) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("execute");
                              }}
                            >
                              {t("actions.execute")}
                            </Button>
                          )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {totalCount} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="flex items-center text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {selectedRequest && actionType && (
        <DataRequestActionDialog
          request={selectedRequest}
          actionType={actionType}
          open={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          locale={locale}
        />
      )}
    </>
  );
}
