import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load environment variables (Next.js loads .env then .env.local)
config({ path: path.join(__dirname, '.env') })
config({ path: path.join(__dirname, '.env.local') })

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
})




