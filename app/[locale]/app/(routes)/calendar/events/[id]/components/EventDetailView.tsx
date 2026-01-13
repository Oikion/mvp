"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  Edit,
  Trash2,
  User,
  Link as LinkIcon,
  ExternalLink,
  Calendar as CalendarIcon,
  Bell,
  FileText,
  Building2,
  Home,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EventEditForm } from "@/components/calendar/EventEditForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventDetailViewProps {
  event: any;
  defaultEditOpen?: boolean;
}

export function EventDetailView({ event: initialEvent, defaultEditOpen = false }: EventDetailViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(defaultEditOpen);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      const data = await response.json();
      setEvent(data.event);
    } catch (error) {
      console.error("Failed to fetch event:", error);
      toast.error(t("eventPage.failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success(t("eventPage.eventDeleted"));
      router.push("/app/calendar");
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("eventPage.failedToDelete"));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t("eventPage.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t("eventPage.notFound")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showEditForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowEditForm(false)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("eventPage.backToDetails")}
        </Button>
        <EventEditForm
          eventId={event.id}
          initialData={event}
          onSuccess={() => {
            setShowEditForm(false);
            fetchEvent();
          }}
          onCancel={() => setShowEditForm(false)}
        />
      </div>
    );
  }

  const getEventTypeLabel = (eventType: string) => {
    const typeMap: Record<string, string> = {
      PROPERTY_VIEWING: t("eventPage.eventTypes.propertyViewing"),
      CLIENT_CONSULTATION: t("eventPage.eventTypes.clientConsultation"),
      MEETING: t("eventPage.eventTypes.meeting"),
      REMINDER: t("eventPage.eventTypes.reminder"),
      TASK_DEADLINE: t("eventPage.eventTypes.taskDeadline"),
      OTHER: t("eventPage.eventTypes.other"),
    };
    return typeMap[eventType] || eventType;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/app/calendar")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("eventPage.backToCalendar")}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditForm(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("eventPage.edit")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("eventPage.delete")}
          </Button>
        </div>
      </div>

      {/* Main Event Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <CardTitle className="text-2xl">{event.title || t("eventPage.untitledEvent")}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {event.eventType && (
                  <Badge variant="outline" className="text-sm">
                    {getEventTypeLabel(event.eventType)}
                  </Badge>
                )}
                {event.status && (
                  <Badge variant={getStatusColor(event.status)} className="text-sm">
                    {event.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t("eventPage.description")}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t("eventPage.startTime")}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.startTime), "PPP 'at' HH:mm")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t("eventPage.endTime")}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.endTime), "PPP 'at' HH:mm")}
                </p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("eventPage.duration")}:{" "}
              {Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60))}{" "}
              {t("eventPage.minutes")}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t("eventPage.location")}</h3>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </div>
            </div>
          )}

          {/* Assigned User */}
          {event.assignedUser && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t("eventPage.assignedTo")}</h3>
                <div className="flex items-center gap-2">
                  {event.assignedUser.avatar && (
                    <img
                      src={event.assignedUser.avatar}
                      alt={event.assignedUser.name || ""}
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {event.assignedUser.name || event.assignedUser.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t("eventPage.notes")}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}

          {/* Linked Clients */}
          {event.linkedClients && event.linkedClients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("eventPage.linkedClients")} ({event.linkedClients.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {event.linkedClients.map((client: any) => (
                  <Card key={client.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-0"
                        onClick={() => router.push(`/app/crm/clients/${client.id}`)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{client.client_name}</p>
                            {client.primary_email && (
                              <p className="text-xs text-muted-foreground">{client.primary_email}</p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Linked Properties */}
          {event.linkedProperties && event.linkedProperties.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                {t("eventPage.linkedProperties")} ({event.linkedProperties.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {event.linkedProperties.map((property: any) => (
                  <Card key={property.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-0"
                        onClick={() => router.push(`/app/mls/properties/${property.id}`)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{property.property_name}</p>
                            {(property.address_street || property.address_city) && (
                              <p className="text-xs text-muted-foreground">
                                {[property.address_street, property.address_city].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Linked Documents */}
          {event.linkedDocuments && event.linkedDocuments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("eventPage.linkedDocuments")} ({event.linkedDocuments.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {event.linkedDocuments.map((doc: any) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-0"
                        onClick={() => router.push(`/app/documents/${doc.id}`)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{doc.document_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.document_file_mimeType}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Linked Tasks */}
          {event.linkedTasks && event.linkedTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("eventPage.linkedTasks")} ({event.linkedTasks.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {event.linkedTasks.map((task: any) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-auto p-0"
                        onClick={() => router.push(`/app/crm/tasks/viewtask/${task.id}`)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <p className="font-medium">{task.title}</p>
                            {task.crm_accounts && (
                              <p className="text-xs text-muted-foreground">
                                {t("eventPage.forClient")}: {task.crm_accounts.client_name}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t("eventPage.reminders")} ({event.reminders.length})
              </h3>
              <div className="space-y-2">
                {event.reminders.map((reminder: any) => {
                  const minutesLabel =
                    reminder.reminderMinutes >= 1440
                      ? `${Math.floor(reminder.reminderMinutes / 1440)} ${t("eventPage.days")}`
                      : reminder.reminderMinutes >= 60
                      ? `${Math.floor(reminder.reminderMinutes / 60)} ${t("eventPage.hours")}`
                      : `${reminder.reminderMinutes} ${t("eventPage.minutes")}`;

                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {minutesLabel} {t("eventPage.beforeEvent")}
                          </p>
                          {reminder.scheduledFor && (
                            <p className="text-xs text-muted-foreground">
                              {t("eventPage.scheduledFor")}: {format(new Date(reminder.scheduledFor), "PPP 'at' HH:mm")}
                            </p>
                          )}
                          {reminder.sentAt && (
                            <p className="text-xs text-muted-foreground">
                              {t("eventPage.sentAt")}: {format(new Date(reminder.sentAt), "PPP 'at' HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          reminder.status === "SENT"
                            ? "default"
                            : reminder.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {reminder.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("eventPage.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("eventPage.deleteConfirmationMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t("eventPage.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("eventPage.deleting") : t("eventPage.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

