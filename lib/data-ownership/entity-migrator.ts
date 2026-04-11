/**
 * Entity Migrator for AGENT-mode departures.
 *
 * When an agent departs an org that uses AGENT data ownership,
 * entities created during AGENT-era policy are copied to the
 * agent's personal workspace. Entities with active deals are kept
 * in the org (with assigned_to nulled) and the agent gets a copy.
 *
 * Encryption: fields are decrypted with source org DEK and
 * re-encrypted with personal workspace DEK.
 */

import type { Prisma, DealStatus } from "@prisma/client";
import { getOrgDek } from "@/lib/key-management";
import {
  decryptPropertyForOrg,
  encryptPropertyForOrg,
  decryptClientForOrg,
  encryptClientForOrg,
  decryptMandateForOrg,
  encryptMandateForOrg,
} from "@/lib/model-encryption";
import { getPolicyForEntity } from "./index";
import type {
  MigrationContext,
  MigrationResult,
  MigratedEntity,
  CancelledDeals,
} from "./types";

/** Deal statuses that are considered "active" and need cancellation */
const ACTIVE_DEAL_STATUSES: DealStatus[] = [
  "PROPOSED",
  "NEGOTIATING",
  "ACCEPTED",
  "IN_PROGRESS",
];

type PrismaTx = Prisma.TransactionClient;

/**
 * Migrate all AGENT-era entities for a departing user.
 * Must be called within a Prisma interactive transaction.
 */
