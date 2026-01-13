import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DocumentEditorView } from "./components/DocumentEditorView";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "documents.editor" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function DocumentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const searchParamsData = await searchParams;

  // Get document ID if editing existing document
  const documentId =
    typeof searchParamsData.id === "string" ? searchParamsData.id : undefined;

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<EditorSkeleton />}>
        <DocumentEditorView documentId={documentId} locale={locale} />
      </Suspense>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}








