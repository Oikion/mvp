import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { TemplateType } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getTemplateDefinition, autoFillPlaceholders } from "@/lib/templates";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { templateType, propertyId, clientId } = body as {
      templateType: TemplateType;
      propertyId?: string;
      clientId?: string;
    };

    if (!templateType) {
      return NextResponse.json(
        { error: "Template type is required" },
        { status: 400 }
      );
    }

    const definition = getTemplateDefinition(templateType);
    if (!definition) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Fetch property if provided
    let property = null;
    if (propertyId) {
      property = await prismadb.properties.findFirst({
        where: {
          id: propertyId,
          organizationId,
        },
      });
    }

    // Fetch client if provided
    let client = null;
    if (clientId) {
      client = await prismadb.clients.findFirst({
        where: {
          id: clientId,
          organizationId,
        },
      });
    }

    // Fetch organization data for agency fields
    const organization = await prismadb.myAccount.findFirst({
      where: {
        organizationId,
      },
    });

    // Auto-fill placeholders
    const values = autoFillPlaceholders(definition.placeholders, {
      property,
      client,
      agent: user,
      organization,
    });

    return NextResponse.json({
      values,
      propertyName: property?.property_name,
      clientName: client?.client_name,
    });
  } catch (error: unknown) {
    console.error("[TEMPLATE_AUTOFILL]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

