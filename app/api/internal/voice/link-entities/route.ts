import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/internal/voice/link-entities
 * Internal API for voice assistant to link entities together
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, isAdminTest } = context;

    // Return mock response for admin testing (don't actually link)
    if (isAdminTest) {
      const body = await request.json();
      const { entityType, targetType, entityName, targetName, entityId, targetId } = body;

      return NextResponse.json({
        success: true,
        link: {
          entityType: entityType || "client",
          entityId: entityId || `test-${entityType}-1`,
          entityName: entityName || "Test Entity",
          targetType: targetType || "property",
          targetId: targetId || `test-${targetType}-1`,
          targetName: targetName || "Test Target",
        },
        message: `Would link ${entityType || "entity"} "${entityName || entityId || "Test"}" to ${targetType || "target"} "${targetName || targetId || "Test"}" (test mode)`,
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      entityType,
      entityId,
      targetType,
      targetId,
      // Alternative: search by name
      entityName,
      targetName,
    } = body;

    if (!entityType || !targetType) {
      return NextResponse.json(
        { error: "Entity type and target type are required" },
        { status: 400 }
      );
    }

    // Resolve entity IDs by name if not provided directly
    let resolvedEntityId = entityId;
    let resolvedTargetId = targetId;
    let entityDisplayName = "";
    let targetDisplayName = "";

    // Resolve entity by name
    if (!resolvedEntityId && entityName) {
      const resolved = await resolveEntityByName(
        entityType,
        entityName,
        organizationId
      );
      if (!resolved) {
        return NextResponse.json(
          { error: `Could not find ${entityType} named "${entityName}"` },
          { status: 404 }
        );
      }
      resolvedEntityId = resolved.id;
      entityDisplayName = resolved.name;
    }

    // Resolve target by name
    if (!resolvedTargetId && targetName) {
      const resolved = await resolveEntityByName(
        targetType,
        targetName,
        organizationId
      );
      if (!resolved) {
        return NextResponse.json(
          { error: `Could not find ${targetType} named "${targetName}"` },
          { status: 404 }
        );
      }
      resolvedTargetId = resolved.id;
      targetDisplayName = resolved.name;
    }

    if (!resolvedEntityId || !resolvedTargetId) {
      return NextResponse.json(
        { error: "Entity ID and target ID are required (provide IDs or names)" },
        { status: 400 }
      );
    }

    // Perform the linking based on entity types
    const linkResult = await performLinking(
      entityType,
      resolvedEntityId,
      targetType,
      resolvedTargetId,
      organizationId
    );

    if (!linkResult.success) {
      return NextResponse.json(
        { error: linkResult.error },
        { status: 400 }
      );
    }

    // Get display names if not already set
    if (!entityDisplayName) {
      const entity = await getEntityDisplayName(entityType, resolvedEntityId);
      entityDisplayName = entity || resolvedEntityId;
    }
    if (!targetDisplayName) {
      const target = await getEntityDisplayName(targetType, resolvedTargetId);
      targetDisplayName = target || resolvedTargetId;
    }

    return NextResponse.json({
      success: true,
      link: {
        entityType,
        entityId: resolvedEntityId,
        entityName: entityDisplayName,
        targetType,
        targetId: resolvedTargetId,
        targetName: targetDisplayName,
      },
      message: `Successfully linked ${entityType} "${entityDisplayName}" to ${targetType} "${targetDisplayName}"`,
    });
  } catch (error) {
    console.error("[VOICE_LINK_ENTITIES]", error);
    return NextResponse.json(
      { error: "Failed to link entities" },
      { status: 500 }
    );
  }
}

