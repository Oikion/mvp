"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { cn } from "@/lib/utils";
import { Building2, User } from "lucide-react";
import { format } from "date-fns";

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

interface ContactRow {
  id: string;
  friendlyId: string;
  displayName: string;
  isCompany?: boolean;
  email?: string | null;
  primaryPhone?: string | null;
  status: string;
  category?: string[];
  source?: string | null;
  assignedAgent?: { id: string; name: string | null } | null;
  createdAt: string | Date;
}

export function getContactColumns(): ColumnDef<ContactRow>[] {
  return [
    {
      accessorKey: "displayName",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.name")} />;
      },
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                contact.isCompany ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
              )}
            >
              {contact.isCompany ? (
                <Building2 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              ) : (
                <User className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[200px]">{contact.displayName}</p>
              <p className="text-xs text-muted-foreground">{contact.friendlyId}</p>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.email")} />;
      },
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[180px] block">{row.getValue("email") || "—"}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "primaryPhone",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.phone")} />;
      },
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("primaryPhone") || "—"}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.status")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("crm");
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn("text-[10px]", STATUS_COLORS[status] || STATUS_COLORS.LEAD)}
            variant="secondary"
          >
            {t(`contacts.status.${status}` as Parameters<typeof t>[0])}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.categories")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("crm");
        const categories = (row.getValue("category") as string[]) || [];
        if (categories.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[cat])}
              >
                {t(`contacts.category.${cat}` as Parameters<typeof t>[0])}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "assignedAgent",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.assignedTo")} />;
      },
      cell: ({ row }) => {
        const agent = row.original.assignedAgent;
        return (
          <span className="text-sm">{agent?.name || "—"}</span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.created")} />;
      },
      cell: ({ row }) => {
        const date = row.getValue("createdAt");
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {date ? format(new Date(date as string), "dd/MM/yy") : "—"}
          </span>
        );
      },
      enableSorting: true,
    },
  ];
}
