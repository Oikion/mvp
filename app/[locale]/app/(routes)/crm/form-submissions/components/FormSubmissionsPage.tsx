"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Mail,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Phone,
  Archive,
  Trash2,
  Search,
  Filter,
  Loader2,
  MessageSquare,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import type { FormSubmission } from "@/actions/crm/form-submissions";
import {
  updateSubmissionStatus,
  deleteSubmission,
  updateSubmissionNotes,
  getFormSubmissions,
} from "@/actions/crm/form-submissions";
import { SubmissionStatus } from "@prisma/client";

interface FormSubmissionsPageProps {
  initialSubmissions: FormSubmission[];
  initialTotal: number;
  counts: Record<SubmissionStatus | "all", number>;
  dict: any;
  locale: string;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; labelEl: string; color: string; icon: any }> = {
  NEW: {
    label: "New",
    labelEl: "Νέο",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: MessageSquare,
  },
  READ: {
    label: "Read",
    labelEl: "Διαβάστηκε",
    color: "bg-slate-500/10 text-muted-foreground border-slate-500/20",
    icon: Eye,
  },
  CONTACTED: {
    label: "Contacted",
    labelEl: "Επικοινώνησα",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  ARCHIVED: {
    label: "Archived",
    labelEl: "Αρχειοθετημένο",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Archive,
  },
};

export function FormSubmissionsPage({
  initialSubmissions,
  initialTotal,
  counts,
  dict,
  locale,
}: FormSubmissionsPageProps) {
  const router = useRouter();
  const { toast } = useAppToast();
  const dateLocale = locale === "el" ? el : enUS;
  const t = dict?.crm?.formSubmissions || {};

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    // Status filter
    if (statusFilter !== "all" && s.status !== statusFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = s.senderName?.toLowerCase().includes(query);
      const matchesEmail = s.senderEmail?.toLowerCase().includes(query);
      const matchesContent = Object.values(s.formData).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesEmail && !matchesContent) return false;
    }

    return true;
  });

  const handleStatusChange = async (id: string, status: SubmissionStatus) => {
    startTransition(async () => {
      const result = await updateSubmissionStatus(id, status);
      if (result.success) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status } : s))
        );
        if (selectedSubmission?.id === id) {
          setSelectedSubmission((prev) => prev ? { ...prev, status } : null);
        }
        toast.success(locale, { isTranslationKey: false });
      } else {
        toast.error(result.error, { isTranslationKey: false });
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "el" ? "Είστε σίγουροι;" : "Are you sure?")) return;

    startTransition(async () => {
      const result = await deleteSubmission(id);
      if (result.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSubmission?.id === id) {
          setIsDetailOpen(false);
          setSelectedSubmission(null);
        }
        toast.success(locale, { isTranslationKey: false });
      } else {
        toast.error(result.error, { isTranslationKey: false });
      }
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedSubmission) return;

    startTransition(async () => {
      const result = await updateSubmissionNotes(selectedSubmission.id, notes);
      if (result.success) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.id ? { ...s, notes } : s
          )
        );
        setSelectedSubmission((prev) => prev ? { ...prev, notes } : null);
        toast.success(locale, { isTranslationKey: false });
      } else {
        toast.error(result.error, { isTranslationKey: false });
      }
    });
  };

  const openDetail = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setNotes(submission.notes || "");
    setIsDetailOpen(true);

    // Auto-mark as read if new
    if (submission.status === "NEW") {
      handleStatusChange(submission.id, "READ");
    }
  };

  const getStatusLabel = (status: SubmissionStatus) => {
    return locale === "el" ? STATUS_CONFIG[status].labelEl : STATUS_CONFIG[status].label;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["all", "NEW", "READ", "CONTACTED", "ARCHIVED"] as const).map((status) => {
          const config = status === "all" ? null : STATUS_CONFIG[status];
          const Icon = config?.icon || MessageSquare;
          const isActive = statusFilter === status;

          return (
            <Card
              key={status}
              className={`cursor-pointer transition-all ${
                isActive ? "ring-2 ring-primary" : "hover:bg-muted/50"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{counts[status]}</p>
                    <p className="text-xs text-muted-foreground">
                      {status === "all"
                        ? locale === "el"
                          ? "Όλα"
                          : "All"
                        : getStatusLabel(status)}
                    </p>
                  </div>
                  <Icon className={`h-5 w-5 ${config?.color.split(" ")[1] || "text-muted-foreground"}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={locale === "el" ? "Αναζήτηση..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="rounded-full w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {locale === "el" ? "Δεν υπάρχουν υποβολές" : "No submissions"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === "el"
                ? "Οι υποβολές από τη φόρμα επικοινωνίας θα εμφανιστούν εδώ."
                : "Submissions from your contact form will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((submission) => {
            const statusConfig = STATUS_CONFIG[submission.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={submission.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(submission)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {submission.senderName || (locale === "el" ? "Ανώνυμος" : "Anonymous")}
                        </CardTitle>
                        {submission.senderEmail && (
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {submission.senderEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {getStatusLabel(submission.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {submission.formData.message ||
                      Object.values(submission.formData).find(
                        (v) => typeof v === "string" && v.length > 20
                      ) ||
                      (locale === "el" ? "Χωρίς μήνυμα" : "No message")}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(submission.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "el" ? "Αποστολέας" : "Sender"}</TableHead>
                <TableHead>{locale === "el" ? "Email" : "Email"}</TableHead>
                <TableHead>{locale === "el" ? "Κατάσταση" : "Status"}</TableHead>
                <TableHead>{locale === "el" ? "Ημερομηνία" : "Date"}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => {
                const statusConfig = STATUS_CONFIG[submission.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow
                    key={submission.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(submission)}
                  >
                    <TableCell className="font-medium">
                      {submission.senderName || (locale === "el" ? "Ανώνυμος" : "Anonymous")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {submission.senderEmail || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(submission.createdAt), "dd MMM yyyy", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(submission); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            {locale === "el" ? "Προβολή" : "View"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(submission.id, "CONTACTED"); }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {locale === "el" ? "Σημείωση ως επικοινώνησα" : "Mark as contacted"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(submission.id, "ARCHIVED"); }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {locale === "el" ? "Αρχειοθέτηση" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(submission.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {locale === "el" ? "Διαγραφή" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedSubmission.senderName || (locale === "el" ? "Ανώνυμος" : "Anonymous")}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={STATUS_CONFIG[selectedSubmission.status].color}
                  >
                    {getStatusLabel(selectedSubmission.status)}
                  </Badge>
                </div>
                <DialogDescription>
                  {format(new Date(selectedSubmission.createdAt), "PPpp", {
                    locale: dateLocale,
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                {selectedSubmission.senderEmail && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <a
                      href={`mailto:${selectedSubmission.senderEmail}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {selectedSubmission.senderEmail}
                    </a>
                    {selectedSubmission.formData.phone && (
                      <a
                        href={`tel:${selectedSubmission.formData.phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {selectedSubmission.formData.phone}
                      </a>
                    )}
                  </div>
                )}

                {/* Form Data */}
                <div className="space-y-4">
                  <h4 className="font-medium">
                    {locale === "el" ? "Λεπτομέρειες Φόρμας" : "Form Details"}
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(selectedSubmission.formData).map(([key, value]) => {
                      if (key === "privacyConsent") return null;
                      const formattedKey = key
                        .replace(/_/g, " ")
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim();

                      return (
                        <div key={key} className="border-b pb-3 last:border-0">
                          <p className="text-sm text-muted-foreground mb-1">
                            {formattedKey}
                          </p>
                          <p className="whitespace-pre-wrap">
                            {typeof value === "boolean"
                              ? value
                                ? locale === "el"
                                  ? "Ναι"
                                  : "Yes"
                                : locale === "el"
                                ? "Όχι"
                                : "No"
                              : String(value || "-")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {locale === "el" ? "Σημειώσεις" : "Notes"}
                  </h4>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      locale === "el"
                        ? "Προσθέστε σημειώσεις..."
                        : "Add notes..."
                    }
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isPending || notes === selectedSubmission.notes}
                  >
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {locale === "el" ? "Αποθήκευση" : "Save"}
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(v) =>
                      handleStatusChange(selectedSubmission.id, v as SubmissionStatus)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  {selectedSubmission.senderEmail && (
                    <Button variant="outline" asChild>
                      <a href={`mailto:${selectedSubmission.senderEmail}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        {locale === "el" ? "Αποστολή Email" : "Send Email"}
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedSubmission.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {locale === "el" ? "Διαγραφή" : "Delete"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
