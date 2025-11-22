import { prismadb } from "@/lib/prisma";

export async function getDocument(documentId: string, organizationId: string) {
  const document = await prismadb.documents.findFirst({
    where: {
      id: documentId,
      organizationId,
    },
    include: {
      accounts: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
        },
      },
      linkedProperties: {
        select: {
          id: true,
          property_name: true,
          address_street: true,
          address_city: true,
        },
      },
      linkedCalComEvents: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      linkedTasks: {
        select: {
          id: true,
          title: true,
          priority: true,
          dueDateAt: true,
        },
      },
      created_by: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      views: {
        orderBy: {
          viewedAt: "desc",
        },
        take: 10,
        include: {
          viewerUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return document;
}

export async function getDocumentByShareLink(shareableLink: string) {
  const document = await prismadb.documents.findFirst({
    where: {
      shareableLink,
    },
    include: {
      accounts: {
        select: {
          id: true,
          client_name: true,
        },
      },
      linkedProperties: {
        select: {
          id: true,
          property_name: true,
        },
      },
      linkedCalComEvents: {
        select: {
          id: true,
          title: true,
          startTime: true,
        },
      },
      linkedTasks: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return document;
}

