import { getDocument } from "@/actions/documents/get-document";
import { notFound } from "next/navigation";
import { DocumentDetail } from "./components/DocumentDetail";

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { documentId } = await params;
  const search = await searchParams;
  const activeTab = typeof search.tab === "string" ? search.tab : "details";

  const document = await getDocument(documentId);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} activeTab={activeTab} />;
}

