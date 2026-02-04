"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import moment from "moment";
import { StopIcon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { User } from "./table-data/schema";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { EmployeeRowActions } from "./EmployeeRowActions";

const statuses = [
  {
    value: "ACTIVE",
    label: "Active",
    icon: PlayIcon,
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    icon: StopIcon,
  },
  {
    value: "PENDING",
    label: "Pending",
    icon: PauseIcon,
  },
];

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.name")} />;
    },
    cell: ({ row }) => {
      const user = row.original;
      const name = user.name || user.email || "N/A";
      return (
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} alt={name} />
            <AvatarFallback>
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium">{name}</div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.email")} />;
    },
    cell: ({ row }) => (
      <div className="">{row.getValue("email")}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "is_admin",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.admin")} />;
    },
    cell: ({ row }) => {
      const isAdmin = row.getValue("is_admin") as boolean;
      const t = useTranslations("common");
      return (
        <Badge variant={isAdmin ? "default" : "secondary"}>
          {isAdmin ? t("detailLabels.yes") : t("detailLabels.no")}
        </Badge>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "userStatus",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.status")} />;
    },
    cell: ({ row }) => {
      const status = row.getValue("userStatus") as string;
      const statusObj = statuses.find((s) => s.value === status);
      
      if (!statusObj) {
        return <Badge variant="secondary">{status}</Badge>;
      }

      return (
        <div className="flex items-center">
          {statusObj.icon && (
            <statusObj.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {statusObj.label}
          </Badge>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "lastLoginAt",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.lastLogin")} />;
    },
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLoginAt") as Date | null | undefined;
      const t = useTranslations("common");
      return (
        <div className="whitespace-nowrap">
          {lastLogin
            ? moment(lastLogin).format("YYYY/MM/DD HH:mm")
            : t("statusLabels.na")}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "created_on",
    header: ({ column }) => {
      const t = useTranslations("common");
      return <DataTableColumnHeader column={column} title={t("tableColumns.createdAt")} />;
    },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {moment(row.getValue("created_on")).format("YYYY/MM/DD")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <EmployeeRowActions row={row} />,
  },
];

