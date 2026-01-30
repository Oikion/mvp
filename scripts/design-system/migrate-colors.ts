#!/usr/bin/env npx ts-node
/**
 * Color Migration Script
 *
 * Replaces hardcoded Tailwind color classes with semantic design tokens.
 * Run with: npx ts-node scripts/design-system/migrate-colors.ts [--dry-run] [--path <path>]
 *
 * Options:
 *   --dry-run    Show changes without modifying files
 *   --path       Specific file or directory to process (default: entire project)
 *   --verbose    Show all file processing info
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Safe color mappings - these are semantically equivalent replacements
 * Format: [pattern, replacement, description]
 */
const SAFE_MAPPINGS: Array<[RegExp, string, string]> = [
  // ==========================================================================
  // DESTRUCTIVE (Red) - Error states, destructive actions
  // ==========================================================================
  [/\btext-red-500\b/g, "text-destructive", "error text"],
  [/\btext-red-600\b/g, "text-destructive", "error text"],
  [/\bbg-red-500\b/g, "bg-destructive", "error background"],
  [/\bbg-red-600\b/g, "bg-destructive", "error background"],
  [/\bborder-red-500\b/g, "border-destructive", "error border"],
  [/\bborder-red-600\b/g, "border-destructive", "error border"],
  // Lighter variants for backgrounds
  [/\bbg-red-50\b/g, "bg-destructive/10", "error background light"],
  [/\bbg-red-100\b/g, "bg-destructive/10", "error background light"],

  // ==========================================================================
  // SUCCESS (Green/Emerald) - Success states, positive actions
  // ==========================================================================
  [/\btext-green-500\b/g, "text-success", "success text"],
  [/\btext-green-600\b/g, "text-success", "success text"],
  [/\btext-emerald-500\b/g, "text-success", "success text"],
  [/\btext-emerald-600\b/g, "text-success", "success text"],
  [/\bbg-green-500\b/g, "bg-success", "success background"],
  [/\bbg-green-600\b/g, "bg-success", "success background"],
  [/\bbg-emerald-500\b/g, "bg-success", "success background"],
  [/\bbg-emerald-600\b/g, "bg-success", "success background"],
  [/\bborder-green-500\b/g, "border-success", "success border"],
  [/\bborder-green-600\b/g, "border-success", "success border"],
  [/\bborder-emerald-500\b/g, "border-success", "success border"],
  // Lighter variants
  [/\bbg-green-50\b/g, "bg-success/10", "success background light"],
  [/\bbg-green-100\b/g, "bg-success/10", "success background light"],
  [/\bbg-emerald-50\b/g, "bg-success/10", "success background light"],
  [/\bbg-emerald-100\b/g, "bg-success/10", "success background light"],

  // ==========================================================================
  // WARNING (Amber/Yellow/Orange) - Warning states, caution
  // ==========================================================================
  [/\btext-amber-500\b/g, "text-warning", "warning text"],
  [/\btext-amber-600\b/g, "text-warning", "warning text"],
  [/\btext-yellow-500\b/g, "text-warning", "warning text"],
  [/\btext-yellow-600\b/g, "text-warning", "warning text"],
  [/\btext-orange-500\b/g, "text-warning", "warning text"],
  [/\btext-orange-600\b/g, "text-warning", "warning text"],
  [/\bbg-amber-500\b/g, "bg-warning", "warning background"],
  [/\bbg-amber-600\b/g, "bg-warning", "warning background"],
  [/\bbg-yellow-500\b/g, "bg-warning", "warning background"],
  [/\bbg-orange-500\b/g, "bg-warning", "warning background"],
  [/\bborder-amber-500\b/g, "border-warning", "warning border"],
  [/\bborder-yellow-500\b/g, "border-warning", "warning border"],
  // Lighter variants
  [/\bbg-amber-50\b/g, "bg-warning/10", "warning background light"],
  [/\bbg-amber-100\b/g, "bg-warning/10", "warning background light"],
  [/\bbg-yellow-50\b/g, "bg-warning/10", "warning background light"],
  [/\bbg-yellow-100\b/g, "bg-warning/10", "warning background light"],

  // ==========================================================================
  // PRIMARY (Blue) - Primary actions, links, info
  // ==========================================================================
  [/\btext-blue-500\b/g, "text-primary", "primary text"],
  [/\btext-blue-600\b/g, "text-primary", "primary text"],
  [/\bbg-blue-500\b/g, "bg-primary", "primary background"],
  [/\bbg-blue-600\b/g, "bg-primary", "primary background"],
  [/\bborder-blue-500\b/g, "border-primary", "primary border"],
  [/\bborder-blue-600\b/g, "border-primary", "primary border"],
  // Lighter variants for info boxes
  [/\bbg-blue-50\b/g, "bg-primary/10", "info background light"],
  [/\bbg-blue-100\b/g, "bg-primary/10", "info background light"],

  // ==========================================================================
  // MUTED (Gray/Slate/Zinc) - Secondary text, backgrounds
  // ==========================================================================
  [/\btext-gray-400\b/g, "text-muted-foreground", "muted text"],
  [/\btext-gray-500\b/g, "text-muted-foreground", "muted text"],
  [/\btext-gray-600\b/g, "text-muted-foreground", "secondary text"],
  [/\btext-slate-400\b/g, "text-muted-foreground", "muted text"],
  [/\btext-slate-500\b/g, "text-muted-foreground", "muted text"],
  [/\btext-slate-600\b/g, "text-muted-foreground", "secondary text"],
  [/\btext-zinc-400\b/g, "text-muted-foreground", "muted text"],
  [/\btext-zinc-500\b/g, "text-muted-foreground", "muted text"],
  [/\btext-neutral-500\b/g, "text-muted-foreground", "muted text"],
  // Background variants
  [/\bbg-gray-50\b/g, "bg-muted", "muted background"],
  [/\bbg-gray-100\b/g, "bg-muted", "muted background"],
  [/\bbg-slate-50\b/g, "bg-muted", "muted background"],
  [/\bbg-slate-100\b/g, "bg-muted", "muted background"],
  [/\bbg-zinc-50\b/g, "bg-muted", "muted background"],
  [/\bbg-zinc-100\b/g, "bg-muted", "muted background"],
  // Border variants
  [/\bborder-gray-200\b/g, "border-border", "standard border"],
  [/\bborder-gray-300\b/g, "border-border", "standard border"],
  [/\bborder-slate-200\b/g, "border-border", "standard border"],
  [/\bborder-slate-300\b/g, "border-border", "standard border"],

  // ==========================================================================
  // FOREGROUND (Dark grays) - Primary text
  // ==========================================================================
  [/\btext-gray-900\b/g, "text-foreground", "primary text"],
  [/\btext-gray-800\b/g, "text-foreground", "primary text"],
  [/\btext-slate-900\b/g, "text-foreground", "primary text"],
  [/\btext-slate-800\b/g, "text-foreground", "primary text"],
  [/\btext-zinc-900\b/g, "text-foreground", "primary text"],
  [/\btext-neutral-900\b/g, "text-foreground", "primary text"],
];

