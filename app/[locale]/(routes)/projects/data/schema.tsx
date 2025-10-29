import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  visibility: z.string(),
  updatedAt: z.union([z.string(), z.date()]),
  assigned_user: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Task = z.infer<typeof taskSchema>;