async function resolveEntityByName(
  entityType: string,
  name: string,
  organizationId: string
): Promise<{ id: string; name: string } | null> {
  const type = entityType.toLowerCase();

  switch (type) {
    case "client": {
      const client = await prismadb.clients.findFirst({
        where: {
          organizationId,
          OR: [
            { client_name: { contains: name, mode: "insensitive" } },
            { full_name: { contains: name, mode: "insensitive" } },
          ],
        },
        select: { id: true, client_name: true },
      });
      return client ? { id: client.id, name: client.client_name } : null;
    }

    case "property": {
      const property = await prismadb.properties.findFirst({
        where: {
          organizationId,
          OR: [
            { property_name: { contains: name, mode: "insensitive" } },
            { address_city: { contains: name, mode: "insensitive" } },
          ],
        },
        select: { id: true, property_name: true },
      });
      return property ? { id: property.id, name: property.property_name } : null;
    }

    case "event":
    case "calendar": {
      const event = await prismadb.calendarEvent.findFirst({
        where: {
          organizationId,
          title: { contains: name, mode: "insensitive" },
        },
        select: { id: true, title: true },
      });
      return event ? { id: event.id, name: event.title } : null;
    }

    case "document": {
      const document = await prismadb.document.findFirst({
        where: {
          organizationId,
          OR: [
            { name: { contains: name, mode: "insensitive" } },
            { title: { contains: name, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, title: true },
      });
      return document ? { id: document.id, name: document.title || document.name } : null;
    }

    default:
      return null;
  }
}

async function getEntityDisplayName(
  entityType: string,
  entityId: string
): Promise<string | null> {
  const type = entityType.toLowerCase();

  switch (type) {
    case "client": {
      const client = await prismadb.clients.findUnique({
        where: { id: entityId },
        select: { client_name: true },
      });
      return client?.client_name || null;
    }

    case "property": {
      const property = await prismadb.properties.findUnique({
        where: { id: entityId },
        select: { property_name: true },
      });
      return property?.property_name || null;
    }

    case "event":
    case "calendar": {
      const event = await prismadb.calendarEvent.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return event?.title || null;
    }

    case "document": {
      const document = await prismadb.document.findUnique({
        where: { id: entityId },
        select: { title: true, name: true },
      });
      return document?.title || document?.name || null;
    }

    default:
      return null;
  }
}

async function performLinking(
  entityType: string,
  entityId: string,
  targetType: string,
  targetId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const entity = entityType.toLowerCase();
  const target = targetType.toLowerCase();

  try {
    // Client <-> Property linking
    if (
      (entity === "client" && target === "property") ||
      (entity === "property" && target === "client")
    ) {
      const clientId = entity === "client" ? entityId : targetId;
      const propertyId = entity === "property" ? entityId : targetId;

      // Check if already linked via interest or other relation
      // For now, we'll link through comments or create an interest record
      await prismadb.clients.update({
        where: { id: clientId, organizationId },
        data: {
          Properties_ClientsToProperties: {
            connect: { id: propertyId },
          },
        },
      });

      return { success: true };
    }

    // Client <-> Event linking
    if (
      (entity === "client" && (target === "event" || target === "calendar")) ||
      ((entity === "event" || entity === "calendar") && target === "client")
    ) {
      const clientId = entity === "client" ? entityId : targetId;
      const eventId =
        entity === "event" || entity === "calendar" ? entityId : targetId;

      await prismadb.calendarEvent.update({
        where: { id: eventId, organizationId },
        data: {
          Clients: {
            connect: { id: clientId },
          },
        },
      });

      return { success: true };
    }

    // Property <-> Event linking
    if (
      (entity === "property" && (target === "event" || target === "calendar")) ||
      ((entity === "event" || entity === "calendar") && target === "property")
    ) {
      const propertyId = entity === "property" ? entityId : targetId;
      const eventId =
        entity === "event" || entity === "calendar" ? entityId : targetId;

      await prismadb.calendarEvent.update({
        where: { id: eventId, organizationId },
        data: {
          Properties: {
            connect: { id: propertyId },
          },
        },
      });

      return { success: true };
    }

    // Document linking - handled differently through document shares
    if (entity === "document" || target === "document") {
      // Documents are typically linked via the entity_links relation
      // This would need custom implementation based on your document model
      return {
        success: false,
        error: "Document linking requires additional setup",
      };
    }

    return {
      success: false,
      error: `Linking ${entityType} to ${targetType} is not supported`,
    };
  } catch (error) {
    console.error("Linking error:", error);
    return {
      success: false,
      error: `Failed to link entities: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
