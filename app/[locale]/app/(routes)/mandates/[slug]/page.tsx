import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface MandateDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function MandateDetailPage({ params }: MandateDetailPageProps) {
  const { slug } = await params;
  redirect(`/app/requests/${slug}`);
}
