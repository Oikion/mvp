import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";
import { notifyDealStatusChanged } from "@/lib/notifications";

export async function GET(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await props.params;
    const { dealId } = params;

    const dealRaw = await prismadb.deal.findUnique({
      where: { id: dealId },
      include: {
        Properties: {
          select: {
            id: true,
            property_name: true,
            property_type: true,
            price: true,
            address_city: true,
            address_state: true,
            bedrooms: true,
            bathrooms: true,
            size_net_sqm: true,
            square_feet: true,
            description: true,
            Documents: {
              where: {
                document_file_mimeType: { startsWith: "image/" },
              },
              select: { document_file_url: true },
              take: 5,
            },
          },
        },
        Clients: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
            primary_phone: true,
            intent: true,
            client_status: true,
          },
        },
        Users_Deal_propertyAgentIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        Users_Deal_clientAgentIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!dealRaw) {
      return new NextResponse("Deal not found", { status: 404 });
    }

    // Map to expected field names
    const deal = {
      ...dealRaw,
      property: dealRaw.Properties ? {
        ...dealRaw.Properties,
        linkedDocuments: dealRaw.Properties.Documents,
      } : null,
      client: dealRaw.Clients,
      propertyAgent: dealRaw.Users_Deal_propertyAgentIdToUsers,
      clientAgent: dealRaw.Users_Deal_clientAgentIdToUsers,
    };

    if (
      deal.propertyAgentId !== currentUser.id &&
      deal.clientAgentId !== currentUser.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json({
      ...deal,
      isPropertyAgent: deal.propertyAgentId === currentUser.id,
      isProposer: deal.proposedById === currentUser.id,
    });
  } catch (error) {
    console.error("[DEAL_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;
    const { dealId } = params;
    const body = await req.json();

    const deal = await prismadb.deal.findUnique({
      where: { id: dealId },
      include: {
        Properties: { select: { property_name: true } },
        Clients: { select: { client_name: true } },
      },
    });

    if (!deal) {
      return new NextResponse("Deal not found", { status: 404 });
    }

    if (
      deal.propertyAgentId !== currentUser.id &&
      deal.clientAgentId !== currentUser.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const {
      propertyAgentSplit,
      clientAgentSplit,
      totalCommission,
      title,
      notes,
      status,
    } = body;

    // Validate splits if provided
    if (propertyAgentSplit !== undefined || clientAgentSplit !== undefined) {
      const newPropertySplit = propertyAgentSplit ?? Number(deal.propertyAgentSplit);
      const newClientSplit = clientAgentSplit ?? Number(deal.clientAgentSplit);

      if (newPropertySplit + newClientSplit !== 100) {
        return new NextResponse("Commission split must sum to 100%", {
          status: 400,
        });
      }
    }

    // Validate status transition
    if (status) {
      const validTransitions: Record<DealStatus, DealStatus[]> = {
        PROPOSED: ["NEGOTIATING", "ACCEPTED", "CANCELLED"],
        NEGOTIATING: ["ACCEPTED", "CANCELLED"],
        ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!validTransitions[deal.status].includes(status)) {
        return new NextResponse(
          `Cannot transition from ${deal.status} to ${status}`,
          { status: 400 }
        );
      }

      // Only non-proposer can accept
      if (status === "ACCEPTED" && deal.proposedById === currentUser.id) {
        return new NextResponse("Cannot accept your own proposal", {
          status: 400,
        });
      }
    }

    const updated = await prismadb.deal.update({
      where: { id: dealId },
      data: {
        ...(propertyAgentSplit !== undefined && { propertyAgentSplit }),
        ...(clientAgentSplit !== undefined && { clientAgentSplit }),
        ...(totalCommission !== undefined && { totalCommission }),
        ...(title && { title }),
        ...(notes !== undefined && { notes }),
        ...(status && {
          status,
          ...(status === "COMPLETED" && { closedAt: new Date() }),
        }),
      },
    });

    // Notify the other agent about the status change
    if (status && status !== deal.status) {
      const otherAgentId = currentUser.id === deal.propertyAgentId 
        ? deal.clientAgentId 
        : deal.propertyAgentId;

      await notifyDealStatusChanged({
        dealId: deal.id,
        dealTitle: deal.title || undefined,
        propertyName: deal.Properties?.property_name || "Property",
        clientName: deal.Clients?.client_name || "Client",
        actorId: currentUser.id,
        actorName: currentUser.name || currentUser.email || "Someone",
        targetUserId: otherAgentId,
        organizationId,
        status,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DEAL_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await props.params;
    const { dealId } = params;

    const deal = await prismadb.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return new NextResponse("Deal not found", { status: 404 });
    }

    if (
      deal.propertyAgentId !== currentUser.id &&
      deal.clientAgentId !== currentUser.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Only allow deletion of proposed/cancelled deals
    if (!["PROPOSED", "CANCELLED"].includes(deal.status)) {
      return new NextResponse("Cannot delete deal in current state", {
        status: 400,
      });
    }

    await prismadb.deal.delete({
      where: { id: dealId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DEAL_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

