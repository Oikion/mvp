"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  requestEditFormSchema,
  type RequestEditFormValues,
  type UpdateRequestInput,
} from "@/lib/validations/requests";
import { updateRequest } from "@/actions/requests/update-request";

interface EditRequestFormProps {
  request: {
    id: string;
    name?: string | null;
    requestType?: string | null;
    urgency?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    surfaceMin?: number | null;
    surfaceMax?: number | null;
    bedroomsMin?: number | null;
    bedroomsMax?: number | null;
    bathroomsMin?: number | null;
    bathroomsMax?: number | null;
    locationDisplayName?: string | null;
    municipality?: string | null;
    region?: string | null;
    timeline?: string | null;
    notes?: string | null;
    assignedAgentId?: string | null;
  };
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const REQUEST_TYPE_OPTIONS = ["BUY", "RENT"] as const;
const REQUEST_URGENCY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const TIMELINE_OPTIONS = [
  "IMMEDIATE",
  "ONE_THREE_MONTHS",
  "THREE_SIX_MONTHS",
  "SIX_PLUS_MONTHS",
] as const;

// Maps each form field to the tab that owns it — used for tab error indicators
const FIELD_TO_TAB: Record<string, string> = {
  name: "basics",
  requestType: "basics",
  urgency: "basics",
  timeline: "basics",
  notes: "basics",
  budgetMin: "budget",
  budgetMax: "budget",
  surfaceMin: "criteria",
  surfaceMax: "criteria",
  bedroomsMin: "criteria",
  bedroomsMax: "criteria",
  bathroomsMin: "criteria",
  bathroomsMax: "criteria",
  locationDisplayName: "location",
  municipality: "location",
  region: "location",
};

export function EditRequestForm({ request, onSuccess, onDirtyChange }: EditRequestFormProps) {
  const t = useTranslations("requests");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestEditFormValues>({
    resolver: zodResolver(requestEditFormSchema),
    defaultValues: {
      id: request.id,
      name: request.name ?? "",
      requestType: (request.requestType as RequestEditFormValues["requestType"]) ?? "BUY",
      urgency: (request.urgency as RequestEditFormValues["urgency"]) ?? null,
      budgetMin: request.budgetMin ?? "",
      budgetMax: request.budgetMax ?? "",
      surfaceMin: request.surfaceMin ?? "",
      surfaceMax: request.surfaceMax ?? "",
      bedroomsMin: request.bedroomsMin ?? "",
      bedroomsMax: request.bedroomsMax ?? "",
      bathroomsMin: request.bathroomsMin ?? "",
      bathroomsMax: request.bathroomsMax ?? "",
      locationDisplayName: request.locationDisplayName ?? "",
      municipality: request.municipality ?? "",
      region: request.region ?? "",
      timeline: (request.timeline as RequestEditFormValues["timeline"]) ?? null,
      notes: request.notes ?? "",
      assignedAgentId: request.assignedAgentId ?? null,
    },
  });

  // Derive which tabs have validation errors (purely from formState, no extra state)
  const errorFields = Object.keys(form.formState.errors);
  const tabsWithErrors = new Set(errorFields.map((f) => FIELD_TO_TAB[f]).filter(Boolean));

  const onSubmit = useCallback(async (values: RequestEditFormValues) => {
    setIsSubmitting(true);
    try {
      // Strip UI-only fields and coerce "" → null for optional numeric fields
      // so the payload matches the strict updateRequestSchema on the server.
      const { id, contactId: _contactId, ...rest } = values;
      const numericFields = [
        "budgetMin", "budgetMax",
        "surfaceMin", "surfaceMax",
        "bedroomsMin", "bedroomsMax",
        "bathroomsMin", "bathroomsMax",
        "floorMin", "floorMax",
        "plotSizeMin", "plotSizeMax",
        "constructionYearMin", "constructionYearMax",
      ] as const;
      const input: UpdateRequestInput = { ...rest } as UpdateRequestInput;
      for (const field of numericFields) {
        if (field in input && (input as Record<string, unknown>)[field] === "") {
          (input as Record<string, unknown>)[field] = null;
        }
      }
      const result = await updateRequest(id, input);
      if (!result.success) {
        toast.error(result.error ?? "Update failed", { isTranslationKey: false });
        return;
      }
      toast.success("updateSuccess");
      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error("[REQUEST_EDIT]", err);
      toast.error("updateFailed");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router, toast, onSuccess]);

  // Cmd/Ctrl+Enter submits the form
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form, onSubmit]);

  // Notify parent when dirty state changes so it can guard sheet close
  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  return (
    <div className="flex flex-col h-full" data-edit-request-form>
      <SheetHeader className="px-6 py-4 border-b">
        <SheetTitle>{t("edit.title")}</SheetTitle>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <Tabs defaultValue="basics" className="flex flex-1 overflow-hidden">
            <TabsList className="flex flex-col h-full w-44 shrink-0 rounded-none border-r bg-muted/30 justify-start p-2 gap-1">
              {(["basics", "budget", "criteria", "location"] as const).map((tab) => (
                <TabsTrigger key={tab} value={tab} className="w-full justify-start">
                  {t(`edit.tabs.${tab}` as Parameters<typeof t>[0])}
                  {tabsWithErrors.has(tab) && (
                    <span className="ml-auto text-destructive text-base leading-none" aria-hidden="true">
                      ·
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ── Basics (includes Notes) ── */}
              <TabsContent value="basics" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("wizard.fields.title")} *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wizard.fields.requestType")}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REQUEST_TYPE_OPTIONS.map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`requestType.${v}` as Parameters<typeof t>[0])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wizard.fields.urgency")}</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("wizard.fields.urgencyPlaceholder")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REQUEST_URGENCY_OPTIONS.map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`urgency.${v}` as Parameters<typeof t>[0])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wizard.fields.timeline")}</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("wizard.fields.timelinePlaceholder")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMELINE_OPTIONS.map((v) => (
                              <SelectItem key={v} value={v}>
                                {t(`timeline.${v}` as Parameters<typeof t>[0])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes merged into Basics — saves a dedicated tab for a single field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("wizard.fields.notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Budget ── */}
              <TabsContent value="budget" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["budgetMin", t("wizard.fields.budgetMin")],
                      ["budgetMax", t("wizard.fields.budgetMax")],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={field.value === "" ? "" : (field.value ?? "")}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>€</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* ── Criteria ── */}
              <TabsContent value="criteria" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["surfaceMin", t("wizard.fields.surfaceMin"), "m²"],
                      ["surfaceMax", t("wizard.fields.surfaceMax"), "m²"],
                      ["bedroomsMin", t("wizard.fields.bedroomsMin"), null],
                      ["bedroomsMax", t("wizard.fields.bedroomsMax"), null],
                      ["bathroomsMin", t("wizard.fields.bathroomsMin"), null],
                      ["bathroomsMax", t("wizard.fields.bathroomsMax"), null],
                    ] as const
                  ).map(([name, label, unit]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={field.value === "" ? "" : (field.value ?? "")}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          {unit && <FormDescription>{unit}</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* ── Location ── */}
              <TabsContent value="location" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="locationDisplayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("wizard.fields.locationDisplayName")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="municipality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wizard.fields.municipality")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("wizard.fields.region")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-between items-center gap-2 px-6 py-4 border-t bg-background">
            <p className="text-xs text-muted-foreground">
              {t("edit.keyboardHint" as Parameters<typeof t>[0]) ?? "⌘↵ to save"}
            </p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("edit.saving") : t("edit.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
