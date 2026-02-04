import { getPostById, getPostMetadata } from "@/actions/social-feed/get-post-by-id";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Script from "next/script";
import { PostPageView } from "./components/PostPageView";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

// Force dynamic rendering to check auth status
export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ postId: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { postId, locale } = await params;
  const metadata = await getPostMetadata(postId);

  if (!metadata) {
    return {
      title: "Post Not Found",
      robots: { index: false, follow: false },
    };
  }

  if (metadata.isPrivate) {
    return {
      title: `Post by ${metadata.authorName || "Agent"} | Oikion`,
      description: "This post is from a private profile. Sign in to view.",
      robots: { index: false, follow: false },
    };
  }

  const description =
    metadata.content ||
    (metadata.linkedEntityTitle
      ? `${metadata.authorName} shared: ${metadata.linkedEntityTitle}`
      : `Post by ${metadata.authorName}`);

  const canonicalUrl = `${baseUrl}/${locale}/post/${postId}`;

  return {
    title: `${metadata.authorName || "Agent"} on Oikion`,
    description: description.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/en/post/${postId}`,
        el: `${baseUrl}/el/post/${postId}`,
      },
    },
    openGraph: {
      type: "article",
      title: `${metadata.authorName || "Agent"} on Oikion`,
      description: description.slice(0, 160),
      url: canonicalUrl,
      siteName: "Oikion",
      images: metadata.authorAvatar
        ? [
            {
              url: metadata.authorAvatar,
              width: 400,
              height: 400,
              alt: `${metadata.authorName}'s profile`,
            },
          ]
        : [],
      locale: locale === "el" ? "el_GR" : "en_US",
    },
    twitter: {
      card: "summary",
      title: `${metadata.authorName || "Agent"} on Oikion`,
      description: description.slice(0, 160),
      images: metadata.authorAvatar ? [metadata.authorAvatar] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Generate JSON-LD structured data for the post
function generateJsonLd(post: any, locale: string) {
  if (!post.isAccessible) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: post.linkedEntity?.title || `Post by ${post.author.name}`,
    articleBody: post.content || "",
    author: {
      "@type": "Person",
      name: post.author.name,
      url: post.author.username
        ? `${baseUrl}/${locale}/agent/${post.author.username}`
        : undefined,
      image: post.author.avatar || undefined,
    },
    datePublished: post.timestamp,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comments,
      },
    ],
  };

  return JSON.stringify(jsonLd);
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId, locale } = await params;
  const result = await getPostById(postId);

  if (!result.success || !result.post) {
    notFound();
  }

  const jsonLd = generateJsonLd(result.post, locale);

  return (
    <>
      {jsonLd && (
        <Script
          id="json-ld-post"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <PostPageView post={result.post} locale={locale} />
    </>
  );
}
