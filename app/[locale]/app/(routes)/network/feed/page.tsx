import { getDictionary } from "@/dictionaries";
import { FeedPage } from "./components/FeedPage";
import { getSocialPosts } from "@/actions/social-feed/get-social-posts";
import { getShareableItems } from "@/actions/social-feed/get-shareable-items";
import { getMyProfileVisibility } from "@/actions/social-feed/create-social-post";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { discoverAgents } from "@/actions/network/discover-agents";
import { discoverAgencies } from "@/actions/network/discover-agencies";

export default async function NetworkFeed({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const [posts, shareableItems, currentUser, agentsResult, agenciesResult, profileVisibility] =
    await Promise.all([
      getSocialPosts(),
      getShareableItems(),
      getCurrentUserSafe(),
      discoverAgents({ limit: 5 }),
      discoverAgencies({ limit: 5 }),
      getMyProfileVisibility(),
    ]);

  return (
    <FeedPage
      posts={posts}
      shareableItems={shareableItems}
      currentUser={currentUser}
      dict={dict}
      locale={locale}
      suggestedAgents={agentsResult.agents}
      suggestedAgencies={agenciesResult.agencies}
      profileVisibility={profileVisibility}
    />
  );
}
