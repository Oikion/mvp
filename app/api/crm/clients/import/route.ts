import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { clientImportSchema, type ClientImportData } from "@/lib/import";
import { generateFriendlyIds, generateFriendlyId } from "@/lib/friendly-id";

interface ImportError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { clients } = body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { error: "No clients provided for import" },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Process clients in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const validClients: ClientImportData[] = [];

    // Validate all clients first
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const validation = clientImportSchema.safeParse(client);

      if (validation.success) {
        validClients.push(validation.data);
      } else {
        result.failed++;
        validation.error.errors.forEach((err) => {
          result.errors.push({
            row: i + 2, // +2 for header row and 0-index
            field: err.path.join("."),
            error: err.message,
            value: String(client[err.path[0]] ?? ""),
          });
        });
      }
    }

    // Insert valid clients in batches
    for (let i = 0; i < validClients.length; i += BATCH_SIZE) {
      const batch = validClients.slice(i, i + BATCH_SIZE);

      try {
        // Generate friendly IDs for the batch
        const clientIds = await generateFriendlyIds(prismadb, "Clients", batch.length);

        const createData = batch.map((client, index) => ({
          id: clientIds[index],
          createdBy: user.id,
          updatedBy: user.id,
          organizationId,
          client_name: client.client_name,
          primary_email: client.primary_email || null,
          primary_phone: client.primary_phone || null,
          office_phone: client.office_phone || null,
          secondary_phone: client.secondary_phone || null,
          secondary_email: client.secondary_email || null,
          client_type: client.client_type || null,
          client_status: client.client_status || "LEAD",
          person_type: client.person_type || null,
          intent: client.intent || null,
          company_name: client.company_name || null,
          company_id: client.company_id || null,
          vat: client.vat || null,
          website: client.website || null,
          fax: client.fax || null,
          afm: client.afm || null,
          doy: client.doy || null,
          id_doc: client.id_doc || null,
          company_gemi: client.company_gemi || null,
          billing_street: client.billing_street || null,
          billing_city: client.billing_city || null,
          billing_state: client.billing_state || null,
          billing_postal_code: client.billing_postal_code || null,
          billing_country: client.billing_country || null,
          purpose: client.purpose || null,
          budget_min: client.budget_min || null,
          budget_max: client.budget_max || null,
          timeline: client.timeline || null,
          financing_type: client.financing_type || null,
          preapproval_bank: client.preapproval_bank || null,
          needs_mortgage_help: client.needs_mortgage_help || false,
          lead_source: client.lead_source || null,
          gdpr_consent: client.gdpr_consent || false,
          allow_marketing: client.allow_marketing || false,
          description: client.description || null,
          member_of: client.member_of || null,
          draft_status: false,
        }));

        // Use createMany for batch insert
        const created = await prismadb.clients.createMany({
          data: createData,
          skipDuplicates: true,
        });

        result.imported += created.count;
        
        // If some were skipped due to duplicates
        if (created.count < batch.length) {
          result.skipped += batch.length - created.count;
        }
      } catch (batchError) {
        console.error("[CLIENT_IMPORT_BATCH_ERROR]", batchError);
        // If batch fails, try individual inserts
        for (const client of batch) {
          try {
            // Generate friendly ID for individual insert
            const clientId = await generateFriendlyId(prismadb, "Clients");
            
            await prismadb.clients.create({
              data: {
                id: clientId,
                createdBy: user.id,
                updatedBy: user.id,
                organizationId,
                client_name: client.client_name,
                primary_email: client.primary_email || null,
                primary_phone: client.primary_phone || null,
                office_phone: client.office_phone || null,
                secondary_phone: client.secondary_phone || null,
                secondary_email: client.secondary_email || null,
                client_type: client.client_type || null,
                client_status: client.client_status || "LEAD",
                person_type: client.person_type || null,
                intent: client.intent || null,
                company_name: client.company_name || null,
                company_id: client.company_id || null,
                vat: client.vat || null,
                website: client.website || null,
                fax: client.fax || null,
                afm: client.afm || null,
                doy: client.doy || null,
                id_doc: client.id_doc || null,
                company_gemi: client.company_gemi || null,
                billing_street: client.billing_street || null,
                billing_city: client.billing_city || null,
                billing_state: client.billing_state || null,
                billing_postal_code: client.billing_postal_code || null,
                billing_country: client.billing_country || null,
                purpose: client.purpose || null,
                budget_min: client.budget_min || null,
                budget_max: client.budget_max || null,
                timeline: client.timeline || null,
                financing_type: client.financing_type || null,
                preapproval_bank: client.preapproval_bank || null,
                needs_mortgage_help: client.needs_mortgage_help || false,
                lead_source: client.lead_source || null,
                gdpr_consent: client.gdpr_consent || false,
                allow_marketing: client.allow_marketing || false,
                description: client.description || null,
                member_of: client.member_of || null,
                draft_status: false,
              },
            });
            result.imported++;
          } catch {
            result.failed++;
          }
        }
      }
    }

    // Invalidate cache
    await invalidateCache(["clients:list", "dashboard:accounts-count"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import clients" },
      { status: 500 }
    );
  }
}


