"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { ExportButton } from "@/components/export";
import { TemplatesSection } from "./TemplatesSection";
import { QuickUploadZone } from "./QuickUploadZone";
import { MassUploadModal } from "./MassUploadModal";
import { DocumentCard } from "./DocumentCard";
import { getColumns } from "../table-components/columns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { SharedActionModals } from "@/components/entity";
import {
  FileText,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import type { TemplateListItem } from "@/actions/templates/get-templates";
import type { Prisma } from "@prisma/client";
// Prisma 7: JsonValue is accessed via the `Prisma` namespace.
type JsonValue = Prisma.JsonValue;
import type { MentionData } from "./MentionDisplay";
import { archiveEntity } from "@/actions/archive/archive-entity";

interface Document {
  id: string;
  friendlyId: string;
  document_name: string;
  description?: string | null;
  document_system_type?: string | null;
  document_file_mimeType?: string;
  createdAt?: Date | null;
  mentions?: JsonValue;
  linkEnabled?: boolean;
  shareableLink?: string | null;
  passwordProtected?: boolean;
  viewsCount?: number;
  accounts?: Array<{ id: string; client_name: string }>;
  linkedProperties?: Array<{ id: string; property_name: string }>;
  linkedCalendarEvents?: Array<{ id: string; title: string | null }>;
  linkedTasks?: Array<{ id: string; title: string }>;
}

interface DocumentsPageViewProps {
  documents: Document[];
  templates: TemplateListItem[];
}

export default function DocumentsPageView({
  documents = [],
  templates = [],
}: DocumentsPageViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [massUploadOpen, setMassUploadOpen] = useState(false);
  const t = useTranslations("documents");
  const commonT = useTranslations("common");
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter data for grid view
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const typeFilter = selectedFilters.document_system_type ?? [];
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(doc.document_system_type || "OTHER");

      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, selectedFilters]);

  // Grid toolbar handlers
  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterId]: values,
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSelectedFilters({});
  }, []);

  // Grid filters config
  const gridFilters = useMemo(
    () => [
      {
        id: "document_system_type",
        title: t("Filters.documentType"),
        options: [
          { label: t("DocumentSystemType.INVOICE"), value: "INVOICE" },
          { label: t("DocumentSystemType.RECEIPT"), value: "RECEIPT" },
          { label: t("DocumentSystemType.CONTRACT"), value: "CONTRACT" },
          { label: t("DocumentSystemType.OFFER"), value: "OFFER" },
          { label: t("DocumentSystemType.OTHER"), value: "OTHER" },
        ],
      },
    ],
    [t]
  );

  // Document card handlers
  const handleView = useCallback(
    (id: string, friendlyId: string) => {
      router.push(`/app/documents/${friendlyId}`);
    },
    [router]
  );

  const handleShare = useCallback(
    (id: string, friendlyId: string) => {
      router.push(`/app/documents/${friendlyId}?tab=share`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await archiveEntity("document", id);
      if (!result.success) {
        toast.error(t("documentGrid.failedToDelete"));
        return;
      }
      toast.success(t("documentGrid.documentDeleted"));
      router.refresh();
    },
    [t, router]
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Document Templates (replaces Stats Cards) */}
      <TemplatesSection templates={templates} />

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1.5">
              <CardTitle>{t("DocumentsPage.title")}</CardTitle>
              <CardDescription>{t("DocumentsPage.description")}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <QuickUploadZone />
              <ExportButton
                module="documents"
                totalRows={documents.length}
                filteredRows={filteredDocuments.length}
                filters={{
                  type: selectedFilters.document_system_type,
                  search: searchQuery,
                }}
              />
              <Button
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setMassUploadOpen(true)}
              >
                {commonT("import")}
              </Button>
              <MassUploadModal
                open={massUploadOpen}
                onOpenChange={setMassUploadOpen}
              />
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {!documents || documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">{t("DocumentsTable.noResults")}</p>
              <p className="text-sm mt-1">{t("DocumentsPage.description")}</p>
            </div>
          ) : view === "list" ? (
            <DataTable
              data={documents}
              columns={getColumns((k: string) => t(k as Parameters<typeof t>[0]))}
              searchKey="document_name"
              searchPlaceholder={t("DocumentsTable.filterPlaceholder")}
              onRowOpen={(row) => router.push(`/app/documents/${(row.original as any).friendlyId ?? (row.original as any).id}`)}
              toolbarRight={<ViewToggle view={view} setView={setView} />}
            />
          ) : (
            <div className="space-y-4">
              <GridToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t("DocumentsTable.filterPlaceholder")}
                filters={gridFilters}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onRefresh={handleRefresh}
                rightContent={<ViewToggle view={view} setView={setView} />}
              />
              {filteredDocuments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t("DocumentsTable.noResults")}
                </div>
              ) : (
                <VirtualizedGrid
                  items={filteredDocuments}
                  getItemKey={(doc: Document) => doc.id}
                  renderItem={(doc: Document) => (
                    <DocumentCard
                      id={doc.id}
                      friendlyId={doc.friendlyId}
                      document_name={doc.document_name}
                      description={doc.description}
                      createdAt={doc.createdAt}
                      mentions={doc.mentions as MentionData | null}
                      linkEnabled={doc.linkEnabled}
                      shareableLink={doc.shareableLink}
                      passwordProtected={doc.passwordProtected}
                      viewsCount={doc.viewsCount}
                      onView={handleView}
                      onShare={handleShare}
                      onDelete={handleDelete}
                    />
                  )}
                  rowHeight={280}
                  gap={16}
                  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                  maxHeight="calc(100vh - 400px)"
                  showScrollToTop
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared modals for delete, share, schedule actions */}
      <SharedActionModals />
    </div>
  );
}
