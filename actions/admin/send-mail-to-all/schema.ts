import { z } from "zod";

export const SendMailToAll = z
  .object({
    title: z
      .string()
      .min(3, { message: "Title must be at least 3 characters long" })
      .max(200, { message: "Title must be at most 200 characters" }),
    message: z
      .string()
      .min(3, { message: "Message must be at least 3 characters long" })
      .max(50000, { message: "Message must be at most 50,000 characters" }),
  })
  .strict();
