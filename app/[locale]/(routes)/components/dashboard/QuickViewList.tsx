"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import moment from "moment";

interface QuickViewItem {
  id: string;
  name?: string;
  property_name?: string;
  client_name?: string;
  status?: string;
  email?: string;
  primary_email?: string;
  createdAt: Date | string;
  assigned_to_user?: { name: string } | null;
  property_status?: string;
  client_status?: string;
}

interface QuickViewListProps {
  title: string;
  items: QuickViewItem[];
  viewAllHref: string;
  icon?: React.ReactNode;
  getStatusLabel?: (item: QuickViewItem) => string;
  getStatusColor?: (status: string) => string;
}

// Status color mapping
const getPropertyStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-500",
    PENDING: "bg-yellow-500",
    SOLD: "bg-blue-500",
    OFF_MARKET: "bg-gray-500",
    WITHDRAWN: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
};

const getClientStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    LEAD: "bg-blue-500",
    ACTIVE: "bg-green-500",
    INACTIVE: "bg-gray-500",
    CONVERTED: "bg-purple-500",
    LOST: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
};

const getPropertyStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    PENDING: "Pending",
    SOLD: "Sold",
    OFF_MARKET: "Off Market",
    WITHDRAWN: "Withdrawn",
  };
  return labels[status] || status;
};

const getClientStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    LEAD: "Lead",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    CONVERTED: "Converted",
    LOST: "Lost",
  };
  return labels[status] || status;
};

export const QuickViewList: React.FC<QuickViewListProps> = ({
  title,
  items,
  viewAllHref,
  icon,
  getStatusLabel,
  getStatusColor,
}) => {
  const isProperties = viewAllHref.includes("mls");
  
  const getStatusInfo = (item: QuickViewItem) => {
    const status = item.property_status || item.client_status || item.status;
    if (!status) return { label: "N/A", color: "bg-gray-500" };
    
    if (getStatusLabel && getStatusColor) {
      return {
        label: getStatusLabel(item),
        color: getStatusColor(status),
      };
    }
    
    if (isProperties) {
      return {
        label: getPropertyStatusLabel(status),
        color: getPropertyStatusColor(status),
      };
    } else {
      return {
        label: getClientStatusLabel(status),
        color: getClientStatusColor(status),
      };
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAllHref} className="flex items-center gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No {title.toLowerCase()} found
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const statusInfo = getStatusInfo(item);
              const displayName = item.name || item.property_name || item.client_name || "Unnamed";
              const displayEmail = item.email || item.primary_email;
              
              return (
                <Link
                  key={item.id}
                  href={isProperties ? `/mls/properties/${item.id}` : `/crm/clients/${item.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.color} text-white whitespace-nowrap`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {displayEmail && (
                          <span className="truncate max-w-[150px]">{displayEmail}</span>
                        )}
                        {item.assigned_to_user?.name && (
                          <span className="truncate">Assigned: {item.assigned_to_user.name}</span>
                        )}
                        <span>{moment(item.createdAt).format("MMM DD, YYYY")}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

