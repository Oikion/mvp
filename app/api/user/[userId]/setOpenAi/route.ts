import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    const currentUser = await getCurrentUser();
    
    const userId = params.userId;

    if (!userId) {
      return new NextResponse("No userID, userId is required", { status: 401 });
    }

    if (currentUser.id !== userId && !currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { organizationId, secretKey } = await req.json();

    if (!organizationId || !secretKey) {
      return new NextResponse("No data from form (organizationId, secretKey)", {
        status: 401,
      });
    }
    
    const checkIfExist = await prismadb.openAi_keys.findFirst({
      where: {
        user: userId,
      },
    });
    
    if (checkIfExist !== null) {
      const updateNotion = await prismadb.openAi_keys.update({
        where: {
          id: checkIfExist.id,
        },
        data: {
          api_key: secretKey,
          organization_id: organizationId,
        },
      });
      return NextResponse.json(updateNotion, {
        status: 200,
      });
    } else {
      const setOpenAiKey = await prismadb.openAi_keys.create({
        data: {
          api_key: secretKey,
          organization_id: organizationId,
          user: userId,
        },
      });

      return NextResponse.json(setOpenAiKey, {
        status: 200,
      });
    }
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}
