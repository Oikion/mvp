import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sendEmail from "@/lib/sendmail";

// Create client contact
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      assigned_to,
      assigned_client,
      birthday_day,
      birthday_month,
      birthday_year,
      description,
      email,
      personal_email,
      contact_first_name,
      contact_last_name,
      office_phone,
      mobile_phone,
      website,
      status,
      contact_type,
      relationship_to_client,
      type,
    } = body;

    const newContact = await prismadb.client_Contacts.create({
      data: {
        v: 0,
        createdBy: userId,
        updatedBy: userId,
        ...(assigned_client !== null && assigned_client !== undefined
          ? {
              assigned_client: {
                connect: {
                  id: assigned_client,
                },
              },
            }
          : {}),
        assigned_to_user: {
          connect: {
            id: assigned_to,
          },
        },
        birthday: birthday_day + "/" + birthday_month + "/" + birthday_year,
        description,
        email,
        personal_email,
        contact_first_name,
        contact_last_name,
        office_phone,
        mobile_phone,
        website,
        status,
        contact_type,
        relationship_to_client,
        type,
      },
    });

    if (assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: { id: assigned_to },
      });
      if (!notifyRecipient) {
        return new NextResponse("No user found", { status: 400 });
      }

      await sendEmail({
        from: process.env.EMAIL_FROM as string,
        to: notifyRecipient.email || "info@softbase.cz",
        subject:
          notifyRecipient.userLanguage === "en"
            ? `New contact ${contact_first_name} ${contact_last_name} has been added to the system and assigned to you.`
            : `Nový kontakt ${contact_first_name} ${contact_last_name} byla přidána do systému a přidělena vám.`,
        text:
          notifyRecipient.userLanguage === "en"
            ? `New contact ${contact_first_name} ${contact_last_name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/client-contacts/${newContact.id}`
            : `Nový kontakt ${contact_first_name} ${contact_last_name} byla přidán do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/client-contacts/${newContact.id}`,
      });
    }

    return NextResponse.json({ newContact }, { status: 200 });
  } catch (error) {
    console.log("[NEW_CLIENT_CONTACT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Update client contact
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;
    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      id,
      assigned_client,
      assigned_to,
      birthday_day,
      birthday_month,
      birthday_year,
      description,
      email,
      personal_email,
      contact_first_name,
      contact_last_name,
      office_phone,
      mobile_phone,
      website,
      status,
      contact_type,
      relationship_to_client,
      type,
    } = body;

    const newContact = await prismadb.client_Contacts.update({
      where: { id },
      data: {
        v: 0,
        updatedBy: userId,
        ...(assigned_client !== null && assigned_client !== undefined
          ? {
              assigned_client: {
                connect: {
                  id: assigned_client,
                },
              },
            }
          : {}),
        assigned_to_user: {
          connect: { id: assigned_to },
        },
        birthday: birthday_day + "/" + birthday_month + "/" + birthday_year,
        description,
        email,
        personal_email,
        contact_first_name,
        contact_last_name,
        office_phone,
        mobile_phone,
        website,
        status,
        contact_type,
        relationship_to_client,
        type,
      },
    });

    return NextResponse.json({ newContact }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_CLIENT_CONTACT_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}


