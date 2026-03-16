import { prismadb } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CampaignEditor } from "./components/CampaignEditor"
import { getAudiences } from "@/actions/platform-admin/communication/get-audiences"

export default async function CampaignEditorPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params

  const [campaign, audiences] = await Promise.all([
    prismadb.newsletterCampaign.findUnique({ where: { id } }),
    getAudiences(),
  ])

  if (!campaign) notFound()

  return (
    <CampaignEditor
      campaign={{
        id: campaign.id,
        subject: campaign.subject,
        previewText: campaign.previewText,
        content: campaign.content,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        status: campaign.status,
        audienceId: campaign.audienceId,
        blocks: (campaign.blocks as any) ?? [],
      }}
      audiences={audiences}
    />
  )
}
