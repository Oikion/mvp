"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ClientSelector } from "./ClientSelector";
import { PropertySelector } from "./PropertySelector";
import { DocumentSelector } from "./DocumentSelector";
import { useOrgUsers, useUpdateEvent } from "@/hooks/swr";

const createEventFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t("eventCreateForm.titleRequired")),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  assignedUserId: z.string().optional(),
  clientIds: z.array(z.string()).default([]),
  propertyIds: z.array(z.string()).default([]),
  documentIds: z.array(z.string()).default([]),
  reminderMinutes: z.array(z.number()).default([]),
  recurrenceRule: z.string().optional(),
});

interface LinkedEntity {
  id: string;
  client_name?: string;
  property_name?: string;
  document_name?: string;
}

interface EventEditFormProps {
  eventId: string;
  initialData: {
    title?: string;
    description?: string;
    startTime?: string | Date;
    endTime?: string | Date;
    location?: string;
    eventType?: string;
    assignedUserId?: string;
    linkedClients?: LinkedEntity[];
    linkedProperties?: LinkedEntity[];
    linkedDocuments?: LinkedEntity[];
    reminderMinutes?: number[];
    recurrenceRule?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
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

export function EventEditForm({ eventId, initialData, onSuccess, onCancel }: EventEditFormProps) {
  const t = useTranslations("calendar");

  // Use SWR for fetching org users
  const { users } = useOrgUsers();
  
  // Use mutation hook for update
  const { updateEvent, isUpdating } = useUpdateEvent(eventId);

  const eventFormSchema = createEventFormSchema(t);
  type EventFormValues = z.infer<typeof eventFormSchema>;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      startTime: initialData?.startTime ? new Date(initialData.startTime) : new Date(),
      endTime: initialData?.endTime ? new Date(initialData.endTime) : new Date(Date.now() + 60 * 60 * 1000),
      location: initialData?.location || "",
      eventType: initialData?.eventType || undefined,
      assignedUserId: initialData?.assignedUserId || undefined,
      clientIds: initialData?.linkedClients?.map((c) => c.id) || [],
      propertyIds: initialData?.linkedProperties?.map((p) => p.id) || [],
      documentIds: initialData?.linkedDocuments?.map((d) => d.id) || [],
      reminderMinutes: initialData?.reminderMinutes || [],
      recurrenceRule: initialData?.recurrenceRule || undefined,
    },
  });

  async function onSubmit(data: EventFormValues) {
    try {
      await updateEvent({
        title: data.title,
        description: data.description,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        location: data.location,
        eventType: data.eventType,
        assignedUserId: data.assignedUserId,
        clientIds: data.clientIds,
        propertyIds: data.propertyIds,
        documentIds: data.documentIds,
        reminderMinutes: data.reminderMinutes,
        recurrenceRule: data.recurrenceRule,
      });

      toast.success(t("eventEditForm.eventUpdatedSuccess"));
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update event";
      toast.error(message);
    }
  }

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
    <Dialog open={true} onOpenChange={() => onCancel?.()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("eventEditForm.editCalendarEvent")}</DialogTitle>
          <DialogDescription>
            {t("eventEditForm.updateEventDetails")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("eventCreateForm.eventType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("eventCreateForm.selectEventType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>{t("eventCreateForm.pickDate")}</span>
                            )}
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
                            value={
                              field.value
                                ? format(field.value, "HH:mm")
                                : ""
                            }
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
                            {field.value ? (
                              format(field.value, "PPP HH:mm")
                            ) : (
                              <span>{t("eventCreateForm.pickDate")}</span>
                            )}
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
                            value={
                              field.value
                                ? format(field.value, "HH:mm")
                                : ""
                            }
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
                    <Input placeholder={t("eventCreateForm.locationPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="clientIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("eventCreateForm.linkClients")}</FormLabel>
                  <FormControl>
                    <ClientSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
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
                    <PropertySelector
                      value={field.value}
                      onChange={field.onChange}
                    />
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
                    <DocumentSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderMinutes"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">{t("eventCreateForm.reminders")}</FormLabel>
                    <FormDescription>
                      {t("eventCreateForm.remindersDescription")}
                    </FormDescription>
                  </div>
                  <div className="space-y-2">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                {t("eventCreateForm.cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? t("eventEditForm.updating") : t("eventEditForm.updateEvent")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
