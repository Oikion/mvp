"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Home, 
  Euro, 
  Bed, 
  Clock, 
  MessageSquare,
  Loader2,
} from "lucide-react";
import { updateAssignmentStatus } from "@/actions/assignments/update-assignment-status";
import { useAppToast } from "@/hooks/use-app-toast";
import type { PropertyInquiry } from "@prisma/client";
import { useParams } from "next/navigation";

interface AssignmentCardProps {
  inquiry: PropertyInquiry;
}

export function AssignmentCard({ inquiry }: AssignmentCardProps) {
  const t = useTranslations("assignments");
  const { toast } = useAppToast();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(inquiry.status);
  const [notes, setNotes] = useState(inquiry.notes || "");
  const [showNotesDialog, setShowNotesDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "success" | "outline"> = {
      NEW: "default",
      READ: "secondary",
      CONTACTED: "success",
      ARCHIVED: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateAssignmentStatus({
        inquiryId: inquiry.id,
        status: newStatus as PropertyInquiry["status"],
      });

      if (result.success) {
        setSelectedStatus(newStatus as PropertyInquiry["status"]);
        toast.success(t("statusUpdated"), {
          isTranslationKey: false,
        });
      } else {
        toast.error(t("statusUpdateFailed"), {
          isTranslationKey: false,
        });
      }
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      const result = await updateAssignmentStatus({
        inquiryId: inquiry.id,
        notes,
      });

      if (result.success) {
        setShowNotesDialog(false);
        toast.success(t("notesSaved"), {
          isTranslationKey: false,
        });
      } else {
        toast.error(t("notesSaveFailed"), {
          isTranslationKey: false,
        });
      }
    });
  };

  const formatDate = (date: Date) => {
    const dateLocale = locale === "el" ? el : enUS;
    return format(new Date(date), "PPp", { locale: dateLocale });
  };

  const formatPropertyType = (type: string) => {
    return t(`propertyType.${type.toLowerCase()}`);
  };

  const formatTimeline = (timeline: string) => {
    return t(`timeline.${timeline.replace("+", "plus").replace("-", "to")}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {inquiry.inquirerName}
                {getStatusBadge(selectedStatus)}
              </CardTitle>
              <CardDescription>
                {t("submittedOn")} {formatDate(inquiry.createdAt)}
              </CardDescription>
            </div>
            <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={isPending}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">{t("status.new")}</SelectItem>
                <SelectItem value="READ">{t("status.read")}</SelectItem>
                <SelectItem value="CONTACTED">{t("status.contacted")}</SelectItem>
                <SelectItem value="ARCHIVED">{t("status.archived")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{t("contactInfo")}</h4>
            <div className="grid gap-2">
              {inquiry.inquirerEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${inquiry.inquirerEmail}`}
                    className="text-primary hover:underline"
                  >
                    {inquiry.inquirerEmail}
                  </a>
                </div>
              )}
              {inquiry.inquirerPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${inquiry.inquirerPhone}`}
                    className="text-primary hover:underline"
                  >
                    {inquiry.inquirerPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{t("propertyDetails")}</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {inquiry.propertyType && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPropertyType(inquiry.propertyType)}</span>
                </div>
              )}
              {inquiry.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{inquiry.location}</span>
                </div>
              )}
              {inquiry.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span>{inquiry.budget}</span>
                </div>
              )}
              {inquiry.bedrooms && (
                <div className="flex items-center gap-2 text-sm">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span>{inquiry.bedrooms}</span>
                </div>
              )}
              {inquiry.timeline && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatTimeline(inquiry.timeline)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {inquiry.message && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("message")}
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {inquiry.message}
              </p>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">{t("notes")}</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {notes}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotesDialog(true)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {notes ? t("editNotes") : t("addNotes")}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notesDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notesDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesDialog.placeholder")}
            rows={5}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notesDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveNotes} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("notesDialog.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
