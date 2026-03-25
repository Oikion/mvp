import { getSentCampaigns } from "@/actions/platform-admin/communication/get-sent-campaigns"
import { SentClient } from "./components/SentClient"

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = parseInt(page ?? "1")

  const { campaigns, total, pages } = await getSentCampaigns(currentPage)

  return (
    <div className="container mx-auto px-4 py-8">
      <SentClient
        campaigns={campaigns}
        total={total}
        currentPage={currentPage}
        totalPages={pages}
      />
    </div>
  )
}
