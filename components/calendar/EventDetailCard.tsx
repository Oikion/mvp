"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Edit, Trash2, User, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EventEditForm } from "./EventEditForm";
import { useCalendarEvent, useDeleteEvent } from "@/hooks/swr";

interface EventDetailCardProps {
  eventId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export function EventDetailCard({ eventId, onClose, onUpdate }: EventDetailCardProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [showEditForm, setShowEditForm] = useState(false);

  // Use SWR for fetching event details
  const { event, isLoading, mutate } = useCalendarEvent(eventId);
  
  // Use mutation hook for delete
  const { deleteEvent, isDeleting } = useDeleteEvent(eventId);

  const handleDelete = async () => {
    if (!confirm(t("eventDetail.confirmDelete"))) {
      return;
    }

    try {
      await deleteEvent();
      toast.success(t("eventDetail.eventDeleted"));
      onClose?.();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t("eventDetail.loading")}
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
            {t("eventDetail.notFound")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showEditForm) {
    // Transform null values to undefined for EventEditForm compatibility
    const initialData = {
      ...event,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      eventType: event.eventType ?? undefined,
      status: event.status ?? undefined,
      recurrenceRule: event.recurrenceRule ?? undefined,
    };
    return (
      <EventEditForm
        eventId={eventId}
        initialData={initialData}
        onSuccess={() => {
          setShowEditForm(false);
          mutate(); // Revalidate SWR cache
          onUpdate?.();
        }}
        onCancel={() => setShowEditForm(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{event.title || "Untitled Event"}</CardTitle>
            {event.eventType && (
              <Badge variant="outline" className="mt-2">
                {event.eventType}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditForm(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("eventDetail.edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("eventDetail.delete")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.description && (
          <div>
            <h4 className="text-sm font-semibold mb-1">{t("eventDetail.description")}</h4>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(event.startTime), "PPP 'at' HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{event.location}</span>
          </div>
        )}

        {event.assignedUser && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{event.assignedUser.name || event.assignedUser.email}</span>
          </div>
        )}

        {event.linkedClients && event.linkedClients.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t("eventDetail.linkedClients")}</h4>
            <div className="space-y-1">
              {event.linkedClients.map((client) => (
                <Button
                  key={client.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push(`/app/crm/clients/${client.id}`)}
                >
                  <LinkIcon className="h-3 w-3 mr-2" />
                  {client.client_name}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {event.linkedProperties && event.linkedProperties.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t("eventDetail.linkedProperties")}</h4>
            <div className="space-y-1">
              {event.linkedProperties.map((property) => (
                <Button
                  key={property.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push(`/app/mls/properties/${property.id}`)}
                >
                  <LinkIcon className="h-3 w-3 mr-2" />
                  {property.property_name}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {event.linkedDocuments && event.linkedDocuments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t("eventDetail.linkedDocuments")}</h4>
            <div className="space-y-1">
              {event.linkedDocuments.map((doc) => (
                <Button
                  key={doc.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push(`/app/documents/${doc.id}`)}
                >
                  <LinkIcon className="h-3 w-3 mr-2" />
                  {doc.document_name}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {event.reminders && event.reminders.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t("eventDetail.reminders")}</h4>
            <div className="space-y-1">
              {event.reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between text-sm">
                  <span>
                    {parseInt(String(reminder.scheduledFor)) >= 1440
                      ? `${Math.floor(parseInt(String(reminder.scheduledFor)) / 1440)} day(s)`
                      : parseInt(String(reminder.scheduledFor)) >= 60
                      ? `${Math.floor(parseInt(String(reminder.scheduledFor)) / 60)} hour(s)`
                      : `${reminder.scheduledFor} minute(s)`} {t("eventDetail.beforeEvent")}
                  </span>
                  <Badge variant={reminder.sent ? "default" : "secondary"}>
                    {reminder.sent ? "SENT" : "PENDING"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
