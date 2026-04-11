import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { z } from "zod";

const linkSchema = z.object({
  propertyIds: z.array(z.string()).min(1),
});

const unlinkSchema = z.object({
  propertyId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const writeCheck = await canPerformAction("contact:update");
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;
    const body = await req.json();
    const validation = linkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.flatten() }, { status: 400 });
    }

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await Promise.all(
      validation.data.propertyIds.map((propertyId) =>
        prismadb.contactProperty.upsert({
          where: { contactId_propertyId: { contactId, propertyId } },
          create: { contactId, propertyId, organizationId },
          update: {},
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_PROPERTIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const writeCheck = await canPerformAction("contact:update");
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;
    const body = await req.json();
    const validation = unlinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prismadb.contactProperty.deleteMany({
      where: { contactId, propertyId: validation.data.propertyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_PROPERTIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
