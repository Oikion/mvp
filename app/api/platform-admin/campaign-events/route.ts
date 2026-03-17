import { NextRequest, NextResponse } from "next/server"
import { isPlatformAdmin } from "@/lib/platform-admin"
import { auth } from "@clerk/nextjs/server"
import { getCampaignEvents } from "@/actions/platform-admin/communication/get-campaign-events"
import { CommunicationEventType } from "@prisma/client"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = await isPlatformAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get("campaignId")
  const eventType = searchParams.get("eventType") ?? "ALL"
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50")

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 })
  }

  const validEventTypes = [
    "ALL",
    ...Object.values(CommunicationEventType),
  ]
  if (!validEventTypes.includes(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 })
  }

  const result = await getCampaignEvents(
    campaignId,
    eventType as CommunicationEventType | "ALL",
    page,
    pageSize
  )

  return NextResponse.json(result)
}
