import { NextResponse } from "next/server";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

export async function DELETE(_req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  
  if (!params.accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  }

  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    await prismaTenant.clients.delete({
      where: {
        id: params.accountId,
      },
    });

    return NextResponse.json({ message: "Client deleted" }, { status: 200 });
  } catch (error) {
    console.log("[ACCOUNT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