/**
 * Colors that need manual review - context-dependent
 */
const REVIEW_PATTERNS: Array<[RegExp, string]> = [
  [/\btext-purple-\d+\b/g, "Could be accent or info - review context"],
  [/\bbg-purple-\d+\b/g, "Could be accent or info - review context"],
  [/\btext-pink-\d+\b/g, "Could be accent - review context"],
  [/\bbg-pink-\d+\b/g, "Could be accent - review context"],
  [/\btext-indigo-\d+\b/g, "Could be primary or accent - review context"],
  [/\bbg-indigo-\d+\b/g, "Could be primary or accent - review context"],
  [/\btext-teal-\d+\b/g, "Could be success or info - review context"],
  [/\bbg-teal-\d+\b/g, "Could be success or info - review context"],
  [/\btext-cyan-\d+\b/g, "Could be info - review context"],
  [/\bbg-cyan-\d+\b/g, "Could be info - review context"],
];

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /\.pnpm-store/,
  /emails\//, // Email templates need inline colors
  /lib\/export\//, // PDF exports need specific colors
];

// File extensions to process
const FILE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

// ============================================================================
// SCRIPT
// ============================================================================

interface MigrationResult {
  file: string;
  changes: Array<{
    line: number;
    original: string;
    replacement: string;
    description: string;
  }>;
  reviewNeeded: Array<{
    line: number;
    match: string;
    reason: string;
  }>;
}

