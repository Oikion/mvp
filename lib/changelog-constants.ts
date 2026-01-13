// Changelog types and constants
// Separated from server actions to avoid "use server" export restrictions

export interface ChangelogTag {
  name: string;
  color: string;
}

export interface ChangelogCategoryData {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

// Preset colors for tags and categories
export const TAG_COLORS = [
  { name: "Gray", value: "gray" },
  { name: "Red", value: "red" },
  { name: "Orange", value: "orange" },
  { name: "Amber", value: "amber" },
  { name: "Yellow", value: "yellow" },
  { name: "Lime", value: "lime" },
  { name: "Green", value: "green" },
  { name: "Emerald", value: "emerald" },
  { name: "Teal", value: "teal" },
  { name: "Cyan", value: "cyan" },
  { name: "Sky", value: "sky" },
  { name: "Blue", value: "blue" },
  { name: "Indigo", value: "indigo" },
  { name: "Violet", value: "violet" },
  { name: "Purple", value: "purple" },
  { name: "Fuchsia", value: "fuchsia" },
  { name: "Pink", value: "pink" },
  { name: "Rose", value: "rose" },
] as const;

// Preset icons for categories (16 icons)
export const CATEGORY_ICONS = [
  { name: "Sparkles", value: "sparkles" },
  { name: "Bug", value: "bug" },
  { name: "Zap", value: "zap" },
  { name: "Shield", value: "shield" },
  { name: "Rocket", value: "rocket" },
  { name: "Wrench", value: "wrench" },
  { name: "Bell", value: "bell" },
  { name: "Globe", value: "globe" },
  { name: "Lock", value: "lock" },
  { name: "Database", value: "database" },
  { name: "Layout", value: "layout" },
  { name: "Palette", value: "palette" },
  { name: "Server", value: "server" },
  { name: "Smartphone", value: "smartphone" },
  { name: "Settings", value: "settings" },
  { name: "Star", value: "star" },
] as const;

export type CategoryIconName = typeof CATEGORY_ICONS[number]["value"];
export type CategoryColorName = typeof TAG_COLORS[number]["value"];
