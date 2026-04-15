"use client";

import { useState } from "react";
import {
  Building2,
  User,
  ClipboardList,
  FileText,
  Upload,
  ArrowLeft,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRequests } from "@/hooks/swr/useRequests";
import { useDocuments } from "@/hooks/swr/useDocuments";

export type AttachEntityType = "property" | "contact" | "request" | "document";

interface EntityOption {
  id: string;
  title: string;
  subtitle?: string;
}

interface FeedAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: EntityOption[];
  contacts: EntityOption[];
  onEntitySelect: (type: AttachEntityType, id: string, title: string) => void;
  onFileUploadRequested: () => void;
}

const ENTITY_TYPES: {
  type: AttachEntityType;
  icon: React.ElementType;
  label: string;
  description: string;
}[] = [
  {
    type: "property",
    icon: Building2,
    label: "Property",
    description: "Share a listing",
  },
  {
    type: "contact",
    icon: User,
    label: "Contact",
    description: "Attach a contact profile",
  },
  {
    type: "request",
    icon: ClipboardList,
    label: "Request",
    description: "Link a request",
  },
  {
    type: "document",
    icon: FileText,
    label: "Document",
    description: "Reference a document",
  },
];

export function FeedAttachmentDialog({
  open,
  onOpenChange,
  properties,
  contacts,
  onEntitySelect,
  onFileUploadRequested,
}: FeedAttachmentDialogProps) {
  const [step, setStep] = useState<"type-select" | "entity-select">(
    "type-select"
  );
  const [entityType, setEntityType] = useState<AttachEntityType | null>(null);
  const [search, setSearch] = useState("");

  const { requests, isLoading: requestsLoading } = useRequests({
    enabled: open && entityType === "request",
  });
  const { documents, isLoading: documentsLoading } = useDocuments({
    enabled: open && entityType === "document",
  });

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("type-select");
      setEntityType(null);
      setSearch("");
    }, 150);
  };

  const handleTypeSelect = (type: AttachEntityType) => {
    setEntityType(type);
    setSearch("");
    setStep("entity-select");
  };

  const handleEntityPick = (id: string, title: string) => {
    if (!entityType) return;
    onEntitySelect(entityType, id, title);
    resetAndClose();
  };

  const handleFileUpload = () => {
    onFileUploadRequested();
    resetAndClose();
  };

  const getEntityList = (): EntityOption[] => {
    switch (entityType) {
      case "property":
        return properties;
      case "contact":
        return contacts;
      case "request":
        return requests.map((r) => ({ id: r.value, title: r.label }));
      case "document":
        return documents.map((d) => ({ id: d.value, title: d.label }));
      default:
        return [];
    }
  };

  const isLoading =
    (entityType === "request" && requestsLoading) ||
    (entityType === "document" && documentsLoading);

  const filtered = getEntityList().filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const currentType = ENTITY_TYPES.find((t) => t.type === entityType);

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden">
        {step === "type-select" ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-0">
              <DialogTitle className="text-base font-semibold">
                Attach to post
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Link an entity or upload a file
              </p>
            </DialogHeader>

            <div className="px-5 py-4 space-y-3">
              {/* 2×2 entity grid */}
              <div className="grid grid-cols-2 gap-2">
                {ENTITY_TYPES.map(({ type, icon: Icon, label, description }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeSelect(type)}
                    className="flex flex-col items-start gap-2.5 rounded-lg border bg-card p-3 hover:bg-accent/40 hover:border-foreground/20 transition-all text-left group"
                  >
                    <div className="rounded-md bg-muted/80 p-1.5 group-hover:bg-background transition-colors">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">
                        {description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {/* File upload */}
              <button
                type="button"
                onClick={handleFileUpload}
                className="w-full flex items-center gap-3 rounded-lg border border-dashed p-3 hover:bg-accent/40 hover:border-foreground/25 transition-all text-left group"
              >
                <div className="rounded-md bg-muted/80 p-1.5 group-hover:bg-background transition-colors shrink-0">
                  <Upload className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Upload a File</p>
                  <p className="text-xs text-muted-foreground">
                    Images, PDFs, documents · Max 10 MB
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-5 pt-4 pb-0">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setStep("type-select");
                    setSearch("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-base font-semibold">
                  Select a {currentType?.label}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="px-5 py-3 space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={`Search ${currentType?.label?.toLowerCase()}s…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoFocus
                />
              </div>

              {/* List */}
              <ScrollArea className="h-[220px] -mx-1 px-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    {search
                      ? `No results for "${search}"`
                      : `No ${currentType?.label?.toLowerCase()}s found`}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleEntityPick(item.id, item.title)}
                        className="w-full text-left rounded-md px-2.5 py-2 hover:bg-accent/50 transition-colors"
                      >
                        <p className="text-sm font-medium truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
