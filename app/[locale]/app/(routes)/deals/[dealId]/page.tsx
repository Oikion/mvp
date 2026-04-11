import { notFound } from "next/navigation";
import { getDeal } from "@/actions/deals";
import DealView from "./components/DealView";

export const dynamic = "force-dynamic";

interface DealDetailPageProps {
  params: Promise<{ dealId: string; locale: string }>;
}

export default async function DealDetailPage({ params }: Readonly<DealDetailPageProps>) {
  const { dealId } = await params;

  const result = await getDeal(dealId);

  // getDeal returns ActionResponse<Deal> — must unwrap and check shape.
  // It also returns a permission-denied or not-found error object.
  if (!result || !("success" in result) || !result.success || !result.data) {
    notFound();
  }

  return <DealView deal={result.data} />;
}
