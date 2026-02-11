import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const fail = (message: string): never => {
  console.error(`[db:validate] ${message}`);
  process.exit(1);
};

const migrationsDir = join(process.cwd(), "prisma", "migrations");

if (!existsSync(migrationsDir)) {
  fail("Missing prisma/migrations directory.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail("DATABASE_URL is required.");
}

if (process.env.NODE_ENV === "production" && !process.env.DIRECT_DATABASE_URL) {
  fail("DIRECT_DATABASE_URL is required in production.");
}

const gitStatus = execSync(
  "git status --porcelain prisma/schema.prisma prisma/migrations",
  { encoding: "utf8" },
).trim();

if (gitStatus) {
  fail("Uncommitted changes detected in prisma/schema.prisma or prisma/migrations.");
}

try {
  const output = execSync("pnpm prisma migrate status", {
    encoding: "utf8",
    stdio: "pipe",
  });
  console.log(output.trim());
} catch (error) {
  console.error("[db:validate] Prisma migration status failed.");
  console.error(error);
  process.exit(1);
}
