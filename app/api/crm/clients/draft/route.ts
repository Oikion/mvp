import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { generateFriendlyId } from "@/lib/friendly-id";

// Helper function to convert string to number or null
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// Helper function to convert empty string to null
function nullIfEmpty(value: any): any {
  if (value === "") return null;
  return value;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    
    // Extract all possible fields
    const {
      id,
      client_name,
      primary_email,
      primary_phone,
      secondary_phone,
      secondary_email,
      person_type,
      full_name,
      company_name,
      intent,
      channels,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      purpose,
      areas_of_interest,
      budget_min,
      budget_max,
      timeline,
      financing_type,
      preapproval_bank,
      needs_mortgage_help,
      gdpr_consent,
      allow_marketing,
      lead_source,
      assigned_to,
      client_type,
      client_status,
      property_preferences,
      communication_notes,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      billing_street,
      billing_postal_code,
      billing_city,
      billing_state,
      billing_country,
      shipping_street,
      shipping_postal_code,
      shipping_city,
      shipping_state,
      shipping_country,
      description,
      member_of,
    } = body;

    // Build data object with validated and converted fields
    const data: any = {
      updatedBy: user.id,
      draft_status: true,
    };

    // String fields - convert empty strings to null
    if (client_name !== undefined) data.client_name = nullIfEmpty(client_name) || "Draft Client";
    if (primary_email !== undefined) data.primary_email = nullIfEmpty(primary_email);
    if (primary_phone !== undefined) data.primary_phone = nullIfEmpty(primary_phone);
    if (secondary_phone !== undefined) data.secondary_phone = nullIfEmpty(secondary_phone);
    if (secondary_email !== undefined) data.secondary_email = nullIfEmpty(secondary_email);
    if (full_name !== undefined) data.full_name = nullIfEmpty(full_name);
    if (company_name !== undefined) data.company_name = nullIfEmpty(company_name);
    if (afm !== undefined) data.afm = nullIfEmpty(afm);
    if (doy !== undefined) data.doy = nullIfEmpty(doy);
    if (id_doc !== undefined) data.id_doc = nullIfEmpty(id_doc);
    if (company_gemi !== undefined) data.company_gemi = nullIfEmpty(company_gemi);
    if (preapproval_bank !== undefined) data.preapproval_bank = nullIfEmpty(preapproval_bank);
    if (office_phone !== undefined) data.office_phone = nullIfEmpty(office_phone);
    if (website !== undefined) data.website = nullIfEmpty(website);
    if (fax !== undefined) data.fax = nullIfEmpty(fax);
    if (company_id !== undefined) data.company_id = nullIfEmpty(company_id);
    if (vat !== undefined) data.vat = nullIfEmpty(vat);
    if (billing_street !== undefined) data.billing_street = nullIfEmpty(billing_street);
    if (billing_postal_code !== undefined) data.billing_postal_code = nullIfEmpty(billing_postal_code);
    if (billing_city !== undefined) data.billing_city = nullIfEmpty(billing_city);
    if (billing_state !== undefined) data.billing_state = nullIfEmpty(billing_state);
    if (billing_country !== undefined) data.billing_country = nullIfEmpty(billing_country);
    if (shipping_street !== undefined) data.shipping_street = nullIfEmpty(shipping_street);
    if (shipping_postal_code !== undefined) data.shipping_postal_code = nullIfEmpty(shipping_postal_code);
    if (shipping_city !== undefined) data.shipping_city = nullIfEmpty(shipping_city);
    if (shipping_state !== undefined) data.shipping_state = nullIfEmpty(shipping_state);
    if (shipping_country !== undefined) data.shipping_country = nullIfEmpty(shipping_country);
    if (description !== undefined) data.description = nullIfEmpty(description);
    if (assigned_to !== undefined) data.assigned_to = nullIfEmpty(assigned_to);
    if (member_of !== undefined) data.member_of = nullIfEmpty(member_of);

    // Enum fields - only set if not empty
    if (person_type !== undefined && person_type !== null && person_type !== "") {
      data.person_type = person_type;
    }
    if (intent !== undefined && intent !== null && intent !== "") {
      data.intent = intent;
    }
    if (language !== undefined && language !== null && language !== "") {
      data.language = language;
    }
    if (purpose !== undefined && purpose !== null && purpose !== "") {
      data.purpose = purpose;
    }
    if (timeline !== undefined && timeline !== null && timeline !== "") {
      data.timeline = timeline;
    }
    if (financing_type !== undefined && financing_type !== null && financing_type !== "") {
      data.financing_type = financing_type;
    }
    if (lead_source !== undefined && lead_source !== null && lead_source !== "") {
      data.lead_source = lead_source;
    }
    if (client_type !== undefined && client_type !== null && client_type !== "") {
      data.client_type = client_type;
    }
    if (client_status !== undefined && client_status !== null && client_status !== "") {
      data.client_status = client_status;
    }

    // Boolean fields
    if (needs_mortgage_help !== undefined) {
      data.needs_mortgage_help = needs_mortgage_help === true || needs_mortgage_help === "true";
    }
    if (gdpr_consent !== undefined) {
      data.gdpr_consent = gdpr_consent === true || gdpr_consent === "true";
    }
    if (allow_marketing !== undefined) {
      data.allow_marketing = allow_marketing === true || allow_marketing === "true";
    }

    // Number fields (Decimal) - convert strings to numbers or null
    if (budget_min !== undefined) data.budget_min = toNumber(budget_min);
    if (budget_max !== undefined) data.budget_max = toNumber(budget_max);

    // Array fields
    if (channels !== undefined && channels !== null) {
      data.channels = Array.isArray(channels) ? channels : [];
    }

    // JSON fields
    if (areas_of_interest !== undefined && areas_of_interest !== null) {
      data.areas_of_interest = areas_of_interest;
    }
    if (property_preferences !== undefined && property_preferences !== null) {
      data.property_preferences = property_preferences;
    }
    if (communication_notes !== undefined && communication_notes !== null) {
      data.communication_notes = communication_notes;
    }

    let client;

    if (id) {
      // Update existing draft
      const existingClient = await prismadb.clients.findFirst({
        where: { id, organizationId },
      });

      if (!existingClient) {
        return NextResponse.json(
          { error: "Client not found or access denied" },
          { status: 404 }
        );
      }

      client = await prismadb.clients.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.createdBy = user.id;
      data.organizationId = organizationId;
      
      // Generate friendly ID
      const clientId = await generateFriendlyId(prismadb, "Clients");
      data.id = clientId;
      
      // Set minimum required fields for draft
      if (!data.client_name) {
        data.client_name = "Draft Client";
      }

      client = await prismadb.clients.create({
        data,
      });
    }

    await invalidateCache([
      "clients:list",
      "dashboard:accounts-count",
      id ? `account:${id}` : "",
      assigned_to ? `user:${assigned_to}` : "",
    ].filter(Boolean));

    return NextResponse.json({ client }, { status: 200 });
  } catch (error: any) {
    console.error("[CLIENT_DRAFT_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save draft";
    return NextResponse.json(
      { error: "Failed to save draft", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  // PUT is same as POST for drafts - updates existing or creates new
  return POST(req);
}
