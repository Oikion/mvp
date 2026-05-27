import { z } from "zod";

export const createCalendarEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(500),
    description: z.string().max(5000).optional().nullable(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    location: z.string().max(500).optional().nullable(),
    clientIds: z.array(z.string()).optional(),
    contactIds: z.array(z.string()).optional(),
    propertyIds: z.array(z.string()).default([]),
    documentIds: z.array(z.string()).default([]),
    mandateIds: z.array(z.string()).optional(),
    requestIds: z.array(z.string()).optional(),
    taskIds: z.array(z.string()).default([]),
    userId: z.string().optional().nullable(),
    assignedUserId: z.string().optional().nullable(),
    eventType: z.string().max(100).optional().nullable(),
    reminderMinutes: z.array(z.number().int().min(0)).default([]),
    recurrenceRule: z.string().max(500).optional().nullable(),
  })
  .strict()
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const updateCalendarEventSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional().nullable(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    location: z.string().max(500).optional().nullable(),
    status: z.string().max(100).optional(),
    clientIds: z.array(z.string()).optional(),
    contactIds: z.array(z.string()).optional(),
    propertyIds: z.array(z.string()).optional(),
    documentIds: z.array(z.string()).optional(),
    mandateIds: z.array(z.string()).optional(),
    requestIds: z.array(z.string()).optional(),
    taskIds: z.array(z.string()).optional(),
    assignedUserId: z.string().optional().nullable(),
    eventType: z.string().max(100).optional().nullable(),
    reminderMinutes: z.array(z.number().int().min(0)).optional(),
    recurrenceRule: z.string().max(500).optional().nullable(),
  })
  .strict()
  .refine(
    (d) =>
      !d.startTime || !d.endTime || new Date(d.endTime) > new Date(d.startTime),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
