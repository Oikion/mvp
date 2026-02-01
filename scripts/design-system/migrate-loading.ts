#!/usr/bin/env npx tsx
/**
 * Loading Component Migration Script
 *
 * Migrates from deprecated loading patterns to the unified Loading component:
 * - Icons.spinner → LoadingSpinner from @/components/ui/loading
 * - Direct Loader2 usage (where appropriate) → LoadingSpinner
 *
 * Usage:
 *   npx tsx scripts/design-system/migrate-loading.ts [--dry-run] [--path <path>]
 *
 * Options:
 *   --dry-run  Show what would change without making modifications
 *   --path     Limit migration to specific path (default: entire project)
 *
 * What it does:
 *   1. Finds Icons.spinner usage and replaces with LoadingSpinner
 *   2. Adds necessary imports for LoadingSpinner
 *   3. Removes Icons import if no longer needed
 */

import * as fs from "fs";
import * as path from "path";

interface MigrationResult {
  file: string;
  changes: string[];
  success: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; targetPath: string } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let targetPath = ".";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--path" && args[i + 1]) {
      targetPath = args[i + 1];
      i++;
    }
  }

  return { dryRun, targetPath };
}

/**
 * Find all TypeScript/JavaScript files that may need migration
 */
function findFiles(targetPath: string): string[] {
  const ignoreDirs = [
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    ".pnpm-store",
    "scripts/design-system",
  ];

  const ignoreFiles = [
    "icons.tsx", // Don't migrate the Icons definition file
    "loading.tsx", // Don't migrate the Loading component itself
    "migrate-loading.ts",
  ];

  const validExtensions = [".tsx", ".ts", ".jsx", ".js"];

  function walkDir(dir: string): string[] {
    const results: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            results.push(...walkDir(fullPath));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (validExtensions.includes(ext) && !ignoreFiles.includes(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }

    return results;
  }

  return walkDir(targetPath);
}

/**
 * Check if file contains Icons.spinner usage
 */
function needsMigration(content: string): boolean {
  return content.includes("Icons.spinner");
}

/**
 * Check if file already has LoadingSpinner import
 */
function hasLoadingSpinnerImport(content: string): boolean {
  return (
    content.includes('import { LoadingSpinner }') ||
    content.includes('import { Loading, LoadingSpinner }') ||
    content.includes('LoadingSpinner }') && content.includes('@/components/ui/loading')
  );
}

/**
 * Check if file has Icons import
 */
function hasIconsImport(content: string): boolean {
  return /import\s*\{\s*Icons\s*\}\s*from\s*["']@\/components\/ui\/icons["']/.test(content);
}

/**
 * Check if Icons is still used after migration (for other icons like Icons.logo)
 */
function isIconsStillUsed(content: string): boolean {
  // Check for any Icons.* usage that's not spinner
  const iconsUsage = content.match(/Icons\.\w+/g) || [];
  return iconsUsage.some(usage => usage !== "Icons.spinner");
}

/**
 * Add LoadingSpinner import to file
 */
function addLoadingSpinnerImport(content: string): { content: string; added: boolean } {
  if (hasLoadingSpinnerImport(content)) {
    return { content, added: false };
  }

  // Check if there's already an import from @/components/ui/loading
  const existingLoadingImport = content.match(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/components\/ui\/loading["'];?/
  );

  if (existingLoadingImport) {
    // Add LoadingSpinner to existing import
    const imports = existingLoadingImport[1];
    if (!imports.includes("LoadingSpinner")) {
      const newImports = imports.trim() + ", LoadingSpinner";
      const newContent = content.replace(
        existingLoadingImport[0],
        `import { ${newImports} } from "@/components/ui/loading";`
      );
      return { content: newContent, added: true };
    }
    return { content, added: false };
  }

  // Add new import after other imports
  // Find the last import statement
  const importMatches = [...content.matchAll(/^import .+;?\s*$/gm)];
  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const insertPosition = lastImport.index! + lastImport[0].length;
    const newContent =
      content.slice(0, insertPosition) +
      '\nimport { LoadingSpinner } from "@/components/ui/loading";' +
      content.slice(insertPosition);
    return { content: newContent, added: true };
  }

  // Fallback: add at the beginning
  return {
    content: 'import { LoadingSpinner } from "@/components/ui/loading";\n' + content,
    added: true,
  };
}

/**
 * Remove Icons import if no longer needed
 */
function removeIconsImportIfUnused(content: string): { content: string; removed: boolean } {
  if (!hasIconsImport(content)) {
    return { content, removed: false };
  }

  if (isIconsStillUsed(content)) {
    return { content, removed: false };
  }

  // Remove the Icons import
  const newContent = content.replace(
    /import\s*\{\s*Icons\s*\}\s*from\s*["']@\/components\/ui\/icons["'];?\n?/,
    ""
  );

  return { content: newContent, removed: newContent !== content };
}

/**
 * Migrate Icons.spinner usage to LoadingSpinner
 */
function migrateIconsSpinner(content: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Pattern 1: <Icons.spinner className="..." />
  // Replace with <LoadingSpinner className="..." />
  const iconPattern = /<Icons\.spinner\s+className="([^"]+)"\s*\/>/g;
  const matches = content.match(iconPattern);

  if (matches) {
    newContent = newContent.replace(iconPattern, (match, className) => {
      // Extract size from className (h-X w-X pattern)
      let size: "xs" | "sm" | "md" | "lg" | "xl" = "sm";
      const sizeMatch = className.match(/h-(\d+)/);
      if (sizeMatch) {
        const height = parseInt(sizeMatch[1]);
        if (height <= 3) size = "xs";
        else if (height <= 4) size = "sm";
        else if (height <= 6) size = "md";
        else if (height <= 8) size = "lg";
        else size = "xl";
      }

      // Remove h-*, w-*, and animate-spin from className (they're handled by LoadingSpinner)
      let remainingClasses = className
        .replace(/h-\d+/g, "")
        .replace(/w-\d+/g, "")
        .replace(/animate-spin/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (remainingClasses) {
        changes.push(`Migrated: Icons.spinner to LoadingSpinner size="${size}" with additional classes`);
        return `<LoadingSpinner size="${size}" className="${remainingClasses}" />`;
      } else {
        changes.push(`Migrated: Icons.spinner to LoadingSpinner size="${size}"`);
        return `<LoadingSpinner size="${size}" />`;
      }
    });
  }

  // Pattern 2: {condition && <Icons.spinner ... />} or similar JSX expressions
  // These should be caught by the previous pattern

  // Pattern 3: Icons.spinner without className (rare)
  newContent = newContent.replace(/<Icons\.spinner\s*\/>/g, () => {
    changes.push("Migrated: Icons.spinner (no className) to LoadingSpinner");
    return '<LoadingSpinner size="sm" />';
  });

  return { content: newContent, changes };
}

/**
 * Migrate a single file
 */
function migrateFile(filePath: string, dryRun: boolean): MigrationResult {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: MigrationResult = {
    file: filePath,
    changes: [],
    success: true,
  };

  if (!needsMigration(content)) {
    return result;
  }

  let newContent = content;

  // Step 1: Add LoadingSpinner import
  const importResult = addLoadingSpinnerImport(newContent);
  newContent = importResult.content;
  if (importResult.added) {
    result.changes.push("Added LoadingSpinner import");
  }

  // Step 2: Migrate Icons.spinner usage
  const migrationResult = migrateIconsSpinner(newContent);
  newContent = migrationResult.content;
  result.changes.push(...migrationResult.changes);

  // Step 3: Remove Icons import if no longer needed
  const removeResult = removeIconsImportIfUnused(newContent);
  newContent = removeResult.content;
  if (removeResult.removed) {
    result.changes.push("Removed unused Icons import");
  }

  // Write changes if not dry run
  if (!dryRun && result.changes.length > 0) {
    try {
      fs.writeFileSync(filePath, newContent, "utf-8");
    } catch (error) {
      result.success = false;
      result.changes.push(`Error writing file: ${error}`);
    }
  }

  return result;
}

/**
 * Main migration function
 */
async function main() {
  const { dryRun, targetPath } = parseArgs();

  console.log("\n🔄 Loading Component Migration Script");
  console.log("=====================================\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE"}`);
  console.log(`Target path: ${targetPath}\n`);

  const files = findFiles(targetPath);
  console.log(`Found ${files.length} files to scan...\n`);

  const results: MigrationResult[] = [];
  let filesChanged = 0;
  let totalChanges = 0;

  for (const file of files) {
    const result = migrateFile(file, dryRun);
    if (result.changes.length > 0) {
      results.push(result);
      filesChanged++;
      totalChanges += result.changes.length;
    }
  }

  // Print results
  console.log("\n📊 Results");
  console.log("==========\n");

  if (results.length === 0) {
    console.log("✅ No files need migration!\n");
    return;
  }

  for (const result of results) {
    console.log(`📄 ${result.file}`);
    for (const change of result.changes) {
      console.log(`   • ${change}`);
    }
    console.log();
  }

  console.log(`\n📈 Summary`);
  console.log(`   Files changed: ${filesChanged}`);
  console.log(`   Total changes: ${totalChanges}`);

  if (dryRun) {
    console.log("\n💡 Run without --dry-run to apply changes.\n");
  } else {
    console.log("\n✅ Migration complete!\n");
    console.log("⚠️  Please review the changes and run tests.\n");
  }
}

main().catch(console.error);
