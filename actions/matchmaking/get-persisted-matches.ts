"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";

export interface PersistedMatchItem {
  id: string;
  propertyId: string;
  requestId: string;
  matchScore: number;
  scoreBreakdown: Record<string, unknown> | null;
  status: string;
  property: {
    id: string;
    friendlyId: string | null;
    property_name: string | null;
    price: number | null;
    bedrooms: number | null;
    area: string | null;
    address_city: string | null;
    owner: {
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  request: {
    id: string;
    friendlyId: string | null;
    name: string | null;
    requestContacts: {
      contact: {
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      };
    }[];
  };
}

/**
 * Fetch persisted top property-request matches from the last "Run Now" execution.
 * Returns the top 20 by match score, ordered descending.
 */
export async function getPersistedMatches(): Promise<PersistedMatchItem[]> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const rows = await prismadb.propertyRequestMatch.findMany({
    where: {
      organizationId,
      status: { not: "DISMISSED" },
      matchScore: { gte: 0.5 },
    },
    orderBy: { matchScore: "desc" },
    take: 20,
    select: {
      id: true,
      propertyId: true,
      requestId: true,
      matchScore: true,
      scoreBreakdown: true,
      status: true,
      property: {
        select: {
          id: true,
          friendlyId: true,
          property_name: true,
          price: true,
          bedrooms: true,
          area: true,
          address_city: true,
          owner: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      request: {
        select: {
          id: true,
          friendlyId: true,
          name: true,
          requestContacts: {
            select: {
              contact: {
                select: {
                  id: true,
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const decrypted = await Promise.all(
    rows.map(async (row) => {
      const decryptedRequest = await decryptRequestForOrg(
        { name: row.request.name },
        organizationId
      );

      const decryptedContacts = await Promise.all(
        row.request.requestContacts.map(async (rc) => {
          const decryptedContact = await decryptContactForOrg(
            {
              displayName: rc.contact.displayName,
              firstName: rc.contact.firstName,
              lastName: rc.contact.lastName,
            },
            organizationId
          );
          return {
            contact: {
              id: rc.contact.id,
              displayName: decryptedContact.displayName ?? null,
              firstName: decryptedContact.firstName ?? null,
              lastName: decryptedContact.lastName ?? null,
            },
          };
        })
      );

      return {
        id: row.id,
        propertyId: row.propertyId,
        requestId: row.requestId,
        matchScore: row.matchScore == null ? 0 : Number(row.matchScore) * 100,
        scoreBreakdown: row.scoreBreakdown as Record<string, unknown> | null,
        status: row.status,
        property: {
          id: row.property.id,
          friendlyId: row.property.friendlyId,
          property_name: row.property.property_name,
          price: row.property.price == null ? null : Number(row.property.price),
          bedrooms: row.property.bedrooms,
          area: row.property.area,
          address_city: row.property.address_city,
          owner: row.property.owner
            ? {
                id: row.property.owner.id,
                displayName: row.property.owner.displayName,
                firstName: row.property.owner.firstName,
                lastName: row.property.owner.lastName,
              }
            : null,
        },
        request: {
          id: row.request.id,
          friendlyId: row.request.friendlyId,
          name: decryptedRequest.name ?? null,
          requestContacts: decryptedContacts,
        },
      };
    })
  );

  return decrypted;
}
