import { redirect } from "next/navigation";
import { getUserPermissionContext } from "@/lib/permissions/service";

export default async function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserPermissionContext();

  if (!ctx?.permissions.canViewArchive) {
    redirect("/app/dashboard");
  }

  return <>{children}</>;
}
