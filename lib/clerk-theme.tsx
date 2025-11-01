"use client";

import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { useEffect, useState } from "react";

export function useClerkTheme() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme to handle "system" theme
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return {
    appearance: isDark ? { baseTheme: dark } : undefined,
    mounted,
  };
}

