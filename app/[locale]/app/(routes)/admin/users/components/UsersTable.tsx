"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../table-components/columns";
import { AdminUser } from "../table-data/schema";

interface UsersTableProps {
  users: AdminUser[];
  translations: {
    dateCreated: string;
    lastLogin: string;
    name: string;
    email: string;
    role: string;
    roleAdmin: string;
    roleMember: string;
    status: string;
    language: string;
    filterPlaceholder: string;
  };
}

export function UsersTable({ users, translations }: UsersTableProps) {
  const t = (key: string) => translations[key as keyof typeof translations] || key;
  
  return (
    <DataTable 
      data={users} 
      columns={getColumns(t)}
      searchKey="name"
      searchPlaceholder={translations.filterPlaceholder}
    />
  );
}
