import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { publicSource } from "@/lib/docs-source";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ComponentType } from "react";
import { DocFeedback } from "@/components/docs/DocFeedback";

/**
 * Extended page data type — fumadocs-mdx adds body/toc/description to the
 * base PageData but the generic chain through loader() doesn't expose them.
 * This interface matches the actual runtime shape of page.data for MDX pages.
 */
interface DocsPageData {
  title: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: ComponentType<{ components?: any }>;
  toc: { title: string; url: string; depth: number }[];
  full?: boolean;
}

interface PageProps {
  params: Promise<{ slug?: string[]; locale: string }>;
}

export async function generateStaticParams() {
  return publicSource.getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const page = publicSource.getPage(slug, locale);

  if (!page) return {};

  const t = await getTranslations("docs");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
  const data = page.data as unknown as DocsPageData;

  return {
    title: `${data.title} | ${t("metaSuffix")}`,
    description: data.description,
    alternates: {
      canonical: `${baseUrl}/${locale}/docs/${(slug ?? []).join("/")}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;
  const page = publicSource.getPage(slug, locale);

  if (!page) notFound();

  const data = page.data as unknown as DocsPageData;
  const MDXContent = data.body;

  return (
    <DocsPage toc={data.toc} full={data.full}>
      <DocsBody>
        <h1>{data.title}</h1>
        <MDXContent components={{ ...defaultMdxComponents }} />
        <DocFeedback
          pageSlug={(slug ?? []).join("/")}
          docScope="public"
          locale={locale}
        />
      </DocsBody>
    </DocsPage>
  );
}
