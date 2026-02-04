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

// ============================================
// CHANGELOG TEMPLATES
// ============================================

export type VersionBumpType = "major" | "minor" | "patch";

export interface ChangelogTemplate {
  id: string;
  name: string;
  description: string;
  versionBump: VersionBumpType;
  recommendedCategoryName: string; // Maps to existing category names
  defaultTags: ChangelogTag[];
  descriptionTemplate: string; // HTML template
  icon: string;
  color: string;
}

/**
 * Parse a semantic version string into its components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, "");
  
  // Match semantic version pattern (allows pre-release suffixes like -beta, -alpha)
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)/;
  const match = semverRegex.exec(cleanVersion);
  if (!match) return null;
  
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

/**
 * Suggest the next version based on current version and bump type
 */
export function suggestNextVersion(currentVersion: string | null, bumpType: VersionBumpType): string {
  if (!currentVersion) {
    // Default starting version based on bump type
    return bumpType === "major" ? "1.0.0" : "0.1.0";
  }
  
  const parsed = parseVersion(currentVersion);
  if (!parsed) {
    // If we can't parse, return a sensible default
    return "1.0.0";
  }
  
  const { major, minor, patch } = parsed;
  
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Pre-defined changelog templates for common update types
 */
export const CHANGELOG_TEMPLATES: ChangelogTemplate[] = [
  {
    id: "major-update",
    name: "Major Update",
    description: "Big features, breaking changes, or major rewrites",
    versionBump: "major",
    recommendedCategoryName: "Feature",
    defaultTags: [
      { name: "Major Release", color: "purple" },
    ],
    icon: "rocket",
    color: "purple",
    descriptionTemplate: `<h2>What's New</h2>
<p>This major update introduces significant new features and improvements.</p>
<ul>
<li><strong>Feature 1:</strong> Description of the first major feature</li>
<li><strong>Feature 2:</strong> Description of the second major feature</li>
<li><strong>Feature 3:</strong> Description of additional features</li>
</ul>

<h2>Breaking Changes</h2>
<p>Please review the following changes that may affect your workflow:</p>
<ul>
<li><strong>Change 1:</strong> Description of breaking change and migration path</li>
<li><strong>Change 2:</strong> Description of another breaking change</li>
</ul>

<h2>Migration Guide</h2>
<p>Follow these steps to upgrade:</p>
<ol>
<li>Step 1: Description</li>
<li>Step 2: Description</li>
<li>Step 3: Description</li>
</ol>

<h2>Deprecations</h2>
<p>The following features are now deprecated and will be removed in a future version:</p>
<ul>
<li>Feature name - Use [alternative] instead</li>
</ul>`,
  },
  {
    id: "minor-update",
    name: "Minor Update",
    description: "New features and non-breaking enhancements",
    versionBump: "minor",
    recommendedCategoryName: "Feature",
    defaultTags: [
      { name: "New Feature", color: "blue" },
    ],
    icon: "sparkles",
    color: "blue",
    descriptionTemplate: `<h2>New Features</h2>
<p>This update adds new functionality to improve your experience.</p>
<ul>
<li><strong>Feature 1:</strong> Description of the new feature</li>
<li><strong>Feature 2:</strong> Description of another new feature</li>
</ul>

<h2>Improvements</h2>
<ul>
<li>Improvement 1: Description</li>
<li>Improvement 2: Description</li>
</ul>

<h2>Bug Fixes</h2>
<ul>
<li>Fixed an issue where...</li>
</ul>`,
  },
  {
    id: "hotfix",
    name: "Hotfix",
    description: "Critical bug fixes and urgent patches",
    versionBump: "patch",
    recommendedCategoryName: "Bug Fix",
    defaultTags: [
      { name: "Hotfix", color: "red" },
      { name: "Critical", color: "orange" },
    ],
    icon: "bug",
    color: "red",
    descriptionTemplate: `<h2>Bug Fixed</h2>
<p>This hotfix addresses a critical issue that was affecting users.</p>

<h3>Issue Description</h3>
<p>Description of the bug and its impact on users.</p>

<h3>Resolution</h3>
<p>Explanation of how the issue was resolved.</p>

<h2>Affected Areas</h2>
<ul>
<li>Component or feature that was affected</li>
<li>Any related areas that were impacted</li>
</ul>

<h2>Recommended Action</h2>
<p>No action required. The fix has been applied automatically.</p>`,
  },
  {
    id: "patch-note",
    name: "Patch Note",
    description: "Small fixes, minor improvements, and maintenance",
    versionBump: "patch",
    recommendedCategoryName: "Improvement",
    defaultTags: [
      { name: "Patch", color: "green" },
    ],
    icon: "wrench",
    color: "green",
    descriptionTemplate: `<h2>Changes</h2>
<p>This patch includes minor improvements and fixes.</p>

<h3>Improvements</h3>
<ul>
<li>Improvement 1: Description</li>
<li>Improvement 2: Description</li>
</ul>

<h3>Bug Fixes</h3>
<ul>
<li>Fixed: Description of the fix</li>
</ul>

<h3>Performance</h3>
<ul>
<li>Optimized: Description of optimization</li>
</ul>`,
  },
  {
    id: "security-update",
    name: "Security Update",
    description: "Security vulnerabilities and patches",
    versionBump: "patch",
    recommendedCategoryName: "Security",
    defaultTags: [
      { name: "Security", color: "yellow" },
    ],
    icon: "shield",
    color: "yellow",
    descriptionTemplate: `<h2>Security Update</h2>
<p>This update addresses security concerns to keep your data safe.</p>

<h3>Security Issue</h3>
<p>A security vulnerability was identified and has been addressed. For security reasons, detailed information about the vulnerability is not disclosed publicly.</p>

<h3>Resolution</h3>
<p>The security issue has been patched. All users are now protected.</p>

<h3>Severity</h3>
<p><strong>Severity Level:</strong> [Low/Medium/High/Critical]</p>

<h3>Recommended Action</h3>
<p>No action required from users. The security patch has been applied automatically.</p>

<h3>Acknowledgments</h3>
<p>We thank [reporter name/organization] for responsibly disclosing this issue.</p>`,
  },
  {
    id: "performance-update",
    name: "Performance Update",
    description: "Speed improvements and optimizations",
    versionBump: "minor",
    recommendedCategoryName: "Performance",
    defaultTags: [
      { name: "Performance", color: "emerald" },
    ],
    icon: "zap",
    color: "emerald",
    descriptionTemplate: `<h2>Performance Improvements</h2>
<p>This update focuses on making the application faster and more efficient.</p>

<h3>Optimizations</h3>
<ul>
<li><strong>Page Load Speed:</strong> Improved by X%</li>
<li><strong>Database Queries:</strong> Optimized for faster response times</li>
<li><strong>Memory Usage:</strong> Reduced memory footprint</li>
</ul>

<h3>Technical Details</h3>
<ul>
<li>Optimization 1: Technical description</li>
<li>Optimization 2: Technical description</li>
</ul>

<h3>Metrics</h3>
<p>Before: [metric]<br/>After: [metric]</p>`,
  },
  {
    id: "ui-update",
    name: "UI/UX Update",
    description: "Design changes and user experience improvements",
    versionBump: "minor",
    recommendedCategoryName: "UI/UX",
    defaultTags: [
      { name: "UI", color: "pink" },
      { name: "UX", color: "fuchsia" },
    ],
    icon: "palette",
    color: "pink",
    descriptionTemplate: `<h2>Design Updates</h2>
<p>This update brings visual improvements and enhanced user experience.</p>

<h3>Visual Changes</h3>
<ul>
<li><strong>Component/Page:</strong> Description of visual change</li>
<li><strong>Component/Page:</strong> Description of visual change</li>
</ul>

<h3>UX Improvements</h3>
<ul>
<li>Improved navigation for...</li>
<li>Enhanced accessibility for...</li>
<li>Better mobile experience for...</li>
</ul>

<h3>Screenshots</h3>
<p>[Add screenshots or before/after comparisons]</p>`,
  },
];

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
