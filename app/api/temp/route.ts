import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  try {
    await getCurrentUser();
    console.log("Running service route for Updating PRISMADB");
    return NextResponse.json("Running service route for Updating PRISMADB");
  } catch (error) {
    console.log("[TEMP_GET]", error);
    return new NextResponse("Unauthenticated", { status: 401 });
  }
}
