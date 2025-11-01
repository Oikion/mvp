"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useClerkTheme } from "@/lib/clerk-theme";

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance } = useClerkTheme();

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}

