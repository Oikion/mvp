"use client";

import { TemplateType } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { TemplateDefinition } from "@/lib/templates";

// Import visual template layouts
import { BrokerageMandateLayout } from "./templates/BrokerageMandateLayout";
import { LeaseAgreementLayout } from "./templates/LeaseAgreementLayout";
import { HandoverProtocolLayout } from "./templates/HandoverProtocolLayout";
import { ViewingConfirmationLayout } from "./templates/ViewingConfirmationLayout";

interface DocumentCanvasProps {
  readonly templateType: TemplateType;
  readonly definition: TemplateDefinition;
  readonly values: Record<string, string>;
  readonly locale: "en" | "el";
  readonly isPreview?: boolean;
  readonly onValueChange: (key: string, value: string) => void;
}

export function DocumentCanvas({
  templateType,
  definition,
  values,
  locale,
  isPreview = false,
  onValueChange,
}: DocumentCanvasProps) {
  // Render the appropriate template layout
  const renderTemplate = () => {
    const props = {
      definition,
      values,
      locale,
      isPreview,
      onValueChange,
    };

    switch (templateType) {
      case "BROKERAGE_MANDATE":
        return <BrokerageMandateLayout {...props} />;
      case "LEASE_AGREEMENT":
        return <LeaseAgreementLayout {...props} />;
      case "HANDOVER_PROTOCOL":
        return <HandoverProtocolLayout {...props} />;
      case "VIEWING_CONFIRMATION":
        return <ViewingConfirmationLayout {...props} />;
      default:
        return <div>Unknown template type</div>;
    }
  };

  return (
    <div className="flex justify-center w-full">
      {/* A4 Paper Container - 210mm x 297mm at 96dpi = ~794px x 1123px */}
      <div
        className={cn(
          "shadow-xl rounded-sm",
          "w-[794px] min-h-[1123px]",
          "p-[40px]", // ~15mm margins
          "font-serif text-[11px] leading-relaxed",
          "print:shadow-none print:rounded-none"
        )}
        style={{
          // Force white document with black text regardless of theme
          transformOrigin: "top center",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
}

// Shared components for template layouts
export function DocumentHeader({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle?: string;
}) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-[16px] font-bold mb-1" style={{ color: "#000000" }}>{title}</h1>
      {subtitle && (
        <p className="text-[12px]" style={{ color: "#4b5563" }}>{subtitle}</p>
      )}
    </div>
  );
}

export function DocumentSection({
  title,
  children,
  className,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 
        className="text-[12px] font-bold mb-2 px-2 py-1"
        style={{ backgroundColor: "#f3f4f6", color: "#000000" }}
      >
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function SignatureSection({
  leftLabel,
  rightLabel,
}: {
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly locale: "en" | "el";
}) {
  return (
    <div className="flex justify-between mt-10 pt-4">
      <div className="w-[45%] text-center">
        <div 
          className="mt-12 pt-1"
          style={{ borderTop: "1px solid #000000", color: "#000000" }}
        >
          {leftLabel}
        </div>
      </div>
      <div className="w-[45%] text-center">
        <div 
          className="mt-12 pt-1"
          style={{ borderTop: "1px solid #000000", color: "#000000" }}
        >
          {rightLabel}
        </div>
      </div>
    </div>
  );
}

export function DocumentFooter({ locale }: { readonly locale: "en" | "el" }) {
  const isGreek = locale === "el";
  return (
    <div className="absolute bottom-[30px] left-[40px] right-[40px] text-center text-[9px] text-gray-400">
      {isGreek
        ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
        : "This document was generated via the Oikion platform"}
    </div>
  );
}

export function LegalText({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="text-[9px] mt-5 text-justify leading-relaxed" style={{ color: "#4b5563" }}>
      {children}
    </p>
  );
}

export function DatePlaceText({
  place,
  date,
  locale,
}: {
  readonly place: string;
  readonly date: string;
  readonly locale: "en" | "el";
}) {
  const isGreek = locale === "el";
  
  // Format date
  let formattedDate = date;
  if (date) {
    try {
      const dateObj = new Date(date);
      formattedDate = dateObj.toLocaleDateString(isGreek ? "el-GR" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      formattedDate = date;
    }
  }

  return (
    <div className="text-center mt-5 text-[10px]" style={{ color: "#000000" }}>
      {place && formattedDate ? `${place}, ${formattedDate}` : place || formattedDate || ""}
    </div>
  );
}



