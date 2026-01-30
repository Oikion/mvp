#!/usr/bin/env npx tsx
/**
 * Toast Migration Script
 *
 * Migrates from deprecated useToast to useAppToast
 *
 * Usage:
 *   npx tsx scripts/design-system/migrate-toast.ts [--dry-run] [--path <path>]
 *
 * Options:
 *   --dry-run  Show what would change without making modifications
 *   --path     Limit migration to specific path (default: entire project)
 *
 * What it does:
 *   1. Finds all imports of useToast from @/components/ui/use-toast
 *   2. Replaces with useAppToast from @/hooks/use-app-toast
 *   3. Updates toast usage patterns
 *
 * @example
 *   // Before
 *   import { useToast } from "@/components/ui/use-toast";
 *   const { toast } = useToast();
 *   toast({ title: "Success", variant: "success" });
 *
 *   // After
 *   import { useAppToast } from "@/hooks/use-app-toast";
 *   const { toast } = useAppToast();
 *   toast.success("Success", { isTranslationKey: false });
 */

import * as fs from "fs";
import * as path from "path";

// Configuration
const OLD_IMPORT = '@/components/ui/use-toast';
const NEW_IMPORT = '@/hooks/use-app-toast';
const OLD_HOOK = 'useToast';
const NEW_HOOK = 'useAppToast';

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
function findFiles(targetPath: string): string[] {
  const ignoreDirs = [
    'node_modules',
    '.next',
    'dist',
    'build',
    '.git',
    '.pnpm-store',
  ];

  const ignoreFiles = [
    'use-toast.ts', // Don't migrate the deprecated file itself
    'use-app-toast.ts', // Don't migrate the new file
    'migrate-toast.ts', // Don't migrate this script
  ];

  const validExtensions = ['.tsx', '.ts', '.jsx', '.js'];

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
    } catch (err) {
      // Ignore permission errors
    }
    
    return results;
  }

  return walkDir(targetPath);
}

/**
 * Check if file contains deprecated toast import or old toast call patterns
 */
