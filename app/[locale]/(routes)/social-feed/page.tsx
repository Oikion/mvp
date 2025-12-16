import { getDictionary } from "@/dictionaries";
import { SocialFeedPage } from "./components/SocialFeedPage";
import { getSocialPosts } from "@/actions/social-feed/get-social-posts";
import { getShareableItems } from "@/actions/social-feed/get-shareable-items";
import { getCurrentUserSafe } from "@/lib/get-current-user";

export default async function SocialFeed({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  const [posts, shareableItems, currentUser] = await Promise.all([
    getSocialPosts(),
    getShareableItems(),
    getCurrentUserSafe(),
  ]);

  return (
    <SocialFeedPage 
      posts={posts} 
      shareableItems={shareableItems}
      currentUser={currentUser}
      dict={dict} 
      locale={locale} 
    />
  );
}









