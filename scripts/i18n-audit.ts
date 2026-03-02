#!/usr/bin/env tsx
/**
 * i18n Audit Script
 *
 * Scans the codebase for:
 * 1. Hard-coded strings (placeholders, aria-labels, titles, JSX text)
 * 2. Locale conditional patterns (locale === "el" ? ... : ...)
 * 3. Date/number formatting anti-patterns (toLocaleDateString, etc.)
 * 4. Key parity between el/en locale files
 * 5. Unused translation keys (optional)
 *
 * Usage:
 *   pnpm i18n:audit
 *   pnpm i18n:audit --check-parity
 *   pnpm i18n:audit --fail-on-diff
 */

import * as fs from "fs";
import * as path from "path";

// Configuration
const ROOT_DIR = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT_DIR, "locales");
const APP_DIR = path.join(ROOT_DIR, "app");
const COMPONENTS_DIR = path.join(ROOT_DIR, "components");
const ACTIONS_DIR = path.join(ROOT_DIR, "actions");
const HOOKS_DIR = path.join(ROOT_DIR, "hooks");
const LIB_DIR = path.join(ROOT_DIR, "lib");

// Directories to scan for hard-coded strings
const SCAN_DIRS = [APP_DIR, COMPONENTS_DIR, ACTIONS_DIR, HOOKS_DIR, LIB_DIR];

// File extensions to scan
const FILE_EXTENSIONS = [".tsx", ".ts"];

// Directories to exclude from scanning
const EXCLUDE_DIRS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  "scripts",
  ".git",
  "cypress",
  "emails", // Email templates may have intentional inline text
];

// Files to exclude from hard-coded string scanning
const EXCLUDE_FILES = [
  "i18n.ts",
  "dictionaries.ts",
  "layout.tsx", // Layout has locale setup code
  "middleware.ts",
  "proxy.ts",
];

// Patterns that are false positives for hard-coded strings
const FALSE_POSITIVE_PATTERNS = [
  /^"blur"$/,
  /^"0"$/,
  /^"\d+"$/, // Pure numbers
  /^"[a-z]+"$/, // Single lowercase word (likely CSS class or prop value)
  /^"(left|right|middle|default|destructive|outline|secondary|ghost|link)"$/,
  /^"(sm|md|lg|xl|2xl|full)"$/,
  /^"(pending|in_progress|completed|cancelled)"$/,
  /^"(png|jpeg|jpg|gif|webp|pdf)"$/,
  /^"(GET|POST|PUT|DELETE|PATCH)"$/,
  /^"(el|en)"$/,
  /^"https?:\/\//,
  /^"[a-z-]+@[a-z-]+\.[a-z]+"$/, // Email patterns
  /^"[A-Z_]+"$/, // Constants like "ACTIVE", "PENDING"
  /^"\$\{/,  // Template literals
  /^"#[0-9a-fA-F]+"$/, // Hex colors
  /^"rgb\(/,
  /^"hsl\(/,
  /^"var\(--/,
  /^"\.\/"/, // Relative paths
  /^"@\//,   // Import paths
  /^"[a-z]+:"$/, // Protocol prefixes
];

interface AuditResult {
  hardCodedStrings: HardCodedString[];
  localeConditionals: LocaleConditional[];
  dateFormatAntiPatterns: DateFormatAntiPattern[];
  keyParityIssues: KeyParityIssue[];
  unusedKeys: UnusedKey[];
  summary: AuditSummary;
}

interface HardCodedString {
  file: string;
  line: number;
  type: "placeholder" | "aria-label" | "title" | "jsx-text" | "label";
  value: string;
  context: string;
}

interface LocaleConditional {
  file: string;
  line: number;
  pattern: string;
  context: string;
}

interface DateFormatAntiPattern {
  file: string;
  line: number;
  method: string;
  context: string;
}

interface KeyParityIssue {
  namespace: string;
  key: string;
  missingIn: "el" | "en";
}

interface UnusedKey {
  namespace: string;
  key: string;
  locale: "el" | "en";
}

