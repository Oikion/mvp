// Run with: pnpm tsx scripts/reencrypt-google-tokens.ts
// Prerequisites: SECRETS_ENCRYPTION_KEY=<new> SECRETS_ENCRYPTION_KEY_PREVIOUS=<old>
import { prismadb } from "@/lib/prisma";
import { encrypt, decryptWithFallback } from "@/lib/encryption";

async function main() {
  const connections = await prismadb.userGoogleCalendarConnection.findMany({
    select: { id: true, accessToken: true, refreshToken: true },
  });

  let migrated = 0;
  let errors = 0;

  for (const conn of connections) {
    try {
      const accessToken = decryptWithFallback(conn.accessToken);
      const refreshToken = decryptWithFallback(conn.refreshToken);
      await prismadb.userGoogleCalendarConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(accessToken),
          refreshToken: encrypt(refreshToken),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`Failed for connection ${conn.id}:`, err);
      errors++;
    }
  }

  console.log(`Done. Migrated: ${migrated}, Errors: ${errors}`);
  await prismadb.$disconnect();
}

main().catch(console.error);
