"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSelectWithOther } from "@/components/ui/form-select-with-other";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ClientSelector } from "./ClientSelector";
import { PropertySelector } from "./PropertySelector";
import { DocumentSelector } from "./DocumentSelector";
import { LocationAutocomplete, LocationData } from "./LocationAutocomplete";
import { InviteeSelector, Invitee } from "./InviteeSelector";
import { useOrgUsers, useCreateEvent } from "@/hooks/swr";
import { inviteToEvent } from "@/actions/calendar/invite-to-event";

const createEventFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t("eventCreateForm.titleRequired")),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.union([z.string(), z.custom<LocationData>()]).optional(),
  eventType: z.string().optional(),
  eventTypeOther: z.string().optional(),
  assignedUserId: z.string().optional(),
  clientIds: z.array(z.string()).default([]),
  propertyIds: z.array(z.string()).default([]),
  documentIds: z.array(z.string()).default([]),
  reminderMinutes: z.array(z.number()).default([]),
  recurrenceRule: z.string().optional(),
  invitees: z.array(z.custom<Invitee>()).default([]),
});

interface EventCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  clientId?: string;
  propertyId?: string;
  onSuccess?: () => void;
  defaultStartTime?: Date | null;
  defaultEndTime?: Date | null;
}

const REMINDER_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "24 hours" },
  { value: 2880, label: "48 hours" },
];

const EVENT_TYPES = [
  { value: "PROPERTY_VIEWING", label: "Property Viewing" },
  { value: "CLIENT_CONSULTATION", label: "Client Consultation" },
  { value: "MEETING", label: "Meeting" },
  { value: "REMINDER", label: "Reminder" },
  { value: "TASK_DEADLINE", label: "Task Deadline" },
  { value: "OTHER", label: "Other" },
];

type EventFormValues = z.infer<ReturnType<typeof createEventFormSchema>>;