function needsMigration(content: string, migrateSonner: boolean = false): boolean {
  // Check for old import
  const hasOldImport = (
    content.includes(OLD_IMPORT) ||
    content.includes('from "@/components/ui/use-toast"') ||
    content.includes("from '@/components/ui/use-toast'")
  );
  
  // Check for old toast call pattern: toast({ ... })
  // Look for files that use useAppToast and have toast({ ... }) calls
  const hasOldToastCalls = (
    content.includes('useAppToast') &&
    /toast\(\s*\{\s*(?:variant|title|description)/.test(content)
  );
  
  // Check for direct Sonner imports (optional migration)
  const hasDirectSonner = migrateSonner && (
    content.includes('from "sonner"') ||
    content.includes("from 'sonner'")
  );
  
  return hasOldImport || hasOldToastCalls || hasDirectSonner;
}

/**
 * Migrate import statements
 */
function migrateImports(content: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Replace import statement
  const importPatterns = [
    // Double quotes
    /import\s*{\s*useToast\s*(?:,\s*toast\s*)?}\s*from\s*["']@\/components\/ui\/use-toast["'];?/g,
    /import\s*{\s*toast\s*(?:,\s*useToast\s*)?}\s*from\s*["']@\/components\/ui\/use-toast["'];?/g,
    // Single quotes
    /import\s*{\s*useToast\s*}\s*from\s*['"]@\/components\/ui\/use-toast['"];?/g,
  ];

  for (const pattern of importPatterns) {
    if (pattern.test(newContent)) {
      newContent = newContent.replace(
        pattern,
        `import { useAppToast } from "${NEW_IMPORT}";`
      );
      changes.push('Replaced useToast import with useAppToast');
    }
  }

  return { content: newContent, changes };
}

/**
 * Migrate hook usage
 */
function migrateHookUsage(content: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Replace hook call
  if (newContent.includes('useToast()')) {
    newContent = newContent.replace(/useToast\(\)/g, 'useAppToast()');
    changes.push('Replaced useToast() with useAppToast()');
  }

  return { content: newContent, changes };
}

/**
 * Migrate toast call patterns from old Radix UI style to new Sonner style
 * 
 * Old patterns:
 *   toast({ variant: "success", title: "Message" })
 *   toast({ variant: "destructive", title: "Error", description: "Details" })
 *   toast({ title: "Info" })
 * 
 * New patterns:
 *   toast.success("Message", { isTranslationKey: false })
 *   toast.error("Error", { description: "Details", isTranslationKey: false })
 *   toast.info("Info", { isTranslationKey: false })
 */
function migrateToastCalls(content: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Helper to escape regex special chars in strings
  const escapeForReplacement = (str: string) => str.replace(/\$/g, '$$$$');

  // Pattern for multiline toast calls - capture the entire object
  // This regex handles:
  // - variant: "success" | "destructive" | "default" | "warning"
  // - title: "string" or `template literal` or variable
  // - description: "string" or `template literal` or variable
  
  // Match toast({ ... }) calls, handling multiline
  const toastCallPattern = /toast\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/gs;
  
  const toastMatches = [...newContent.matchAll(toastCallPattern)];
  
  for (const match of toastMatches) {
    const [fullMatch, objectContent] = match;
    
    // Skip if already migrated (contains toast.success, toast.error, etc.)
    if (fullMatch.includes('toast.success') || fullMatch.includes('toast.error') || 
        fullMatch.includes('toast.warning') || fullMatch.includes('toast.info')) {
      continue;
    }
    
    // Extract variant
    const variantMatch = objectContent.match(/variant:\s*["'](\w+)["']/);
    const variant = variantMatch ? variantMatch[1] : 'default';
    
    // Extract title - handle strings and template literals
    const titleStringMatch = objectContent.match(/title:\s*["']([^"']+)["']/);
    const titleTemplateLiteralMatch = objectContent.match(/title:\s*`([^`]+)`/);
    const titleVariableMatch = objectContent.match(/title:\s*(\w+(?:\.\w+)*)/);
    
    let title: string | null = null;
    let titleIsVariable = false;
    let titleIsTemplateLiteral = false;
    
    if (titleStringMatch) {
      title = titleStringMatch[1];
    } else if (titleTemplateLiteralMatch) {
      title = titleTemplateLiteralMatch[1];
      titleIsTemplateLiteral = true;
    } else if (titleVariableMatch && !titleVariableMatch[1].startsWith('variant') && !titleVariableMatch[1].startsWith('description')) {
      title = titleVariableMatch[1];
      titleIsVariable = true;
    }
    
    if (!title) continue; // Skip if no title found
    
    // Extract description
    const descStringMatch = objectContent.match(/description:\s*["']([^"']+)["']/);
    const descTemplateLiteralMatch = objectContent.match(/description:\s*`([^`]+)`/);
    const descVariableMatch = objectContent.match(/description:\s*(\w+(?:\.\w+|\?\.?\w+)*(?:\s*\|\|\s*["'][^"']*["'])?)/);
    
    let description: string | null = null;
    let descIsVariable = false;
    let descIsTemplateLiteral = false;
    
    if (descStringMatch) {
      description = descStringMatch[1];
    } else if (descTemplateLiteralMatch) {
      description = descTemplateLiteralMatch[1];
      descIsTemplateLiteral = true;
    } else if (descVariableMatch && !descVariableMatch[1].startsWith('variant') && !descVariableMatch[1].startsWith('title')) {
      description = descVariableMatch[1];
      descIsVariable = true;
    }
    
    // Determine method based on variant
    let method = 'info';
    if (variant === 'success') method = 'success';
    else if (variant === 'destructive') method = 'error';
    else if (variant === 'warning') method = 'warning';
    else if (variant === 'default') method = 'info';
    
    // Build replacement
    let titleArg: string;
    if (titleIsVariable) {
      titleArg = title;
    } else if (titleIsTemplateLiteral) {
      titleArg = `\`${title}\``;
    } else {
      titleArg = `"${escapeForReplacement(title)}"`;
    }
    
    let replacement: string;
    if (description) {
      let descArg: string;
      if (descIsVariable) {
        descArg = description;
      } else if (descIsTemplateLiteral) {
        descArg = `\`${description}\``;
      } else {
        descArg = `"${escapeForReplacement(description)}"`;
      }
      replacement = `toast.${method}(${titleArg}, { description: ${descArg}, isTranslationKey: false })`;
    } else {
      replacement = `toast.${method}(${titleArg}, { isTranslationKey: false })`;
    }
    
    newContent = newContent.replace(fullMatch, replacement);
    changes.push(`Converted ${variant} toast: "${title.substring(0, 30)}..."`);
  }

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

  // Apply migrations in order
  const importResult = migrateImports(newContent);
  newContent = importResult.content;
  result.changes.push(...importResult.changes);

  const hookResult = migrateHookUsage(newContent);
  newContent = hookResult.content;
  result.changes.push(...hookResult.changes);

  const callResult = migrateToastCalls(newContent);
  newContent = callResult.content;
  result.changes.push(...callResult.changes);

  // Write changes if not dry run
  if (!dryRun && result.changes.length > 0) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf-8');
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

  console.log('\n🔄 Toast Migration Script');
  console.log('========================\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
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
  console.log('\n📊 Results');
  console.log('==========\n');

  if (results.length === 0) {
    console.log('✅ No files need migration!\n');
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
    console.log('\n💡 Run without --dry-run to apply changes.\n');
  } else {
    console.log('\n✅ Migration complete!\n');
    console.log('⚠️  Please review the changes and run tests.\n');
  }
}

main().catch(console.error);
