/**
 * delete-orphaned-contacts.ts
 *
 * Finds contacts whose encrypted fields cannot be decrypted with the
 * organization's current DEK(s) — indicating the original DEK was deleted
 * (e.g. via a broken deleteOrgData path) while encrypted records remained.
 *
 * These contacts are permanently unrecoverable: all 18 encrypted string fields
 * return null, so they appear as "Unnamed Contact" with no email/phone/etc.
 *
 * Run:
 *   npx tsx scripts/delete-orphaned-contacts.ts            # dry run
 *   npx tsx scripts/delete-orphaned-contacts.ts --confirm  # actually delete
 *   npx tsx scripts/delete-orphaned-contacts.ts --org=<id> # scope to one org
 */

import { prismadb } from "@/lib/prisma";
import { isEncrypted, decryptWithKeys } from "@/lib/encryption";
import { getOrgDeksForDecryption } from "@/lib/key-management";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--confirm");
const ORG_FILTER = args.find((a) => a.startsWith("--org="))?.split("=")[1];

async function main() {
  console.log(DRY_RUN ? "\n[DRY RUN] No records will be deleted.\n" : "\n[LIVE] Deleting orphaned contacts.\n");
  if (ORG_FILTER) console.log(`  Scoped to org: ${ORG_FILTER}\n`);

  // 1. Collect distinct org IDs from the Contact table itself (orgs live in Clerk, not Prisma)
  const orgRows = await prismadb.contact.findMany({
    where: ORG_FILTER ? { organizationId: ORG_FILTER } : undefined,
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  const orgIds = orgRows.map((r) => r.organizationId);

  if (orgIds.length === 0) {
    console.log("No organizations with contacts found.");
    return;
  }

  console.log(`Scanning ${orgIds.length} organization(s)...\n`);

  let totalOrphaned = 0;
  const toDelete: { orgId: string; contactId: string; displayHint: string }[] = [];

  // All 18 server-side encrypted string fields on Contact
  const ENCRYPTED_FIELDS = [
    "firstName", "lastName", "displayName", "companyName",
    "email", "secondaryEmail", "primaryPhone", "secondaryPhone",
    "officePhone", "whatsapp", "viber",
    "taxId", "doy", "vatNumber", "companyGemi", "companyId", "idDocument",
    "notes",
  ] as const;

  for (const orgId of orgIds) {
    // 2. Fetch all contacts with all encrypted fields
    const contacts = await prismadb.contact.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        firstName: true, lastName: true, displayName: true, companyName: true,
        email: true, secondaryEmail: true, primaryPhone: true, secondaryPhone: true,
        officePhone: true, whatsapp: true, viber: true,
        taxId: true, doy: true, vatNumber: true, companyGemi: true, companyId: true,
        idDocument: true, notes: true,
      },
    });

    if (contacts.length === 0) continue;

    // 3. Load the org's current DEK(s) for decryption
    let deks: Buffer[];
    try {
      deks = await getOrgDeksForDecryption(orgId);
    } catch {
      console.warn(`  [WARN] Could not load DEKs for org ${orgId} — skipping`);
      continue;
    }

    for (const contact of contacts) {
      // Find the first encrypted field value to use as probe
      let probe: string | null = null;
      for (const field of ENCRYPTED_FIELDS) {
        const val = contact[field] as string | null;
        if (val && isEncrypted(val)) {
          probe = val;
          break;
        }
      }

      if (!probe) {
        // No encrypted fields on this contact — not orphaned
        continue;
      }

      // Try to decrypt with all available DEKs.
      // decryptWithKeys throws (never returns null) when all candidates fail.
      let isOrphaned = false;
      try {
        decryptWithKeys(probe, deks);
      } catch {
        isOrphaned = true;
      }

      if (isOrphaned) {
        // Encrypted field that no current DEK can decrypt → orphaned DEK
        totalOrphaned++;
        const hint = `id=${contact.id} (all encrypted fields unreadable)`;
        toDelete.push({ orgId, contactId: contact.id, displayHint: hint });
        console.log(`  ORPHANED  org="${orgId}"  ${hint}`);
      }
    }
  }

  console.log(`\nFound ${totalOrphaned} orphaned contact(s).`);

  if (totalOrphaned === 0 || DRY_RUN) {
    if (DRY_RUN && totalOrphaned > 0) {
      console.log("\nRe-run with --confirm to delete these records.");
    }
    return;
  }

  // 4. Delete — also cascade-clean EntityChangeLog entries (no FK)
  const contactIds = toDelete.map((r) => r.contactId);

  await prismadb.$transaction(async (tx) => {
    await tx.entityChangeLog.deleteMany({
      where: { entityId: { in: contactIds } },
    });
    const { count } = await tx.contact.deleteMany({
      where: { id: { in: contactIds } },
    });
    console.log(`\nDeleted ${count} orphaned contact(s) + their EntityChangeLog entries.`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prismadb.$disconnect());
