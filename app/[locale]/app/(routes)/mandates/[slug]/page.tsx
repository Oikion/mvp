import { getMandate } from "@/actions/mandates/get-mandate"
import MandateView from "./components/MandateView"

export const dynamic = "force-dynamic"

interface MandateDetailPageProps {
  params: Promise<{ slug: string; locale: string }>
  searchParams: Promise<{ action?: string }>
}

export default async function MandateDetailPage({
  params,
  searchParams,
}: MandateDetailPageProps) {
  const { slug } = await params
  const { action } = await searchParams
  const mandate = await getMandate(slug)

  if (!mandate) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Mandate not found</p>
      </div>
    )
  }

  return <MandateView mandate={mandate} initialAction={action} />
}
