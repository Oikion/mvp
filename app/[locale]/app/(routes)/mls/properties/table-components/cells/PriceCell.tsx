"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Pencil, Check, X } from "lucide-react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PriceCellProps {
  propertyId: string;
  price: number | null | undefined;
}

export const PriceCell = ({ propertyId, price }: PriceCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editValue, setEditValue] = useState<string>(price?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("mls");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const newPrice = parseFloat(editValue.replace(/,/g, ""));
    
    if (isNaN(newPrice) && editValue.trim() !== "") {
      toast.error(t("MlsPropertiesTable.invalidPrice") || "Invalid price format");
      return;
    }

    setLoading(true);
    try {
      await axios.put("/api/mls/properties", {
        id: propertyId,
        price: editValue.trim() === "" ? null : newPrice,
      });
      toast.success(t("MlsPropertiesTable.priceUpdated") || "Price updated");
      setIsEditing(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error("Error updating price");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(price?.toString() || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const formatPrice = (val: number | null | undefined) => {
    if (!val) return "-";
    return `€${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[140px]">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 pl-6 pr-2 w-full text-sm"
            placeholder="0.00"
            disabled={loading}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:hover:bg-green-500/20"
          onClick={handleSave}
          disabled={loading}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:hover:bg-red-500/20"
          onClick={handleCancel}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors"
    >
      <span>{formatPrice(price)}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};












