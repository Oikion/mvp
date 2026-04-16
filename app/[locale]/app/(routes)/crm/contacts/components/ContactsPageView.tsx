// @ts-nocheck
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { GridToolbar } from "@/components/ui/grid-toolbar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { useContactColumns } from "../table-components/columns";
import type { ContactRow } from "../table-components/columns";
import { QuickAddContact } from "./QuickAddContact";
import { NewContactWizard } from "./NewContactWizard";
import { ExportButton } from "@/components/export";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Building2,
  User,
  Phone,
  Mail,
  Plus,
  Users,
  Share2,
  FileSpreadsheet,
  UserRoundSearch,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";

// ── Status badge colors (consistent across list + detail views) ──
const STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  QUALIFIED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UNDER_CONTRACT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  ON_HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  OWNER: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  BUYER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  TENANT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  SELLER: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  INVESTOR: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  BROKER: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
};

interface ContactsPageViewProps {
  contacts: ContactRow[];
  crmData: any;
}

export default function ContactsPageView({
  contacts = [],
  crmData,
}: ContactsPageViewProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("agency");
  const t = useTranslations("crm");
  const commonT = useTranslations("common");
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { users } = crmData;
  const columns = useContactColumns(users);

  // ── Filter logic ──
  const filteredContacts = useMemo(() => {
    return contacts.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.displayName?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.primaryPhone?.includes(q) ||
        item.companyName?.toLowerCase().includes(q);

      const statusFilter = selectedFilters.status ?? [];
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(item.status);

      const categoryFilter = selectedFilters.category ?? [];
      const matchesCategory =
        categoryFilter.length === 0 ||
        (item.category || []).some((c: string) => categoryFilter.includes(c));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [contacts, searchQuery, selectedFilters]);

  // ── Grid card renderer ──
  const renderContactCard = useCallback(
    (contact: any) => (
      <Link
        href={`/app/crm/contacts/${contact.friendlyId}`}
        className="block h-full"
      >
        <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-sm cursor-pointer">
          <CardContent className="p-4 flex flex-col gap-3">
            {/* Header: avatar + name + status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    contact.isCompany
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-primary/10"
                  )}
                  aria-hidden="true"
                >
                  {contact.isCompany ? (
                    <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contact.displayName || "—"}
                  </p>
                  {contact.assignedAgent?.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.assignedAgent.name}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-[10px] font-medium",
                  STATUS_COLORS[contact.status] || STATUS_COLORS.LEAD
                )}
                variant="secondary"
              >
                {t(`contacts.status.${contact.status}` as Parameters<typeof t>[0])}
              </Badge>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.primaryPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{contact.primaryPhone}</span>
                </div>
              )}
            </div>

            {/* Categories */}
            {contact.category?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {(contact.category as string[]).slice(0, 3).map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      CATEGORY_COLORS[cat]
                    )}
                  >
                    {t(`contacts.category.${cat}` as Parameters<typeof t>[0])}
                  </Badge>
                ))}
                {contact.category.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{contact.category.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    ),
    [t]
  );

  if (!isMounted) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="space-y-6"
    >
      {/* ── Tab headers ── */}
      <TabsList className="inline-grid grid-cols-2">
        <TabsTrigger value="agency">
          <Users className="h-4 w-4 shrink-0 mr-1.5" aria-hidden="true" />
          {t("contacts.tabs.allContacts")}
          {contacts.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-xs font-medium">
              {contacts.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="shared">
          <Share2 className="h-4 w-4 shrink-0 mr-1.5" aria-hidden="true" />
          {t("contacts.tabs.sharedWithMe")}
        </TabsTrigger>
      </TabsList>

      {/* ── Agency Contacts tab ── */}
      <TabsContent value="agency" className="space-y-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Left: Title & Description */}
              <div className="space-y-1.5">
                <CardTitle>{t("contacts.tabs.allContacts")}</CardTitle>
                <CardDescription>
                  {t("contacts.pageDescription")}
                </CardDescription>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAddOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  {t("contacts.quickAdd.title")}
                </Button>
                <ExportButton
                  module="crm"
                  variant="outline"
                  size="sm"
                />
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/import/add">
                    <FileSpreadsheet
                      className="h-4 w-4 mr-1"
                      aria-hidden="true"
                    />
                    {commonT("import")}
                  </Link>
                </Button>
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  {commonT("new")} {t("contacts.pageTitle")}
                </Button>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {contacts.length === 0 ? (
              /* ── Empty state ── */
              <div className="text-center text-muted-foreground py-12">
                <UserRoundSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="font-medium">
                  {t("contacts.emptyState.noContacts")}
                </p>
                <p className="text-sm mt-1">
                  {t("contacts.emptyState.createFirst")}
                </p>
              </div>
            ) : view === "list" ? (
              /* ── List view (DataTable) ── */
              <DataTable
                data={contacts}
                columns={columns}
                searchKey="displayName"
                searchPlaceholder={t("contacts.searchPlaceholder")}
                onRowOpen={(row) => { if (row.original.friendlyId) router.push(`/app/crm/contacts/${row.original.friendlyId}`); }}
                toolbarRight={<ViewToggle view={view} setView={setView} />}
              />
            ) : (
              /* ── Grid view (Cards) ── */
              <div className="space-y-4">
                <GridToolbar
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder={t("contacts.searchPlaceholder")}
                  selectedFilters={selectedFilters}
                  onFilterChange={(filterId, values) =>
                    setSelectedFilters((prev) => ({ ...prev, [filterId]: values }))
                  }
                  onReset={() => {
                    setSearchQuery("");
                    setSelectedFilters({});
                  }}
                  filters={[
                    {
                      id: "status",
                      title: t("contacts.view.status"),
                      options: [
                        { value: "LEAD", label: t("contacts.status.LEAD") },
                        { value: "CONTACTED", label: t("contacts.status.CONTACTED") },
                        { value: "QUALIFIED", label: t("contacts.status.QUALIFIED") },
                        { value: "ACTIVE", label: t("contacts.status.ACTIVE") },
                        { value: "UNDER_CONTRACT", label: t("contacts.status.UNDER_CONTRACT") },
                        { value: "ON_HOLD", label: t("contacts.status.ON_HOLD") },
                        { value: "INACTIVE", label: t("contacts.status.INACTIVE") },
                      ],
                    },
                    {
                      id: "category",
                      title: t("contacts.view.categories"),
                      options: [
                        { value: "OWNER", label: t("contacts.category.OWNER") },
                        { value: "BUYER", label: t("contacts.category.BUYER") },
                        { value: "TENANT", label: t("contacts.category.TENANT") },
                        { value: "SELLER", label: t("contacts.category.SELLER") },
                        { value: "INVESTOR", label: t("contacts.category.INVESTOR") },
                        { value: "BROKER", label: t("contacts.category.BROKER") },
                        { value: "NOTARY", label: t("contacts.category.NOTARY") },
                        { value: "LAWYER", label: t("contacts.category.LAWYER") },
                      ],
                    },
                  ]}
                  rightContent={<ViewToggle view={view} setView={setView} />}
                />

                {filteredContacts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <UserRoundSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="font-medium">
                      {t("contacts.emptyState.noResults")}
                    </p>
                  </div>
                ) : (
                  <VirtualizedGrid
                    items={filteredContacts}
                    renderItem={renderContactCard}
                    getItemKey={(item: any) => item.id}
                    columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                    rowHeight={200}
                    gap={16}
                    maxHeight="calc(100vh - 400px)"
                    showScrollToTop
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Shared Contacts tab ── */}
      <TabsContent value="shared" className="space-y-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="space-y-1.5">
              <CardTitle>{t("contacts.tabs.sharedWithMe")}</CardTitle>
              <CardDescription>
                {t("contacts.emptyState.noShared")}
              </CardDescription>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">
                {t("contacts.emptyState.noShared")}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Quick Add Sheet ── */}
      <QuickAddContact
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        organizationUsers={users || []}
        onContinueToFull={() => {
          setQuickAddOpen(false);
          setWizardOpen(true);
        }}
      />

      {/* ── Full Wizard Sheet ── */}
      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("contacts.wizard.title")}</SheetTitle>
          </SheetHeader>
          <NewContactWizard
            users={users || []}
            onFinish={() => {
              setWizardOpen(false);
              router.refresh();
            }}
          />
        </SheetContent>
      </Sheet>
    </Tabs>
  );
}
