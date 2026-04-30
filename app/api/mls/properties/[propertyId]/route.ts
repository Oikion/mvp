import { NextResponse } from "next/server";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { invalidateCache } from "@/lib/cache-invalidate";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { deleteEntitySessionsForEntity } from "@/lib/entity-session/entity-session-service";

export async function GET(
  _req: Request,
  props: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await props.params;

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  try {
    // Permission check: Users need property:read permission
    const readCheck = await canPerformAction("property:read");
    if (!readCheck.allowed) {
      return NextResponse.json(
        { error: readCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const property = await prismaTenant.properties.findFirst({
      where: {
        organizationId,
        friendlyId: propertyId,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Serialize to plain object (convert Decimal to number, Date to string)
    const serialized = JSON.parse(JSON.stringify(property));

    return NextResponse.json({ property: serialized }, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await props.params;

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const property = await prismaTenant.properties.findFirst({
      where: { organizationId, friendlyId: propertyId },
      select: { id: true, assigned_to: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const deleteCheck = await canPerformActionOnEntity(
      "property:delete",
      "property",
      property.id,
      property.assigned_to
    );
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    await deleteEntitySessionsForEntity("PROPERTY", property.id);

    await prismaTenant.properties.update({
      where: { id: property.id, organizationId },
      data: { archivedAt: new Date(), archivedBy: currentUser.id },
    });

    await invalidateCache([
      "properties:list",
      `property:${propertyId}`,
    ]);

    return NextResponse.json({ message: "Property archived" }, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_ARCHIVE]", error);
    return NextResponse.json(
      { error: "Failed to archive property" },
      { status: 500 }
    );
  }
}

