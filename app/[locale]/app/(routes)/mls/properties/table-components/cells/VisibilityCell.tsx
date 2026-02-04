"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown, Lock, Users, Globe } from "lucide-react";
import axios from "axios";

interface VisibilityCellProps {
  propertyId: string;
  visibility: string | null | undefined;
}

const visibilities = [
  { value: "PRIVATE", label: "Private", variant: "secondary", icon: Lock },
  { value: "SELECTED", label: "Selected", variant: "info", icon: Users },
  { value: "PUBLIC", label: "Public", variant: "success", icon: Globe },
];

export const VisibilityCell = ({ propertyId, visibility }: VisibilityCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mls");

  const currentVisibility = visibility || "PRIVATE";

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await axios.put("/api/mls/properties", {
        id: propertyId,
        portal_visibility: value,
      });
      toast.success(t("MlsPropertiesTable.visibilityUpdated") || "Visibility updated");
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error("Error updating visibility");
    } finally {
      setLoading(false);
    }
  };

  const getVariant = (val: string) => {
    return visibilities.find((v) => v.value === val)?.variant || "secondary";
  };

  const getLabel = (val: string) => {
    const visibilityObj = visibilities.find((v) => v.value === val);
    if (visibilityObj) {
      return t(`PropertyForm.portalVisibility.${val}`) || visibilityObj.label;
    }
    return val;
  };

  const getIcon = (val: string) => {
    const visibilityObj = visibilities.find((v) => v.value === val);
    return visibilityObj?.icon || Lock;
  };

  const CurrentIcon = getIcon(currentVisibility);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          <Badge
            variant={getVariant(currentVisibility) as any}
            className="hover:opacity-80 transition-opacity"
          >
            <CurrentIcon className="mr-1 h-3 w-3" />
            {getLabel(currentVisibility)}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {visibilities.map((v) => {
          const Icon = v.icon;
          return (
            <DropdownMenuItem
              key={v.value}
              onClick={() => handleValueChange(v.value)}
              className="cursor-pointer"
            >
              <Icon className="mr-2 h-4 w-4" />
              {t(`PropertyForm.portalVisibility.${v.value}`) || v.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
