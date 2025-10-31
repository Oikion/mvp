import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const data = body;

  const search = data.data;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  //return new NextResponse("Done", { status: 200 });

  try {
    //Search in modul CRM (Clients)
    const resultsCrmClients = await prismadb.clients.findMany({
      where: {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { client_name: { contains: search, mode: "insensitive" } },
          { primary_email: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
    });

    //Search in modul CRM (Client Contacts)
    const resultsCrmContacts = await prismadb.client_Contacts.findMany({
      where: {
        OR: [
          { contact_last_name: { contains: search, mode: "insensitive" } },
          { contact_first_name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
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
    });

    const resultsTasks = await prismadb.tasks.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
    });

    const reslutsProjects = await prismadb.boards.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          // add more fields as needed
        ],
      },
    });

    const data = {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
      tasks: resultsTasks,
      projects: reslutsProjects,
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.log("[FULLTEXT_SEARCH_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
