import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function DELETE(req: Request, props: { params: Promise<{ contactId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();

    if (!params.contactId) {
      return new NextResponse("contact ID is required", { status: 400 });
    }

    await (prismadb as any).crm_Contacts.delete({
      where: {
        id: params.contactId,
      },
    });

    return NextResponse.json({ message: "Contact deleted" }, { status: 200 });
  } catch (error) {
    console.log("[CONTACT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
