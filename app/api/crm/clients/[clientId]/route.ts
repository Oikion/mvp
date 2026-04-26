import { NextResponse } from "next/server";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyAccountWatchers } from "@/lib/notifications";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";

export async function GET(
  _req: Request,
  props: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await props.params;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  try {
    // Permission check: Users need client:read permission
    const readCheck = await canPerformAction("client:read");
    if (!readCheck.allowed) {
      return NextResponse.json(
        { error: readCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const client = await prismaTenant.contact.findFirst({
      where: {
        organizationId,
        friendlyId: clientId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Decrypt encrypted fields, then serialize to plain object
    const decrypted = await decryptContactForOrg(client, organizationId);
    const serialized = JSON.parse(JSON.stringify(decrypted));

    return NextResponse.json({ client: serialized }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await props.params;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const {
      client_name,
      primary_email,
      primary_phone,
      secondary_phone,
      secondary_email,
      person_type,
      company_name,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      gdpr_consent,
      allow_marketing,
      lead_source,
      client_type,
      client_status,
      communication_notes,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      description,
      assigned_to,
    } = body;

    // Verify the client belongs to the current organization before updating.
    // Accept both UUID (from wizard autosave draftId) and friendlyId (from client detail routes).
    const existingClient =
      (await prismadb.contact.findFirst({ where: { organizationId, id: clientId } })) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await prismadb.contact.findFirst({ where: { organizationId, friendlyId: clientId } as any }));

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
    }

    // Permission check: Users need client:update permission (with ownership check)
    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "contact",
      existingClient.id,
      existingClient.assignedAgentId
    );
    if (!updateCheck.allowed) {
      return NextResponse.json(
        { error: updateCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    // Permission check: Check if user can reassign agent
    if (assigned_to !== undefined && assigned_to !== existingClient.assignedAgentId) {
      const reassignCheck = await canPerformAction("client:reassign_agent");
      if (!reassignCheck.allowed) {
        return NextResponse.json(
          { error: "You do not have permission to change the assigned agent" },
          { status: 403 }
        );
      }
    }

    const rawData = {
        updatedBy: user.id,
        // Map legacy snake_case body fields → Contact camelCase model fields
        displayName: client_name,
        email: primary_email,
        primaryPhone: primary_phone,
        secondaryPhone: secondary_phone,
        secondaryEmail: secondary_email,
        isCompany: person_type === "company",
        companyName: company_name,
        languagePreference: language,
        taxId: afm,
        doy,
        idDocument: id_doc,
        companyGemi: company_gemi,
        gdprConsentGiven: gdpr_consent,
        allowMarketing: allow_marketing,
        source: lead_source,
        category: client_type,
        status: client_status,
        communicationNotes: communication_notes,
        officePhone: office_phone,
        website,
        fax,
        companyId: company_id,
        vatNumber: vat,
        description,
        assignedAgentId: assigned_to,
        // channels, full_name, draft_status, billing_*/shipping_* fields have no
        // direct equivalent on the Contact model — omit them silently
    };

    // Encrypt sensitive fields before writing to DB
    const encryptedData = await encryptContactForOrg(rawData, organizationId);

    const updatedClient = await prismadb.contact.update({
      where: { id: existingClient.id },
      data: { ...rawData, ...encryptedData },
    });

    await invalidateCache(["clients:list", `account:${clientId}`, assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify watchers about the update using new notification system
    await notifyAccountWatchers(
      clientId,
      organizationId,
      "ACCOUNT_UPDATED",
      `Client "${updatedClient.displayName}" was updated`,
      `${user.name || user.email} updated the client "${updatedClient.displayName}"`,
      {
        updatedBy: user.id,
        updatedByName: user.name || user.email,
      }
    );

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_PUT]", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}






