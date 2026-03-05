import { getDictionary } from "@/dictionaries";
import { FeedPage } from "./components/FeedPage";
import { getUpcomingItems } from "@/actions/feed/get-upcoming-items";

export default async function Feed({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  const upcomingItems = await getUpcomingItems();

  return <FeedPage upcomingItems={upcomingItems} dict={dict} locale={locale} />;
}
