import { z } from "zod";

// Schema for task data with related user info
export const taskSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  assigned_to_user: z.object({
    name: z.string().nullable(),
  }).nullable().optional(),
});

export type Task = z.infer<typeof taskSchema>;
