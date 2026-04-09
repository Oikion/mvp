import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load environment variables (Next.js loads .env then .env.local)
config({ path: path.join(__dirname, '.env') })
config({ path: path.join(__dirname, '.env.local'), override: true })

// Prisma 7: datasource URLs moved out of schema.prisma.
// - `url` here is used by CLI operations (migrate, generate, introspect)
// - We use DIRECT_DATABASE_URL (non-pooled) so `prisma migrate` can acquire
//   the advisory locks it needs, which pooled connections don't support.
// - Runtime PrismaClient (lib/prisma.ts) reads DATABASE_URL (pooled) directly
//   from process.env.
const migrationUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL

if (!migrationUrl) {
  throw new Error(
    'prisma.config.ts: neither DIRECT_DATABASE_URL nor DATABASE_URL is set'
  )
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  datasource: {
    url: migrationUrl,
  },
})