interface AuditSummary {
  totalFiles: number;
  filesWithIssues: number;
  hardCodedStringsCount: number;
  localeConditionalsCount: number;
  dateFormatAntiPatternsCount: number;
  keyParityIssuesCount: number;
  unusedKeysCount: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const checkParity = args.includes("--check-parity");
const failOnDiff = args.includes("--fail-on-diff");
const _verbose = args.includes("--verbose");

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item)) {
        getAllFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (FILE_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(item)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

/**
 * Check if a string value is likely a false positive
 */
function isFalsePositive(value: string): boolean {
  // Remove quotes for checking
  const unquoted = value.replace(/^["']|["']$/g, "");

  // Skip very short strings
  if (unquoted.length < 3) return true;

  // Skip strings that are likely code/technical values
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(value) || pattern.test(`"${unquoted}"`)) {
      return true;
    }
  }

  // Skip strings that look like CSS classes
  if (/^"[a-z0-9-_\s]+$/i.test(value) && !value.includes(" ")) {
    return true;
  }

  // Skip strings that don't contain letters (Greek or English)
  if (!/[a-zA-Z\u0370-\u03FF]/.test(unquoted)) {
    return true;
  }

  return false;
}

/**
 * Scan a file for hard-coded strings
 */
function scanForHardCodedStrings(filePath: string, content: string): HardCodedString[] {
  const results: HardCodedString[] = [];
  const lines = content.split("\n");

  // Patterns to match
  const patterns: { regex: RegExp; type: HardCodedString["type"] }[] = [
    { regex: /placeholder=["']([^"']+)["']/g, type: "placeholder" },
    { regex: /placeholder=\{["']([^"']+)["']\}/g, type: "placeholder" },
    { regex: /aria-label=["']([^"']+)["']/g, type: "aria-label" },
    { regex: /aria-label=\{["']([^"']+)["']\}/g, type: "aria-label" },
    { regex: /title=["']([^"']+)["']/g, type: "title" },
    { regex: /title=\{["']([^"']+)["']\}/g, type: "title" },
    { regex: /<Label[^>]*>([A-Za-z\u0370-\u03FF][^<]{2,})<\/Label>/g, type: "label" },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const { regex, type } of patterns) {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(line)) !== null) {
        const value = match[1];
        if (!isFalsePositive(`"${value}"`)) {
          results.push({
            file: path.relative(ROOT_DIR, filePath),
            line: lineNum,
            type,
            value,
            context: line.trim().substring(0, 100),
          });
        }
      }
    }

    // Check for JSX text content (more complex pattern)
    // Look for text between > and < that contains user-facing strings
    const jsxTextPattern = />([A-Za-z\u0370-\u03FF][^<>{]*[A-Za-z\u0370-\u03FF])</g;
    let jsxMatch;
    while ((jsxMatch = jsxTextPattern.exec(line)) !== null) {
      const text = jsxMatch[1].trim();
      // Skip if it looks like it's already using translation
      if (text.includes("{t(") || text.includes("{t.") || text.length < 4) {
        continue;
      }
      // Skip if it's a technical/code value
      if (/^[A-Z_]+$/.test(text) || /^\d+$/.test(text)) {
        continue;
      }
      // Skip if it's just punctuation and numbers
      if (!/[a-zA-Z\u0370-\u03FF]{3,}/.test(text)) {
        continue;
      }
      results.push({
        file: path.relative(ROOT_DIR, filePath),
        line: lineNum,
        type: "jsx-text",
        value: text,
        context: line.trim().substring(0, 100),
      });
    }
  }

  return results;
}

/**
 * Scan for locale conditional patterns
 */
function scanForLocaleConditionals(filePath: string, content: string): LocaleConditional[] {
  const results: LocaleConditional[] = [];
  const lines = content.split("\n");

  // Pattern to match locale ternaries
  const pattern = /locale\s*===?\s*["'](el|en)["']\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(line)) !== null) {
      results.push({
        file: path.relative(ROOT_DIR, filePath),
        line: lineNum,
        pattern: match[0],
        context: line.trim().substring(0, 120),
      });
    }
  }

  return results;
}

/**
 * Scan for date/number formatting anti-patterns
 */
function scanForDateFormatAntiPatterns(filePath: string, content: string): DateFormatAntiPattern[] {
  const results: DateFormatAntiPattern[] = [];
  const lines = content.split("\n");

  // Skip API routes and scripts that may need locale-specific formatting
  const relativePath = path.relative(ROOT_DIR, filePath);
  if (
    relativePath.startsWith("app/api/") ||
    relativePath.startsWith("scripts/") ||
    relativePath.includes("/internal/") ||
    relativePath.includes("export")
  ) {
    return results;
  }

  const methods = ["toLocaleDateString", "toLocaleTimeString", "toLocaleString"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const method of methods) {
      if (line.includes(`.${method}(`)) {
        // Skip if it's in a comment
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
          continue;
        }
        results.push({
          file: path.relative(ROOT_DIR, filePath),
          line: lineNum,
          method,
          context: line.trim().substring(0, 100),
        });
      }
    }
  }

  return results;
}

