"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe, getCurrentUser } from "@/lib/get-current-user";
import { TemplateType } from "@prisma/client";
import {
  getTemplateDefinition,
  autoFillPlaceholders,
} from "@/lib/templates";

export interface AutoFillInput {
  templateType: TemplateType;
  propertyId?: string;
  clientId?: string;
}

export interface AutoFillResult {
  values: Record<string, string>;
  propertyName?: string;
  clientName?: string;
}

/**
 * Get auto-filled values for a template based on selected property and client
 */
export async function getAutoFillData(input: AutoFillInput): Promise<AutoFillResult> {
  const organizationId = await getCurrentOrgIdSafe();
  const user = await getCurrentUser();

  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  const definition = getTemplateDefinition(input.templateType);
  if (!definition) {
    throw new Error("Template not found");
  }

  // Fetch property if provided
  let property = null;
  if (input.propertyId) {
    property = await prismadb.properties.findFirst({
      where: {
        id: input.propertyId,
        organizationId,
      },
    });
  }

  // Fetch client if provided
  let client = null;
  if (input.clientId) {
    client = await prismadb.clients.findFirst({
      where: {
        id: input.clientId,
        organizationId,
      },
    });
  }

  // Fetch organization data for agency fields
  let organization = null;
  organization = await prismadb.myAccount.findFirst({
    where: {
      organizationId,
    },
  });

  // Auto-fill placeholders from entities
  const values = autoFillPlaceholders(definition.placeholders, {
    property,
    client,
    agent: user,
    organization,
  });

  return {
    values,
    propertyName: property?.property_name,
    clientName: client?.client_name,
  };
}

/**
 * Get available properties for template auto-fill
 */
export async function getPropertiesForTemplate() {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return [];
  }

  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      property_name: true,
      address_street: true,
      municipality: true,
      property_type: true,
      transaction_type: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return properties;
}

/**
 * Get available clients for template auto-fill
 */
export async function getClientsForTemplate() {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return [];
  }

  const clients = await prismadb.clients.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      primary_phone: true,
      client_type: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return clients;
}












