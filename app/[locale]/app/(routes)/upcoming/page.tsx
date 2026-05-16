import { FeedPage } from "./components/FeedPage";
import { getUpcomingItems } from "@/actions/feed/get-upcoming-items";

export default async function Feed({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const upcomingItems = await getUpcomingItems();

  return <FeedPage upcomingItems={upcomingItems} locale={locale} />;
}
