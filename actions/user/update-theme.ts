"use server";

import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

/**
 * Persists the user's theme choice to the database so it can be used
 * for email theming and other server-side personalization.
 */
const ALLOWED_THEMES = ["light", "dark", "system", "estate", "estate-dark", "modern", "minimal"];

export async function updateUserTheme(theme: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  if (!ALLOWED_THEMES.includes(theme)) return;

  await prismadb.users.update({
    where: { id: user.id },
    data: { userTheme: theme },
  });
}
