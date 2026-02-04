import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  created_on: z.date(),
  lastLoginAt: z.date().nullable().optional(),
  is_admin: z.boolean(),
  is_account_admin: z.boolean().optional(),
  name: z.string().nullable().optional(),
  email: z.string(),
  avatar: z.string().nullable().optional(),
  userStatus: z.string(),
  userLanguage: z.string(),
  v: z.number().optional(),
});

export type User = z.infer<typeof userSchema>;

