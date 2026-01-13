"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { StopIcon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";

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

export default function EmployeeView({ data }: { data: any }) {
  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground break-all">{value ?? "N/A"}</p>
      </div>
    </div>
  );

  const displayName = data.name || data.email || "User";
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
                {data.is_admin ? "Admin" : "User"}
              </Badge>
              {statusObj && (
                <Badge variant={data.userStatus === "ACTIVE" ? "default" : "secondary"}>
                  {statusObj.icon && <statusObj.icon className="mr-1 h-3 w-3" />}
                  {statusObj.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <Row label="Email" value={data.email} />
          <Row label="Account Name" value={data.account_name || "N/A"} />
          <Row label="Username" value={data.username || "N/A"} />
          <Row label="User Status" value={data.userStatus} />
          <Row label="Language" value={data.userLanguage || "N/A"} />
        </div>
        <div>
          <Row label="User ID" value={data.id} />
          <Row 
            label="Created On" 
            value={data.created_on ? moment(data.created_on).format("YYYY/MM/DD HH:mm") : "N/A"} 
          />
          <Row 
            label="Last Login" 
            value={data.lastLoginAt ? moment(data.lastLoginAt).format("YYYY/MM/DD HH:mm") : "Never"} 
          />
          <Row label="Account Admin" value={data.is_account_admin ? "Yes" : "No"} />
          <Row label="Version" value={data.v ?? "N/A"} />
        </div>
      </CardContent>
    </Card>
  );
}

