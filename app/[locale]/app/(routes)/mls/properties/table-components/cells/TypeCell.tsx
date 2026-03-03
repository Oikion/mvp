"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import axios from "axios";

interface TypeCellProps {
  propertyId: string;
  value: string | null | undefined;
}

const propertyTypes = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PARKING", label: "Parking" },
  { value: "PLOT", label: "Plot" },
  { value: "FARM", label: "Farm" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Other" },
];

export const TypeCell = ({ propertyId, value }: TypeCellProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mls");

  const handleValueChange = async (newValue: string) => {
    setLoading(true);
    try {
      await axios.put("/api/mls/properties", {
        id: propertyId,
        property_type: newValue,
      });
      toast.success(t("MlsPropertiesTable.typeUpdated") || "Type updated");
      router.refresh();
    } catch (error) {
      toast.error("Error updating type");
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (val: string | null | undefined) => {
    if (!val) return "-";
    const typeObj = propertyTypes.find((pt) => pt.value === val);
    if (typeObj) {
      const translated = t(`PropertyForm.propertyType.${val}` as any);
      return translated || typeObj.label;
    }
    // Fallback: capitalize first letter, lowercase rest
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-muted/50 px-2 py-1 -mx-2 transition-colors text-sm">
          <span>{getLabel(value)}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {propertyTypes.map((pt) => (
          <DropdownMenuItem
            key={pt.value}
            onClick={() => handleValueChange(pt.value)}
            className="cursor-pointer"
          >
            {t(`PropertyForm.propertyType.${pt.value}` as any) || pt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
