import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const search = body.data || body.query;

    if (!search || search.length < 2) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    const db = prismaForOrg(organizationId);

    //Search in modul CRM (Clients)
    const resultsCrmClients = await db.clients.findMany({
      where: {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { client_name: { contains: search, mode: "insensitive" } },
          { primary_email: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
      take: 5,
    });

    //Search in modul CRM (Client Contacts)
    const resultsCrmContacts = await db.client_Contacts.findMany({
      where: {
        OR: [
          { contact_last_name: { contains: search, mode: "insensitive" } },
          { contact_first_name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
      take: 5,
    });

    //Search in local user database
    const resultsUser = await prismadb.users.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { account_name: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
      take: 5,
    });

    const data = {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}