function EventCreateFormBody({
  t,
  form,
  isCreating,
  users,
  onSubmit,
  onCancel,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  form: ReturnType<typeof useForm<EventFormValues>>;
  isCreating: boolean;
  users: Array<{ id: string; name: string | null; email: string }>;
  onSubmit: (data: EventFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const selectedReminders = form.watch("reminderMinutes");

  const handleReminderToggle = (minutes: number) => {
    const current = form.getValues("reminderMinutes");
    if (current.includes(minutes)) {
      form.setValue("reminderMinutes", current.filter((m) => m !== minutes));
    } else {
      form.setValue("reminderMinutes", [...current, minutes]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6 px-0.5">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.basicInfo") || "Basic Information"}
          </h3>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.title")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("eventCreateForm.titlePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormSelectWithOther<EventFormValues, "eventType">
            name="eventType"
            otherFieldName="eventTypeOther"
            label={t("eventCreateForm.eventType")}
            placeholder={t("eventCreateForm.selectEventType")}
            otherLabel={t("eventCreateForm.specifyEventType")}
            otherPlaceholder={t("eventCreateForm.specifyEventTypePlaceholder")}
            options={EVENT_TYPES}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("eventCreateForm.descriptionPlaceholder")}
                    className="resize-none min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Date & Time Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.dateTime") || "Date & Time"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("eventCreateForm.startTime")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP HH:mm") : <span>{t("eventCreateForm.pickDate")}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={field.value ? format(field.value, "HH:mm") : ""}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":");
                            if (hours && minutes && field.value) {
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours));
                              newDate.setMinutes(parseInt(minutes));
                              field.onChange(newDate);
                            }
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("eventCreateForm.endTime")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP HH:mm") : <span>{t("eventCreateForm.pickDate")}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={field.value ? format(field.value, "HH:mm") : ""}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":");
                            if (hours && minutes && field.value) {
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours));
                              newDate.setMinutes(parseInt(minutes));
                              field.onChange(newDate);
                            }
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.location")}</FormLabel>
                <FormControl>
                  <LocationAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("eventCreateForm.locationPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Assignment Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.assignment") || "Assignment"}
          </h3>

          <FormField
            control={form.control}
            name="assignedUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.assignedUser")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("eventCreateForm.selectUser")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Linked Entities Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.linkedEntities") || "Linked Entities"}
          </h3>

          <FormField
            control={form.control}
            name="clientIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.linkClients")}</FormLabel>
                <FormControl>
                  <ClientSelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="propertyIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.linkProperties")}</FormLabel>
                <FormControl>
                  <PropertySelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="documentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("eventCreateForm.linkDocuments")}</FormLabel>
                <FormControl>
                  <DocumentSelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Invitees Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.invitees")}
          </h3>

          <FormField
            control={form.control}
            name="invitees"
            render={({ field }) => (
              <FormItem>
                <FormDescription>{t("eventCreateForm.inviteesDescription")}</FormDescription>
                <FormControl>
                  <InviteeSelector value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Reminders Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("eventCreateForm.reminders")}
          </h3>

          <FormField
            control={form.control}
            name="reminderMinutes"
            render={() => (
              <FormItem>
                <FormDescription>{t("eventCreateForm.remindersDescription")}</FormDescription>
                <div className="space-y-2 mt-2">
                  {REMINDER_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`reminder-${option.value}`}
                        checked={selectedReminders.includes(option.value)}
                        onCheckedChange={() => handleReminderToggle(option.value)}
                      />
                      <label
                        htmlFor={`reminder-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label} {t("eventCreateForm.beforeEvent")}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 pb-6">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            {t("eventCreateForm.cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={isCreating}>
            {isCreating ? t("eventCreateForm.creating") : t("eventCreateForm.createEvent")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function EventCreateForm({ 
  open, 
  onOpenChange, 
  userId, 
  clientId, 
  propertyId, 
  onSuccess,
  defaultStartTime,
  defaultEndTime,
}: EventCreateFormProps) {
  const t = useTranslations("calendar");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();
  
  // Use mutation hook for create
  const { createEvent, isCreating } = useCreateEvent();

  const eventFormSchema = createEventFormSchema(t);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: defaultStartTime || new Date(),
      endTime: defaultEndTime || new Date(Date.now() + 60 * 60 * 1000), // Default 1 hour later
      location: "",
      eventType: undefined,
      eventTypeOther: "",
      assignedUserId: userId || undefined,
      clientIds: clientId ? [clientId] : [],
      propertyIds: propertyId ? [propertyId] : [],
      documentIds: [],
      reminderMinutes: [],
      recurrenceRule: undefined,
      invitees: [],
    },
  });

  // Update form when default times change
  React.useEffect(() => {
    if (defaultStartTime) {
      form.setValue("startTime", defaultStartTime);
    }
    if (defaultEndTime) {
      form.setValue("endTime", defaultEndTime);
    }
  }, [defaultStartTime, defaultEndTime, form]);

  async function onSubmit(data: EventFormValues) {
    try {
      // Extract location string from LocationData if needed
      const locationString = typeof data.location === "string" 
        ? data.location 
        : (data.location as LocationData)?.address || "";

      const event = await createEvent({
        title: data.title,
        description: data.description,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        location: locationString,
        eventType: data.eventType,
        assignedUserId: data.assignedUserId,
        clientIds: data.clientIds,
        propertyIds: data.propertyIds,
        documentIds: data.documentIds,
        reminderMinutes: data.reminderMinutes,
        recurrenceRule: data.recurrenceRule,
      });

      // Send invitations if there are invitees
      if (data.invitees && data.invitees.length > 0 && event?.id) {
        try {
          const userIds = data.invitees.map((inv) => inv.userId);
          await inviteToEvent({ eventId: event.id, userIds });
          toast.success(t("invitees.notifications.invitationsSent", { count: userIds.length }));
        } catch (inviteError) {
          console.error("Failed to send invitations:", inviteError);
          toast.error(t("invitees.notifications.failedToSend"));
        }
      }

      toast.success(t("eventCreateForm.eventCreatedSuccess"));
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("eventCreateForm.failedToCreateEvent");
      toast.error(message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t("eventCreateForm.createCalendarEvent")}</SheetTitle>
          <SheetDescription>
            {t("eventCreateForm.addNewEvent")}
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          <EventCreateFormBody
            t={t}
            form={form}
            isCreating={isCreating}
            users={users}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function EventCreateSidePanel({
  open,
  onOpenChange,
  userId,
  clientId,
  propertyId,
  onSuccess,
  defaultStartTime,
  defaultEndTime,
}: EventCreateFormProps) {
  const t = useTranslations("calendar");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();

  // Use mutation hook for create
  const { createEvent, isCreating } = useCreateEvent();

  const eventFormSchema = createEventFormSchema(t);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: defaultStartTime || new Date(),
      endTime: defaultEndTime || new Date(Date.now() + 60 * 60 * 1000),
      location: "",
      eventType: undefined,
      eventTypeOther: "",
      assignedUserId: userId || undefined,
      clientIds: clientId ? [clientId] : [],
      propertyIds: propertyId ? [propertyId] : [],
      documentIds: [],
      reminderMinutes: [],
      recurrenceRule: undefined,
      invitees: [],
    },
  });

  // Update form when default times change
  React.useEffect(() => {
    if (defaultStartTime) {
      form.setValue("startTime", defaultStartTime);
    }
    if (defaultEndTime) {
      form.setValue("endTime", defaultEndTime);
    }
  }, [defaultStartTime, defaultEndTime, form]);

  async function onSubmit(data: EventFormValues) {
    try {
      const locationString =
        typeof data.location === "string"
          ? data.location
          : (data.location as LocationData)?.address || "";

      const event = await createEvent({
        title: data.title,
        description: data.description,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        location: locationString,
        eventType: data.eventType,
        assignedUserId: data.assignedUserId,
        clientIds: data.clientIds,
        propertyIds: data.propertyIds,
        documentIds: data.documentIds,
        reminderMinutes: data.reminderMinutes,
        recurrenceRule: data.recurrenceRule,
      });

      if (data.invitees && data.invitees.length > 0 && event?.id) {
        try {
          const userIds = data.invitees.map((inv) => inv.userId);
          await inviteToEvent({ eventId: event.id, userIds });
          toast.success(t("invitees.notifications.invitationsSent", { count: userIds.length }));
        } catch (inviteError) {
          console.error("Failed to send invitations:", inviteError);
          toast.error(t("invitees.notifications.failedToSend"));
        }
      }

      toast.success(t("eventCreateForm.eventCreatedSuccess"));
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("eventCreateForm.failedToCreateEvent");
      toast.error(message);
    }
  }

  if (!open) return null;

  return (
    <div className="w-full sm:w-[420px] lg:w-[460px] xl:w-[520px] border-l bg-background flex flex-col h-full">
      <div className="px-6 py-4 border-b flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{t("eventCreateForm.createCalendarEvent")}</div>
          <div className="text-sm text-muted-foreground">{t("eventCreateForm.addNewEvent")}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label={t("eventCreateForm.cancel")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-6">
        <EventCreateFormBody
          t={t}
          form={form}
          isCreating={isCreating}
          users={users}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </ScrollArea>
    </div>
  );
}

// Trigger button component for use in other components
interface EventCreateTriggerProps {
  onClick: () => void;
}

export function EventCreateTrigger({ onClick }: EventCreateTriggerProps) {
  const t = useTranslations("calendar");
  
  return (
    <Button onClick={onClick}>
      <Plus className="h-4 w-4 mr-2" />
      {t("eventCreateForm.newEvent")}
    </Button>
  );
}
