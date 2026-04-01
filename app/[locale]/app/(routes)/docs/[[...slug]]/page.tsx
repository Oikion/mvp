import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { privateSource } from "@/lib/docs-source";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ComponentType } from "react";
import { DocFeedback } from "@/components/docs/DocFeedback";

/** Runtime shape of page.data for MDX pages (see Sprint 2 insight) */
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
  return privateSource.getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = privateSource.getPage(slug, locale);

  if (!page) return {};

  const t = await getTranslations("docs");
  const data = page.data as unknown as DocsPageData;

  return {
    title: `${data.title} | ${t("internalMetaSuffix")}`,
    description: data.description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;

  const page = privateSource.getPage(slug, locale);

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
          docScope="private"
          locale={locale}
        />
      </DocsBody>
    </DocsPage>
  );
}
