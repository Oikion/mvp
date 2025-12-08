import { getDeal } from "@/actions/deals";
import { notFound } from "next/navigation";
import Container from "../../components/ui/Container";
import { DealDetail } from "./components/DealDetail";

interface DealPageProps {
  params: Promise<{ dealId: string }>;
}

export default async function DealPage({ params }: DealPageProps) {
  const { dealId } = await params;

  try {
    const deal = await getDeal(dealId);

    if (!deal) {
      notFound();
    }

    return (
      <Container
        title={deal.title || "Deal Details"}
        description="Manage this collaborative deal"
      >
        <DealDetail deal={deal} />
      </Container>
    );
  } catch (error) {
    notFound();
  }
}




