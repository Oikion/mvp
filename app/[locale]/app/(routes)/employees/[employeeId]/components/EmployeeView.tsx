"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { StopIcon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";

const statuses = [
  {
    value: "ACTIVE",
    labelKey: "employees.status.active",
    icon: PlayIcon,
  },
  {
    value: "INACTIVE",
    labelKey: "employees.status.inactive",
    icon: StopIcon,
  },
  {
    value: "PENDING",
    labelKey: "employees.status.pending",
    icon: PauseIcon,
  },
] as const;

export default function EmployeeView({ data }: { data: any }) {
  const t = useTranslations("network");

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground break-all">{value ?? t("employees.view.na")}</p>
      </div>
    </div>
  );

  const displayName = data.name || data.email || t("employees.view.fallbackName");
  const statusObj = statuses.find((s) => s.value === data.userStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={data.avatar || undefined} alt={displayName} />
            <AvatarFallback className="text-lg">
              {displayName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{displayName}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={data.is_admin ? "default" : "secondary"}>
                {data.is_admin ? t("employees.view.admin") : t("employees.view.user")}
              </Badge>
              {statusObj && (
                <Badge variant={data.userStatus === "ACTIVE" ? "default" : "secondary"}>
                  {statusObj.icon && <statusObj.icon className="mr-1 h-3 w-3" />}
                  {t(statusObj.labelKey)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <Row label={t("employees.view.email")} value={data.email} />
          <Row label={t("employees.view.accountName")} value={data.account_name || t("employees.view.na")} />
          <Row label={t("employees.view.username")} value={data.username || t("employees.view.na")} />
          <Row label={t("employees.view.userStatus")} value={data.userStatus} />
          <Row label={t("employees.view.language")} value={data.userLanguage || t("employees.view.na")} />
        </div>
        <div>
          <Row label={t("employees.view.userId")} value={data.id} />
          <Row
            label={t("employees.view.createdOn")}
            value={data.created_on ? moment(data.created_on).format("YYYY/MM/DD HH:mm") : t("employees.view.na")}
          />
          <Row
            label={t("employees.view.lastLogin")}
            value={data.lastLoginAt ? moment(data.lastLoginAt).format("YYYY/MM/DD HH:mm") : t("employees.view.never")}
          />
          <Row label={t("employees.view.accountAdmin")} value={data.is_account_admin ? t("employees.view.yes") : t("employees.view.no")} />
          <Row label={t("employees.view.version")} value={data.v ?? t("employees.view.na")} />
        </div>
      </CardContent>
    </Card>
  );
}