/**
 * Get all keys from a JSON object recursively
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Check key parity between el and en locale files
 */
function checkKeyParityFn(): KeyParityIssue[] {
  const issues: KeyParityIssue[] = [];

  const elDir = path.join(LOCALES_DIR, "el");
  const enDir = path.join(LOCALES_DIR, "en");

  if (!fs.existsSync(elDir) || !fs.existsSync(enDir)) {
    console.error("Locale directories not found");
    return issues;
  }

  const elFiles = fs.readdirSync(elDir).filter((f) => f.endsWith(".json"));
  const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith(".json"));

  // Check for missing files
  const allFiles = new Set([...elFiles, ...enFiles]);

  for (const file of allFiles) {
    const namespace = file.replace(".json", "");
    const elPath = path.join(elDir, file);
    const enPath = path.join(enDir, file);

    if (!fs.existsSync(elPath)) {
      issues.push({ namespace, key: "(entire file)", missingIn: "el" });
      continue;
    }
    if (!fs.existsSync(enPath)) {
      issues.push({ namespace, key: "(entire file)", missingIn: "en" });
      continue;
    }

    try {
      const elContent = JSON.parse(fs.readFileSync(elPath, "utf-8"));
      const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));

      const elKeys = new Set(getAllKeys(elContent));
      const enKeys = new Set(getAllKeys(enContent));

      // Find keys missing in each locale
      for (const key of elKeys) {
        if (!enKeys.has(key)) {
          issues.push({ namespace, key, missingIn: "en" });
        }
      }
      for (const key of enKeys) {
        if (!elKeys.has(key)) {
          issues.push({ namespace, key, missingIn: "el" });
        }
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }

  return issues;
}

/**
 * Main audit function
 */
