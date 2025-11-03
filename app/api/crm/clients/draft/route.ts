import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    
    // Extract all possible fields (including new Greece-specific ones)
    const {
      id, // If provided, update existing draft
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
      // Legacy fields
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

    // Build data object with only provided fields
    const data: any = {
      updatedBy: user.id,
      draft_status: true, // Always mark as draft
    };

    // Only include fields that are provided (not undefined)
    if (client_name !== undefined) data.client_name = client_name;
    if (primary_email !== undefined) data.primary_email = primary_email;
    if (primary_phone !== undefined) data.primary_phone = primary_phone;
    if (secondary_phone !== undefined) data.secondary_phone = secondary_phone;
    if (secondary_email !== undefined) data.secondary_email = secondary_email;
    if (person_type !== undefined) data.person_type = person_type;
    if (full_name !== undefined) data.full_name = full_name;
    if (company_name !== undefined) data.company_name = company_name;
    if (intent !== undefined) data.intent = intent;
    if (channels !== undefined) data.channels = channels;
    if (language !== undefined) data.language = language;
    if (afm !== undefined) data.afm = afm;
    if (doy !== undefined) data.doy = doy;
    if (id_doc !== undefined) data.id_doc = id_doc;
    if (company_gemi !== undefined) data.company_gemi = company_gemi;
    if (purpose !== undefined) data.purpose = purpose;
    if (areas_of_interest !== undefined) data.areas_of_interest = areas_of_interest;
    if (budget_min !== undefined) data.budget_min = budget_min;
    if (budget_max !== undefined) data.budget_max = budget_max;
    if (timeline !== undefined) data.timeline = timeline;
    if (financing_type !== undefined) data.financing_type = financing_type;
    if (preapproval_bank !== undefined) data.preapproval_bank = preapproval_bank;
    if (needs_mortgage_help !== undefined) data.needs_mortgage_help = needs_mortgage_help;
    if (gdpr_consent !== undefined) data.gdpr_consent = gdpr_consent;
    if (allow_marketing !== undefined) data.allow_marketing = allow_marketing;
    if (lead_source !== undefined) data.lead_source = lead_source;
    if (assigned_to !== undefined) data.assigned_to = assigned_to;
    if (client_type !== undefined) data.client_type = client_type;
    if (client_status !== undefined) data.client_status = client_status;
    if (property_preferences !== undefined) data.property_preferences = property_preferences;
    if (communication_notes !== undefined) data.communication_notes = communication_notes;
    if (office_phone !== undefined) data.office_phone = office_phone;
    if (website !== undefined) data.website = website;
    if (fax !== undefined) data.fax = fax;
    if (company_id !== undefined) data.company_id = company_id;
    if (vat !== undefined) data.vat = vat;
    if (billing_street !== undefined) data.billing_street = billing_street;
    if (billing_postal_code !== undefined) data.billing_postal_code = billing_postal_code;
    if (billing_city !== undefined) data.billing_city = billing_city;
    if (billing_state !== undefined) data.billing_state = billing_state;
    if (billing_country !== undefined) data.billing_country = billing_country;
    if (shipping_street !== undefined) data.shipping_street = shipping_street;
    if (shipping_postal_code !== undefined) data.shipping_postal_code = shipping_postal_code;
    if (shipping_city !== undefined) data.shipping_city = shipping_city;
    if (shipping_state !== undefined) data.shipping_state = shipping_state;
    if (shipping_country !== undefined) data.shipping_country = shipping_country;
    if (description !== undefined) data.description = description;
    if (member_of !== undefined) data.member_of = member_of;

    let client;

    if (id) {
      // Update existing draft
      const existingClient = await prismadb.clients.findFirst({
        where: { id, organizationId },
      });

      if (!existingClient) {
        return new NextResponse("Client not found or access denied", { status: 404 });
      }

      client = await prismadb.clients.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.createdBy = user.id;
      data.organizationId = organizationId;
      
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
    console.log("[CLIENT_DRAFT_POST]", error);
    const errorMessage = error?.message || "Failed to save draft";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // PUT is same as POST for drafts - updates existing or creates new
  return POST(req);
}