function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function processFile(
  filePath: string,
  dryRun: boolean,
  verbose: boolean
): MigrationResult | null {
  if (shouldSkipFile(filePath)) {
    return null;
  }

  const ext = path.extname(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const lines = content.split("\n");
  const result: MigrationResult = {
    file: filePath,
    changes: [],
    reviewNeeded: [],
  };

  let newContent = content;

  // Check for patterns needing review
  lines.forEach((line, index) => {
    REVIEW_PATTERNS.forEach(([pattern, reason]) => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          result.reviewNeeded.push({
            line: index + 1,
            match,
            reason,
          });
        });
      }
    });
  });

  // Apply safe mappings
  SAFE_MAPPINGS.forEach(([pattern, replacement, description]) => {
    const matches = content.match(pattern);
    if (matches) {
      // Find line numbers for each match
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          const originalMatch = line.match(pattern);
          if (originalMatch) {
            result.changes.push({
              line: index + 1,
              original: originalMatch[0],
              replacement,
              description,
            });
          }
        }
      });

      // Apply replacement
      newContent = newContent.replace(pattern, replacement);
    }
  });

  // Write changes if not dry run and there are changes
  if (!dryRun && result.changes.length > 0) {
    fs.writeFileSync(filePath, newContent, "utf-8");
  }

  if (result.changes.length > 0 || result.reviewNeeded.length > 0) {
    return result;
  }

  return null;
}

function walkDirectory(
  dir: string,
  dryRun: boolean,
  verbose: boolean
): MigrationResult[] {
  const results: MigrationResult[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (shouldSkipFile(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const result = processFile(fullPath, dryRun, verbose);
        if (result) {
          results.push(result);
        }
      }
    }
  }

  walk(dir);
  return results;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");

  const pathIndex = args.indexOf("--path");
  const targetPath =
    pathIndex !== -1 ? args[pathIndex + 1] : process.cwd();

  console.log("\n🎨 Design System Color Migration\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no files modified)" : "LIVE"}`);
  console.log(`Target: ${targetPath}\n`);

  let results: MigrationResult[];

  if (fs.statSync(targetPath).isDirectory()) {
    results = walkDirectory(targetPath, dryRun, verbose);
  } else {
    const result = processFile(targetPath, dryRun, verbose);
    results = result ? [result] : [];
  }

  // Summary
  let totalChanges = 0;
  let totalReviews = 0;
  const fileCount = results.length;

  results.forEach((result) => {
    totalChanges += result.changes.length;
    totalReviews += result.reviewNeeded.length;
  });

  console.log("═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`Files processed with changes: ${fileCount}`);
  console.log(`Total replacements: ${totalChanges}`);
  console.log(`Items needing review: ${totalReviews}`);
  console.log("");

  if (verbose || results.length <= 20) {
    results.forEach((result) => {
      console.log(`\n📁 ${result.file}`);

      if (result.changes.length > 0) {
        console.log("  ✅ Changes:");
        result.changes.forEach((change) => {
          console.log(
            `     Line ${change.line}: ${change.original} → ${change.replacement}`
          );
        });
      }

      if (result.reviewNeeded.length > 0) {
        console.log("  ⚠️  Needs Review:");
        result.reviewNeeded.forEach((review) => {
          console.log(`     Line ${review.line}: ${review.match}`);
          console.log(`        → ${review.reason}`);
        });
      }
    });
  } else {
    console.log(
      "\n(Use --verbose to see detailed changes per file)\n"
    );

    // Just show files with review needed
    const filesWithReview = results.filter((r) => r.reviewNeeded.length > 0);
    if (filesWithReview.length > 0) {
      console.log("Files needing manual review:");
      filesWithReview.forEach((result) => {
        console.log(`  ⚠️  ${result.file} (${result.reviewNeeded.length} items)`);
      });
    }
  }

  if (dryRun) {
    console.log("\n💡 This was a dry run. Run without --dry-run to apply changes.\n");
  } else if (totalChanges > 0) {
    console.log("\n✨ Migration complete! Run `pnpm lint` to verify.\n");
  }

  // Exit with code 0 if successful
  process.exit(0);
}

main();
