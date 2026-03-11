"use client";

import * as React from "react";
import { Moon, Sun, Palette, Home } from "lucide-react";
import { useTheme } from "next-themes";
import { updateUserTheme } from "@/actions/user/update-theme";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * ThemeToggle Component - Oikion Design System
 * 
 * Theme selector showing theme options with visual indicators
 * - Light: Clean, bright, crisp
 * - Dark: Darker surfaces, maintain readability
 * - Pearl Sand: Warm pastel beige/taupe accents, darker easy-reading mode
 * - Twilight Lavender: Muted violet/lavender accents
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    updateUserTheme(value).catch(console.error);
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "estate", label: "Estate", icon: Home },
    { value: "estate-dark", label: "Estate Dark", icon: Home },
    { value: "twilight-lavender", label: "Twilight Lavender", icon: Palette },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Icon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {themes.map((themeOption) => {
          const ThemeIcon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className="flex items-center gap-2"
            >
              <ThemeIcon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              {theme === themeOption.value && (
                <span className="ml-auto text-xs">✓</span>
              )}
        </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Sun className="h-4 w-4 mr-2" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