async function runAudit(): Promise<AuditResult> {
  console.log("Starting i18n audit...\n");

  const result: AuditResult = {
    hardCodedStrings: [],
    localeConditionals: [],
    dateFormatAntiPatterns: [],
    keyParityIssues: [],
    unusedKeys: [],
    summary: {
      totalFiles: 0,
      filesWithIssues: 0,
      hardCodedStringsCount: 0,
      localeConditionalsCount: 0,
      dateFormatAntiPatternsCount: 0,
      keyParityIssuesCount: 0,
      unusedKeysCount: 0,
    },
  };

  // Collect all files to scan
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    getAllFiles(dir, files);
  }

  result.summary.totalFiles = files.length;
  console.log(`Scanning ${files.length} files...\n`);

  const filesWithIssues = new Set<string>();

  // Scan each file
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");

    const hardCoded = scanForHardCodedStrings(file, content);
    const localeConditionals = scanForLocaleConditionals(file, content);
    const datePatterns = scanForDateFormatAntiPatterns(file, content);

    if (hardCoded.length > 0 || localeConditionals.length > 0 || datePatterns.length > 0) {
      filesWithIssues.add(file);
    }

    result.hardCodedStrings.push(...hardCoded);
    result.localeConditionals.push(...localeConditionals);
    result.dateFormatAntiPatterns.push(...datePatterns);
  }

  // Check key parity
  console.log("Checking locale key parity...\n");
  result.keyParityIssues = checkKeyParityFn();

  // Update summary
  result.summary.filesWithIssues = filesWithIssues.size;
  result.summary.hardCodedStringsCount = result.hardCodedStrings.length;
  result.summary.localeConditionalsCount = result.localeConditionals.length;
  result.summary.dateFormatAntiPatternsCount = result.dateFormatAntiPatterns.length;
  result.summary.keyParityIssuesCount = result.keyParityIssues.length;

  return result;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(result: AuditResult): string {
  const lines: string[] = [];

  lines.push("# i18n Audit Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total files scanned | ${result.summary.totalFiles} |`);
  lines.push(`| Files with issues | ${result.summary.filesWithIssues} |`);
  lines.push(`| Hard-coded strings | ${result.summary.hardCodedStringsCount} |`);
  lines.push(`| Locale conditionals | ${result.summary.localeConditionalsCount} |`);
  lines.push(`| Date format anti-patterns | ${result.summary.dateFormatAntiPatternsCount} |`);
  lines.push(`| Key parity issues | ${result.summary.keyParityIssuesCount} |`);
  lines.push("");

  // Hard-coded strings
  if (result.hardCodedStrings.length > 0) {
    lines.push("## Hard-coded Strings");
    lines.push("");
    lines.push("| File | Line | Type | Value |");
    lines.push("|------|------|------|-------|");
    for (const item of result.hardCodedStrings.slice(0, 100)) {
      const escapedValue = item.value.replace(/\|/g, "\\|").substring(0, 50);
      lines.push(`| ${item.file} | ${item.line} | ${item.type} | ${escapedValue} |`);
    }
    if (result.hardCodedStrings.length > 100) {
      lines.push(`| ... | ... | ... | (${result.hardCodedStrings.length - 100} more) |`);
    }
    lines.push("");
  }

  // Locale conditionals
  if (result.localeConditionals.length > 0) {
    lines.push("## Locale Conditionals (Anti-pattern)");
    lines.push("");
    lines.push("These should be replaced with `t()` calls:");
    lines.push("");
    lines.push("| File | Line | Pattern |");
    lines.push("|------|------|---------|");
    for (const item of result.localeConditionals) {
      const escapedPattern = item.pattern.replace(/\|/g, "\\|").substring(0, 80);
      lines.push(`| ${item.file} | ${item.line} | \`${escapedPattern}\` |`);
    }
    lines.push("");
  }

  // Date format anti-patterns
  if (result.dateFormatAntiPatterns.length > 0) {
    lines.push("## Date/Number Format Anti-patterns");
    lines.push("");
    lines.push("These should use `useFormatter()` from next-intl:");
    lines.push("");
    lines.push("| File | Line | Method |");
    lines.push("|------|------|--------|");
    for (const item of result.dateFormatAntiPatterns.slice(0, 50)) {
      lines.push(`| ${item.file} | ${item.line} | ${item.method} |`);
    }
    if (result.dateFormatAntiPatterns.length > 50) {
      lines.push(`| ... | ... | (${result.dateFormatAntiPatterns.length - 50} more) |`);
    }
    lines.push("");
  }

  // Key parity issues
  if (result.keyParityIssues.length > 0) {
    lines.push("## Key Parity Issues");
    lines.push("");
    lines.push("| Namespace | Key | Missing In |");
    lines.push("|-----------|-----|------------|");
    for (const item of result.keyParityIssues) {
      lines.push(`| ${item.namespace} | ${item.key} | ${item.missingIn} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Main entry point
 */
async function main() {
  try {
    const result = await runAudit();

    // Output to console
    console.log("Audit Results:");
    console.log("-".repeat(50));
    console.log(`  Total files scanned: ${result.summary.totalFiles}`);
    console.log(`  Files with issues: ${result.summary.filesWithIssues}`);
    console.log(`  Hard-coded strings: ${result.summary.hardCodedStringsCount}`);
    console.log(`  Locale conditionals: ${result.summary.localeConditionalsCount}`);
    console.log(`  Date format anti-patterns: ${result.summary.dateFormatAntiPatternsCount}`);
    console.log(`  Key parity issues: ${result.summary.keyParityIssuesCount}`);
    console.log("-".repeat(50));

    // Write JSON report
    const jsonReportPath = path.join(__dirname, "i18n-audit-report.json");
    fs.writeFileSync(jsonReportPath, JSON.stringify(result, null, 2));
    console.log(`\nJSON report written to: ${jsonReportPath}`);

    // Write Markdown report
    const mdReport = generateMarkdownReport(result);
    const mdReportPath = path.join(__dirname, "i18n-audit-report.md");
    fs.writeFileSync(mdReportPath, mdReport);
    console.log(`Markdown report written to: ${mdReportPath}`);

    // Check for failures
    if (checkParity && result.keyParityIssues.length > 0) {
      console.log("\nKey parity check failed!");
      if (failOnDiff) {
        process.exit(1);
      }
    }

    if (failOnDiff && result.summary.filesWithIssues > 0) {
      console.log("\nAudit found issues!");
      process.exit(1);
    }

    console.log("\nAudit complete!");
  } catch (error) {
    console.error("Error running audit:", error);
    process.exit(1);
  }
}

main();
