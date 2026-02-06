/**
 * Cursor Stop Hook — Quality Gate
 *
 * Runs when the agent completes a task. Checks for lint errors
 * and tenant isolation issues, and asks the agent to fix them
 * before marking the work as truly done.
 *
 * Configuration: .cursor/hooks.json
 * Requires: tsx (npx tsx)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface StopHookInput {
  conversation_id: string;
  status: "completed" | "aborted" | "error";
  loop_count: number;
}

const MAX_ITERATIONS = 3;

function runCommand(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error: any) {
    return error.stdout ?? error.message ?? "";
  }
}

async function main() {
  // Read input from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input: StopHookInput = JSON.parse(Buffer.concat(chunks).toString());

  // Only run on completed status, skip if aborted/errored or max iterations
  if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  // Check scratchpad for DONE marker (grind pattern)
  try {
    const scratchpad = readFileSync(".cursor/scratchpad.md", "utf-8");
    if (scratchpad.includes("DONE")) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }
  } catch {
    // No scratchpad file — continue with checks
  }

  const issues: string[] = [];

  // Phase 1: Quick lint check
  const lintOutput = runCommand("pnpm", ["lint"]);
  if (lintOutput.includes("error")) {
    issues.push("Lint errors detected. Run `pnpm lint` and fix the errors.");
  }

  // Phase 2: Check for new Prisma queries missing organizationId
  const diffOutput = runCommand("git", ["diff", "--name-only"]);
  const changedFiles = diffOutput
    .split("\n")
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .filter((f) => f.startsWith("actions/") || f.startsWith("app/api/"));

  for (const file of changedFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      if (
        content.includes("prismadb.") &&
        !content.includes("organizationId") &&
        !content.includes("prismaForOrg") &&
        !file.includes("platform-admin")
      ) {
        issues.push(
          `Potential tenant isolation issue in ${file}: Prisma query without organizationId filtering.`
        );
      }
    } catch {
      // File might not exist (deleted), skip
    }
  }

  // If issues found, ask agent to fix them
  if (issues.length > 0) {
    const message = [
      `[Verification ${input.loop_count + 1}/${MAX_ITERATIONS}] Issues found:`,
      ...issues.map((issue, i) => `${i + 1}. ${issue}`),
      "",
      "Please fix these issues before completing.",
    ].join("\n");

    console.log(JSON.stringify({ followup_message: message }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main().catch(() => {
  // Don't block the agent on hook failures
  console.log(JSON.stringify({}));
  process.exit(0);
});
