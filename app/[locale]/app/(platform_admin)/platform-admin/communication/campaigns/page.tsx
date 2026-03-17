import { getCampaigns } from "@/actions/platform-admin/communication/get-campaigns"
import { CampaignsClient } from "./components/CampaignsClient"
import { CampaignStatus } from "@prisma/client"

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page } = await searchParams
  const currentPage = parseInt(page || "1")
  const statusFilter = (status as CampaignStatus | "ALL") || "ALL"

  const { campaigns, total, pages } = await getCampaigns(
    statusFilter,
    currentPage,
    20
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <CampaignsClient
          campaigns={campaigns}
          total={total}
          currentPage={currentPage}
          totalPages={pages}
          currentStatus={statusFilter}
        />
      </div>
    </div>
  )
}
