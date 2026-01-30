#!/usr/bin/env npx tsx
/**
 * Button Migration Script
 *
 * Migrates from website/button.tsx patterns to enhanced ui/button.tsx
 *
 * Usage:
 *   npx tsx scripts/design-system/migrate-buttons.ts [--dry-run] [--path <path>]
 *
 * Options:
 *   --dry-run  Show what would change without making modifications
 *   --path     Limit migration to specific path (default: entire project)
 *
 * What it does:
 *   1. Finds imports of Button from @/components/website/button
 *   2. Replaces with Button from @/components/ui/button
 *   3. Preserves isLoading, leftIcon, rightIcon props (now supported in ui/button)
 */

import * as fs from "fs";
import { glob } from "glob";

// Configuration
const OLD_IMPORT = '@/components/website/button';
const NEW_IMPORT = '@/components/ui/button';

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
  let targetPath = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--path' && args[i + 1]) {
      targetPath = args[i + 1];
      i++;
    }
  }

  return { dryRun, targetPath };
}

/**
 * Find all TypeScript/JavaScript files that may need migration
 */
async function findFiles(targetPath: string): Promise<string[]> {
  const patterns = [
    `${targetPath}/**/*.tsx`,
    `${targetPath}/**/*.ts`,
  ];

  const ignorePatterns = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/scripts/design-system/**',
    '**/components/website/button.tsx',
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { ignore: ignorePatterns });
    files.push(...matches);
  }

  return [...new Set(files)];
}

/**
 * Check if file contains old button import
 */
function needsMigration(content: string): boolean {
  return (
    content.includes(OLD_IMPORT) ||
    content.includes('from "@/components/website/button"') ||
    content.includes("from '@/components/website/button'")
  );
}

/**
 * Migrate import statements
 */
function migrateImports(content: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Replace website/button imports with ui/button
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']@\/components\/website\/button["'];?/g;
  
  newContent = newContent.replace(importRegex, (_match, imports) => {
    const importedItems = imports.split(',').map((s: string) => s.trim());
    const validImports = importedItems.filter((item: string) => 
      item === 'Button' || 
      item === 'ButtonProps' || 
      item === 'buttonVariants' ||
      item.startsWith('type ')
    );

    if (validImports.length > 0) {
      changes.push(`Migrated: { ${validImports.join(', ')} } to ui/button`);
      return `import { ${validImports.join(', ')} } from "${NEW_IMPORT}";`;
    }
    return '';
  });

  return { content: newContent, changes };
}

/**
 * Migrate a single file
 */
function migrateFile(filePath: string, dryRun: boolean): MigrationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: MigrationResult = {
    file: filePath,
    changes: [],
    success: true,
  };

  if (!needsMigration(content)) {
    return result;
  }

  let newContent = content;
  const importResult = migrateImports(newContent);
  newContent = importResult.content;
  result.changes.push(...importResult.changes);

  if (!dryRun && result.changes.length > 0) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (error) {
      result.success = false;
      result.changes.push(`Error: ${error}`);
    }
  }

  return result;
}

/**
 * Main migration function
 */
async function main() {
  const { dryRun, targetPath } = parseArgs();

  console.log('\nButton Migration Script');
  console.log('=======================\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target: ${targetPath}\n`);

  const files = await findFiles(targetPath);
  console.log(`Scanning ${files.length} files...\n`);

  const results: MigrationResult[] = [];
  let filesChanged = 0;

  for (const file of files) {
    const result = migrateFile(file, dryRun);
    if (result.changes.length > 0) {
      results.push(result);
      filesChanged++;
    }
  }

  if (results.length === 0) {
    console.log('No files need migration!\n');
    return;
  }

  for (const result of results) {
    console.log(`File: ${result.file}`);
    for (const change of result.changes) {
      console.log(`  - ${change}`);
    }
  }

  console.log(`\nSummary: ${filesChanged} files ${dryRun ? 'would be' : 'were'} changed`);
  if (dryRun) {
    console.log('Run without --dry-run to apply changes.\n');
  }
}

main().catch(console.error);