export async function migrateAgentEntities(
  tx: PrismaTx,
  ctx: MigrationContext
): Promise<MigrationResult> {
  const { userId, sourceOrgId, personalOrgId, currentMode, policyHistory } = ctx;

  // Ensure personal workspace DEK exists (auto-creates if missing)
  await getOrgDek(personalOrgId);

  const migratedProperties: MigratedEntity[] = [];
  const migratedClients: { id: string; name: string }[] = [];
  const migratedMandates: MigratedEntity[] = [];
  const cancelledDeals: CancelledDeals = [];

  // ── Properties ──────────────────────────────────────────────
  const properties = await tx.properties.findMany({
    where: { organizationId: sourceOrgId, assigned_to: userId },
    include: {
      PropertyComment: { where: { userId } },
      Property_Contacts: true,
      Deal: true,
    },
  });

  for (const prop of properties) {
    const policy = getPolicyForEntity(prop.createdAt, currentMode, policyHistory);
    if (policy.mode !== "AGENT") continue;

    // Decrypt with source org DEK, re-encrypt with personal DEK
    const decrypted = await decryptPropertyForOrg(prop, sourceOrgId);
    const reEncrypted = await encryptPropertyForOrg(decrypted, personalOrgId);

    const newPropertyId = crypto.randomUUID();

    // Create copy in personal workspace
    await tx.properties.create({
      data: {
        id: newPropertyId,
        friendlyId: prop.friendlyId,
        organizationId: personalOrgId,
        assigned_to: userId,
        property_name: reEncrypted.property_name,
        primary_email: reEncrypted.primary_email,
        communication_notes: reEncrypted.communication_notes as any,
        property_type: prop.property_type,
        property_status: prop.property_status,
        property_preferences: prop.property_preferences as any,
        address_street: prop.address_street,
        address_city: prop.address_city,
        address_state: prop.address_state,
        address_zip: prop.address_zip,
        price: prop.price,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        square_feet: prop.square_feet,
        lot_size: prop.lot_size,
        year_built: prop.year_built,
        description: prop.description,
        transaction_type: prop.transaction_type,
        size_net_sqm: prop.size_net_sqm,
        size_gross_sqm: prop.size_gross_sqm,
        plot_size_sqm: prop.plot_size_sqm,
        region: prop.region,
        regional_unit: prop.regional_unit,
        municipality: prop.municipality,
        area: prop.area,
        postal_code: prop.postal_code,
        floor: prop.floor,
        floors_total: prop.floors_total,
        condition: prop.condition,
        heating_type: prop.heating_type,
        energy_cert_class: prop.energy_cert_class,
        furnished: prop.furnished,
        elevator: prop.elevator,
        orientation: prop.orientation as any,
        amenities: prop.amenities as any,
        createdBy: userId,
        createdAt: prop.createdAt,
        draft_status: false,
      },
    });

    // Copy agent's own comments
    for (const comment of prop.PropertyComment) {
      await tx.propertyComment.create({
        data: {
          id: crypto.randomUUID(),
          Properties: { connect: { id: newPropertyId } },
          Users: { connect: { id: userId } },
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.createdAt,
        },
      });
    }

    // Cancel active deals referencing this property
    const activeDeals = prop.Deal.filter((d) =>
      ACTIVE_DEAL_STATUSES.includes(d.status)
    );
    for (const deal of activeDeals) {
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          status: "CANCELLED",
          cancellationReason: "AGENT_DEPARTED",
        },
      });
      cancelledDeals.push({ id: deal.id, title: deal.title ?? deal.friendlyId });

      // Notify the counterparty agent
      const counterpartyId =
        deal.propertyAgentId === userId
          ? deal.clientAgentId
          : deal.propertyAgentId;
      if (counterpartyId) {
        await tx.notification.create({
          data: {
            id: crypto.randomUUID(),
            Users: { connect: { id: counterpartyId } },
            organizationId: sourceOrgId,
            type: "DEAL_UPDATED",
            title: `Deal "${deal.title ?? deal.friendlyId}" cancelled — agent departed`,
            message: `A deal has been cancelled because the assigned agent has left the organization.`,
            entityType: "DEAL",
            entityId: deal.id,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Delete shared entity links
    await tx.sharedEntity.deleteMany({
      where: { entityType: "PROPERTY", entityId: prop.id },
    });

    const hasAnyDeals = prop.Deal.length > 0;
    if (hasAnyDeals) {
      // Keep in org with assigned_to nulled (agent gets copy)
      await tx.properties.update({
        where: { id: prop.id },
        data: { assigned_to: null },
      });
    } else {
      // Safe to delete original + child records (cascade handles comments)
      await tx.property_Contacts.deleteMany({ where: { property: prop.id } });
      await tx.propertyComment.deleteMany({ where: { propertyId: prop.id } });
      await tx.properties.delete({ where: { id: prop.id } });
    }

    migratedProperties.push({ id: newPropertyId, title: prop.property_name });
  }

  // ── Clients ─────────────────────────────────────────────────
  const clients = await tx.clients.findMany({
    where: { organizationId: sourceOrgId, assigned_to: userId },
    include: {
      ClientComment: { where: { userId } },
      Deal: true,
    },
  });

  for (const client of clients) {
    const policy = getPolicyForEntity(client.createdAt, currentMode, policyHistory);
    if (policy.mode !== "AGENT") continue;

    const decrypted = await decryptClientForOrg(client, sourceOrgId);
    const reEncrypted = await encryptClientForOrg(decrypted, personalOrgId);

    const newClientId = crypto.randomUUID();

    await tx.clients.create({
      data: {
        id: newClientId,
        friendlyId: client.friendlyId,
        organizationId: personalOrgId,
        assigned_to: userId,
        client_name: reEncrypted.client_name,
        full_name: reEncrypted.full_name,
        primary_email: reEncrypted.primary_email,
        secondary_email: reEncrypted.secondary_email,
        primary_phone: reEncrypted.primary_phone,
        secondary_phone: reEncrypted.secondary_phone,
        office_phone: reEncrypted.office_phone,
        fax: reEncrypted.fax,
        company_name: reEncrypted.company_name,
        company_id: reEncrypted.company_id,
        company_gemi: reEncrypted.company_gemi,
        afm: reEncrypted.afm,
        vat: reEncrypted.vat,
        doy: reEncrypted.doy,
        id_doc: reEncrypted.id_doc,
        description: reEncrypted.description,
        communication_notes: reEncrypted.communication_notes as any,
        billing_street: reEncrypted.billing_street,
        billing_city: reEncrypted.billing_city,
        billing_state: reEncrypted.billing_state,
        billing_postal_code: reEncrypted.billing_postal_code,
        billing_country: reEncrypted.billing_country,
        shipping_street: reEncrypted.shipping_street,
        shipping_city: reEncrypted.shipping_city,
        shipping_state: reEncrypted.shipping_state,
        shipping_postal_code: reEncrypted.shipping_postal_code,
        shipping_country: reEncrypted.shipping_country,
        client_type: client.client_type,
        client_status: client.client_status,
        person_type: client.person_type,
        language: client.language,
        lead_source: client.lead_source,
        website: client.website,
        gdpr_consent: client.gdpr_consent,
        allow_marketing: client.allow_marketing,
        createdBy: userId,
        createdAt: client.createdAt,
        draft_status: false,
      },
    });

    // Copy agent's own comments
    for (const comment of client.ClientComment) {
      await tx.clientComment.create({
        data: {
          id: crypto.randomUUID(),
          Clients: { connect: { id: newClientId } },
          Users: { connect: { id: userId } },
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.createdAt,
        },
      });
    }

    // Cancel active deals referencing this client
    const activeDeals = client.Deal.filter((d) =>
      ACTIVE_DEAL_STATUSES.includes(d.status)
    );
    for (const deal of activeDeals) {
      // Skip if already cancelled (e.g. shared deal with a property above)
      if (cancelledDeals.some((cd) => cd.id === deal.id)) continue;

      await tx.deal.update({
        where: { id: deal.id },
        data: {
          status: "CANCELLED",
          cancellationReason: "AGENT_DEPARTED",
        },
      });
      cancelledDeals.push({ id: deal.id, title: deal.title ?? deal.friendlyId });

      const counterpartyId =
        deal.clientAgentId === userId
          ? deal.propertyAgentId
          : deal.clientAgentId;
      if (counterpartyId) {
        await tx.notification.create({
          data: {
            id: crypto.randomUUID(),
            Users: { connect: { id: counterpartyId } },
            organizationId: sourceOrgId,
            type: "DEAL_UPDATED",
            title: `Deal "${deal.title ?? deal.friendlyId}" cancelled — agent departed`,
            message: `A deal has been cancelled because the assigned agent has left the organization.`,
            entityType: "DEAL",
            entityId: deal.id,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Delete shared entity links
    await tx.sharedEntity.deleteMany({
      where: { entityType: "CLIENT", entityId: client.id },
    });

    const hasAnyDeals = client.Deal.length > 0;
    if (hasAnyDeals) {
      await tx.clients.update({
        where: { id: client.id },
        data: { assigned_to: null },
      });
    } else {
      await tx.clientComment.deleteMany({ where: { clientId: client.id } });
      await tx.clients.delete({ where: { id: client.id } });
    }

    migratedClients.push({ id: newClientId, name: client.client_name });
  }

  // ── Mandates ────────────────────────────────────────────────
  const mandates = await tx.mandate.findMany({
    where: { organizationId: sourceOrgId, assigned_to: userId },
    include: {
      comments: { where: { userId } },
    },
  });

  for (const mandate of mandates) {
    const policy = getPolicyForEntity(mandate.createdAt, currentMode, policyHistory);
    if (policy.mode !== "AGENT") continue;

    const decrypted = await decryptMandateForOrg(mandate, sourceOrgId);
    const reEncrypted = await encryptMandateForOrg(decrypted, personalOrgId);

    const newMandateId = crypto.randomUUID();

    await tx.mandate.create({
      data: {
        id: newMandateId,
        friendlyId: mandate.friendlyId,
        organizationId: personalOrgId,
        assigned_to: userId,
        title: reEncrypted.title,
        notes: reEncrypted.notes,
        communication_notes: reEncrypted.communication_notes as any,
        transaction_type: mandate.transaction_type,
        property_type: mandate.property_type,
        property_purpose: mandate.property_purpose,
        areas_of_interest: mandate.areas_of_interest as any,
        municipality: mandate.municipality,
        region: mandate.region,
        size_min_sqm: mandate.size_min_sqm,
        size_max_sqm: mandate.size_max_sqm,
        plot_size_min_sqm: mandate.plot_size_min_sqm,
        plot_size_max_sqm: mandate.plot_size_max_sqm,
        budget_min: mandate.budget_min,
        budget_max: mandate.budget_max,
        bedrooms_min: mandate.bedrooms_min,
        bedrooms_max: mandate.bedrooms_max,
        bathrooms_min: mandate.bathrooms_min,
        bathrooms_max: mandate.bathrooms_max,
        floor_min: mandate.floor_min,
        floor_max: mandate.floor_max,
        ground_floor_only: mandate.ground_floor_only,
        condition: mandate.condition,
        year_built_min: mandate.year_built_min,
        year_built_max: mandate.year_built_max,
        heating_type: mandate.heating_type,
        energy_cert_min: mandate.energy_cert_min,
        furnished: mandate.furnished,
        elevator: mandate.elevator,
        parking: mandate.parking,
        pets_allowed: mandate.pets_allowed,
        amenities: mandate.amenities as any,
        inside_city_plan: mandate.inside_city_plan,
        legalization_ok: mandate.legalization_ok,
        status: mandate.status,
        urgency: mandate.urgency,
        timeline: mandate.timeline,
        expires_at: mandate.expires_at,
        createdBy: userId,
        createdAt: mandate.createdAt,
        draft_status: false,
      },
    });

    // Copy agent's own comments
    for (const comment of mandate.comments) {
      await tx.mandateComment.create({
        data: {
          id: crypto.randomUUID(),
          mandate: { connect: { id: newMandateId } },
          user: { connect: { id: userId } },
          content: comment.content,
          createdAt: comment.createdAt,
        },
      });
    }

    // Delete junction tables + comments + original mandate
    // (Mandate has no Deal FK — safe to delete unconditionally)
    await tx.mandate_Properties.deleteMany({ where: { mandateId: mandate.id } });
    await tx.mandate_Clients.deleteMany({ where: { mandateId: mandate.id } });
    await tx.mandateComment.deleteMany({ where: { mandateId: mandate.id } });
    await tx.mandate.delete({ where: { id: mandate.id } });

    migratedMandates.push({ id: newMandateId, title: mandate.title });
  }

  return {
    migratedEntities: {
      properties: migratedProperties,
      clients: migratedClients,
      mandates: migratedMandates,
    },
    cancelledDeals,
    entityCounts: {
      properties: migratedProperties.length,
      clients: migratedClients.length,
      mandates: migratedMandates.length,
      deals: cancelledDeals.length,
    },
  };
}
