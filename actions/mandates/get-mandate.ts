"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  decryptMandateForOrg,
  decryptMandateCommentForOrg,
} from "@/lib/model-encryption";

export const getMandate = async (mandateId: string) => {
  // Check permission to read clients (mandates share CRM permission)
  const guard = await requireAction("client:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();

  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }

  const data = await prismadb.mandate.findFirst({
    where: {
      friendlyId: mandateId,
      organizationId,
    },
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      client: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          primary_phone: true,
          client_status: true,
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!data) {
    return null;
  }

  const decryptedData = await decryptMandateForOrg(data, organizationId);

  // Decrypt comment content for each MandateComment
  const decryptedComments = [];
  for (const comment of decryptedData.comments) {
    try {
      const dec = await decryptMandateCommentForOrg(comment, organizationId);
      decryptedComments.push(dec);
    } catch (err) {
      console.error(
        `[GET_MANDATE] Failed to decrypt comment ${comment.id}:`,
        err
      );
      // Keep comment with encrypted content rather than dropping it
      decryptedComments.push(comment);
    }
  }

  const mappedData = {
    ...decryptedData,
    comments: decryptedComments,
  };

  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};
