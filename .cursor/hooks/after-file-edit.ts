/**
 * Cursor afterFileEdit Hook — Immediate Per-Edit Quality Gate
 *
 * Runs immediately after the agent edits any file. Catches TypeScript errors,
 * i18n parity issues, and server action safety violations BEFORE the agent
 * moves on — preventing the "fix loop" where errors only surface during build.
 *
 * Configuration: .cursor/hooks.json
 * Requires: tsx (npx tsx)
 *
 * Hook input payload:
 *   { file_path: string; conversation_id: string; generation_id: string }
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

interface AfterFileEditPayload {
  file_path: string;
  conversation_id: string;
  generation_id?: string;
}

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs = 30000
): { output: string; exitCode: number } {
  try {
    const output = execFileSync(cmd, args, {
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { output, exitCode: 0 };
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      output: (err.stdout ?? "") + (err.stderr ?? err.message ?? ""),
      exitCode: err.status ?? 1,
    };
  }
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  let payload: AfterFileEditPayload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const filePath = payload.file_path;
  if (!filePath) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const isTypeScript = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  const isLocale = filePath.includes("/locales/");
  const isAction = filePath.startsWith("actions/") && filePath.endsWith(".ts");
  const isApiRoute =
    filePath.startsWith("app/api/") && filePath.endsWith(".ts");

  const issues: string[] = [];

  // Phase 1: TypeScript check on modified TS/TSX files
  if (isTypeScript && existsSync(filePath)) {
    const { output, exitCode } = runCommand("npx", ["tsc", "--noEmit"], 45000);
    if (exitCode !== 0) {
      // Extract only errors relevant to the edited file
      const relativePath = relative(process.cwd(), resolve(filePath));
      const fileErrors = output
        .split("\n")
        .filter(
          (line) =>
            line.includes(": error TS") &&
            (line.startsWith(relativePath) ||
              line.startsWith("./" + relativePath))
        )
        .slice(0, 10);

      if (fileErrors.length > 0) {
        issues.push(
          `TypeScript errors in ${relativePath}:\n${fileErrors.join("\n")}\n\nFix these before continuing.`
        );
      } else {
        // Check if there are ANY new type errors (the file may have broken other files)
        const allErrors = output
          .split("\n")
          .filter((line) => line.includes(": error TS"))
          .slice(0, 5);
        if (allErrors.length > 0) {
          issues.push(
            `TypeScript errors introduced (may be caused by ${relativePath}):\n${allErrors.join("\n")}\n\nTrace the type chain and fix the root cause.`
          );
        }
      }
    }
  }

  // Phase 2: i18n parity check when locale files are modified
  if (isLocale && existsSync(filePath)) {
    const { output, exitCode } = runCommand(
      "pnpm",
      ["i18n:parity"],
      30000
    );
    if (exitCode !== 0) {
      const errorLines = output
        .split("\n")
        .filter((line) => line.includes("MISSING") || line.includes("Error"))
        .slice(0, 5);
      issues.push(
        `i18n parity violation detected after editing ${filePath}:\n${errorLines.join("\n") || output.slice(0, 300)}\n\nAdd the missing keys to BOTH locales/el/ and locales/en/.`
      );
    }
  }

  // Phase 3: Server action safety checks (actions/ and app/api/)
  if ((isAction || isApiRoute) && existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");

    // Check for "use server" directive in action files
    if (isAction && !content.startsWith('"use server"') && !content.startsWith("'use server'")) {
      issues.push(
        `Server action file ${filePath} is missing the "use server" directive at the top.`
      );
    }

    // Check for missing permission guard in action files
    if (isAction && content.includes("prismadb.") && !content.includes("requireAction") && !content.includes("requireAuth") && !content.includes("isPlatformAdmin")) {
      issues.push(
        `Server action ${filePath} contains Prisma queries but no permission guard (requireAction/requireAuth). Add a permission guard before any database operation.`
      );
    }

    // Check for organizationId in tenant-scoped queries
    if (
      content.includes("prismadb.") &&
      !content.includes("organizationId") &&
      !content.includes("prismaForOrg") &&
      !filePath.includes("platform-admin") &&
      !filePath.includes("platform_admin")
    ) {
      issues.push(
        `Potential tenant isolation issue in ${filePath}: Prisma queries found without organizationId filtering. Ensure all queries are scoped to the current organization.`
      );
    }
  }

  if (issues.length > 0) {
    const message = [
      `[afterFileEdit] Issues found in ${filePath}:`,
      "",
      ...issues.map((issue, i) => `${i + 1}. ${issue}`),
      "",
      "Fix these issues before moving to the next file.",
    ].join("\n");

    console.log(JSON.stringify({ followup_message: message }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(() => {
  // Never block the agent on hook failures
  console.log(JSON.stringify({}));
  process.exit(0);
});
