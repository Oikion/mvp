import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptClientForOrg } from "@/lib/model-encryption";

export const getClients = async () => {
  // Check permission to read clients
  const guard = await requireAction("client:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      id: true,
      friendlyId: true,
      client_name: true,
      primary_email: true,
      primary_phone: true,
      client_status: true,
      createdAt: true,
      assigned_to: true,
      Users_Clients_assigned_toToUsers: {
        select: {
          name: true,
        },
      },
      Client_Contacts: {
        select: {
          contact_first_name: true,
          contact_last_name: true,
        },
        take: 10, // Limit contacts per client to reduce data transfer
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500, // Add reasonable limit to prevent over-fetching
  });
  // Map to legacy fields expected by existing UI until refactor completes
  const results = [];
  for (const c of data) {
    try {
      const dec = await decryptClientForOrg(c, organizationId);
      results.push({
        ...dec,
        name: dec.client_name,
        email: dec.primary_email,
        phone: dec.primary_phone,
        status: dec.client_status === "ACTIVE" ? "Active" : "IN_PROGRESS",
        assigned_to_user: dec.Users_Clients_assigned_toToUsers,
        contacts: (dec.Client_Contacts || []).map((p) => ({
          ...p,
          first_name: p.contact_first_name,
          last_name: p.contact_last_name,
        })),
      });
    } catch (err) {
      console.error(`[GET_CLIENTS] Failed to decrypt client ${c.id}:`, err);
      // Skip corrupted record rather than crashing the list
    }
  }
  return results;
};


