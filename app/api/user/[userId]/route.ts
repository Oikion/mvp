import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    
    const user = await prismadb.users.findMany({
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USER_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    
    const user = await prismadb.users.delete({
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USER_DELETE]", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
