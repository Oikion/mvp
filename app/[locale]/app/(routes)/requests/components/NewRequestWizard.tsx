"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestFormSchema, type RequestFormValues } from "@/lib/validations/requests";
import { createRequest } from "@/actions/requests/create-request";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTranslations } from "next-intl";
import { useContacts } from "@/hooks/swr";
import { useAppToast } from "@/hooks/use-app-toast";

interface NewRequestWizardProps {
  users: any[];
  onFinish: () => void;
}

export function NewRequestWizard({ users, onFinish }: NewRequestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1); // 1-indexed like Contact/Property wizards
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("requests");
  const commonT = useTranslations("common");
  const { toast } = useAppToast();
  const { contacts: contactOptions } = useContacts();

  const STEPS = [
    { id: 1, title: t("wizard.steps.basics"), description: t("wizard.stepDescriptions.basics") },
    { id: 2, title: t("wizard.steps.location"), description: t("wizard.stepDescriptions.location") },
    { id: 3, title: t("wizard.steps.requirements"), description: t("wizard.stepDescriptions.requirements") },
    { id: 4, title: t("wizard.steps.features"), description: t("wizard.stepDescriptions.features") },
    { id: 5, title: t("wizard.steps.preferences"), description: t("wizard.stepDescriptions.preferences") },
  ];

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      name: "",
      contactId: "",
      requestType: "BUY",
      propertyCategory: null,
      propertyTypes: [],
      urgency: "MEDIUM",
      budgetMin: "",
      budgetMax: "",
      surfaceMin: "",
      surfaceMax: "",
      plotSizeMin: "",
      plotSizeMax: "",
      bedroomsMin: "",
      bedroomsMax: "",
      bathroomsMin: "",
      bathroomsMax: "",
      floorMin: "",
      floorMax: "",
      groundFloorOnly: false,
      constructionYearMin: "",
      constructionYearMax: "",
      conditionPreference: [],
      heatingTypes: [],
      energyClassMin: null,
      furnished: null,
      requiresElevator: null,
      requiresParking: null,
      requiresStorage: null,
      requiresGarden: null,
      petFriendly: null,
      requiresAC: null,
      insideCityPlan: null,
      legalizationOk: null,
      viewTypes: [],
      orientationPref: [],
      locationDisplayName: "",
      municipality: "",
      region: "",
      isInvestmentPurpose: null,
      goldenVisaEligible: null,
      financingStatus: null,
      auctionInterest: null,
      timeline: null,
      assignedAgentId: null,
      notes: "",
    },
    mode: "onChange",
  });

  // Step field groups for validation (1-indexed)
  const stepFields: Record<number, (keyof RequestFormValues)[]> = {
    1: ["name", "requestType", "propertyCategory", "urgency"],
    2: ["locationDisplayName", "municipality", "region", "surfaceMin", "surfaceMax", "plotSizeMin", "plotSizeMax"],
    3: ["budgetMin", "budgetMax", "bedroomsMin", "bedroomsMax", "bathroomsMin", "bathroomsMax", "floorMin", "floorMax", "groundFloorOnly", "constructionYearMin", "constructionYearMax"],
    4: ["requiresElevator", "requiresParking", "requiresStorage", "requiresGarden", "petFriendly", "requiresAC", "insideCityPlan", "legalizationOk"],
    5: ["timeline", "assignedAgentId", "notes", "isInvestmentPurpose", "financingStatus"],
  };

  const handleNext = async () => {
    const fields = stepFields[currentStep] || [];
    const valid = await form.trigger(fields);
    if (valid && currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const onSubmit = async (values: RequestFormValues) => {
    setIsLoading(true);
    try {
      const toNum = (v: unknown) => (v !== "" && v != null ? Number(v) : null);

      const result = await createRequest(({
        name: values.name.trim(),
        contactId: values.contactId,
        requestType: values.requestType,
        propertyCategory: values.propertyCategory || null,
        propertyTypes: values.propertyTypes || [],
        urgency: values.urgency || "MEDIUM",
        budgetMin: toNum(values.budgetMin),
        budgetMax: toNum(values.budgetMax),
        surfaceMin: toNum(values.surfaceMin),
        surfaceMax: toNum(values.surfaceMax),
        plotSizeMin: toNum(values.plotSizeMin),
        plotSizeMax: toNum(values.plotSizeMax),
        bedroomsMin: toNum(values.bedroomsMin),
        bedroomsMax: toNum(values.bedroomsMax),
        bathroomsMin: toNum(values.bathroomsMin),
        bathroomsMax: toNum(values.bathroomsMax),
        floorMin: toNum(values.floorMin),
        floorMax: toNum(values.floorMax),
        groundFloorOnly: values.groundFloorOnly ?? false,
        constructionYearMin: toNum(values.constructionYearMin),
        constructionYearMax: toNum(values.constructionYearMax),
        conditionPreference: values.conditionPreference || [],
        heatingTypes: values.heatingTypes || [],
        energyClassMin: values.energyClassMin || null,
        furnished: values.furnished || null,
        requiresElevator: values.requiresElevator ?? null,
        requiresParking: values.requiresParking ?? null,
        requiresStorage: values.requiresStorage ?? null,
        requiresGarden: values.requiresGarden ?? null,
        petFriendly: values.petFriendly ?? null,
        requiresAC: values.requiresAC ?? null,
        insideCityPlan: values.insideCityPlan ?? null,
        legalizationOk: values.legalizationOk ?? null,
        viewTypes: values.viewTypes || [],
        orientationPref: values.orientationPref || [],
        locationDisplayName: values.locationDisplayName || null,
        municipality: values.municipality || null,
        region: values.region || null,
        isInvestmentPurpose: values.isInvestmentPurpose ?? null,
        goldenVisaEligible: values.goldenVisaEligible ?? null,
        financingStatus: values.financingStatus || null,
        auctionInterest: values.auctionInterest ?? null,
        timeline: values.timeline || null,
        assignedAgentId: values.assignedAgentId || null,
        notes: values.notes || null,
      }) as Parameters<typeof createRequest>[0]);

      if (result.success) {
        toast.success(t("toast.created"), {
          description: t("toast.createdDesc"),
          isTranslationKey: false,
        });
        onFinish();
      } else {
        toast.error(result.error || t("toast.createError"), {
          isTranslationKey: false,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step content renderer ──
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("wizard.fields.title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("wizard.fields.titlePlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wizard.fields.contact")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("wizard.fields.contactPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contactOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("wizard.fields.requestType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">{t("requestType.BUY")}</SelectItem>
                      <SelectItem value="RENT">{t("requestType.RENT")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wizard.fields.propertyCategory")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("wizard.fields.propertyCategoryPlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="RESIDENTIAL">{t("propertyPurpose.RESIDENTIAL")}</SelectItem>
                      <SelectItem value="COMMERCIAL">{t("propertyPurpose.COMMERCIAL")}</SelectItem>
                      <SelectItem value="LAND">{t("propertyPurpose.LAND")}</SelectItem>
                      <SelectItem value="PARKING">{t("propertyPurpose.PARKING")}</SelectItem>
                      <SelectItem value="OTHER">{t("propertyPurpose.OTHER")}</SelectItem>
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
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("wizard.fields.urgencyPlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">{t("urgency.LOW")}</SelectItem>
                      <SelectItem value="MEDIUM">{t("urgency.MEDIUM")}</SelectItem>
                      <SelectItem value="HIGH">{t("urgency.HIGH")}</SelectItem>
                      <SelectItem value="CRITICAL">{t("urgency.CRITICAL")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="locationDisplayName" render={({ field }) => (
              <FormItem><FormLabel>{t("wizard.fields.locationDisplayName")}</FormLabel><FormControl><Input placeholder={t("wizard.fields.locationPlaceholder")} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="municipality" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.municipality")}</FormLabel><FormControl><Input placeholder={t("wizard.fields.municipalityPlaceholder")} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.region")}</FormLabel><FormControl><Input placeholder={t("wizard.fields.regionPlaceholder")} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="surfaceMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.surfaceMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="surfaceMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.surfaceMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="plotSizeMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.plotSizeMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="plotSizeMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.plotSizeMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="budgetMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.budgetMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="budgetMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.budgetMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="bedroomsMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.bedroomsMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bedroomsMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.bedroomsMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bathroomsMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.bathroomsMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bathroomsMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.bathroomsMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="floorMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.floorMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="floorMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.floorMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="groundFloorOnly" render={({ field }) => (
              <FormItem className="flex items-center gap-3 pt-1">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("wizard.fields.groundFloorOnly")}</FormLabel>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="constructionYearMin" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.constructionYearMin")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="constructionYearMax" render={({ field }) => (
                <FormItem><FormLabel>{t("wizard.fields.constructionYearMax")}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {(["requiresElevator", "requiresParking", "requiresStorage", "requiresGarden", "petFriendly", "requiresAC", "insideCityPlan", "legalizationOk"] as const).map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked || null)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">{t(`wizard.fields.${fieldName}`)}</FormLabel>
                  </FormItem>
                )}
              />
            ))}

            <FormField control={form.control} name="furnished" render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel>{t("wizard.fields.furnished")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("wizard.fields.furnishedPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="PARTIALLY">Partially</SelectItem>
                    <SelectItem value="FULLY">Fully</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="timeline" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wizard.fields.timeline")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("wizard.fields.timelinePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">{t("timeline.IMMEDIATE")}</SelectItem>
                    <SelectItem value="ONE_THREE_MONTHS">{t("timeline.ONE_THREE_MONTHS")}</SelectItem>
                    <SelectItem value="THREE_SIX_MONTHS">{t("timeline.THREE_SIX_MONTHS")}</SelectItem>
                    <SelectItem value="SIX_PLUS_MONTHS">{t("timeline.SIX_PLUS_MONTHS")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="financingStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wizard.fields.financingStatus")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("wizard.fields.financingPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">{t("financingStatus.CASH")}</SelectItem>
                    <SelectItem value="MORTGAGE_PREAPPROVED">{t("financingStatus.MORTGAGE_PREAPPROVED")}</SelectItem>
                    <SelectItem value="MORTGAGE_PENDING">{t("financingStatus.MORTGAGE_PENDING")}</SelectItem>
                    <SelectItem value="SEEKING_FINANCING">{t("financingStatus.SEEKING_FINANCING")}</SelectItem>
                    <SelectItem value="UNKNOWN">{t("financingStatus.UNKNOWN")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <div className="space-y-3 pt-2">
              <FormField control={form.control} name="isInvestmentPurpose" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value === true} onCheckedChange={(checked) => field.onChange(checked || null)} /></FormControl>
                  <FormLabel className="!mt-0">{t("wizard.fields.isInvestmentPurpose")}</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="goldenVisaEligible" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value === true} onCheckedChange={(checked) => field.onChange(checked || null)} /></FormControl>
                  <FormLabel className="!mt-0">{t("wizard.fields.goldenVisaEligible")}</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="auctionInterest" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value === true} onCheckedChange={(checked) => field.onChange(checked || null)} /></FormControl>
                  <FormLabel className="!mt-0">{t("wizard.fields.auctionInterest")}</FormLabel>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="assignedAgentId" render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel>{t("wizard.fields.assignedAgent")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("wizard.fields.assignedAgentPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel>{t("wizard.fields.notes")}</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder={t("wizard.fields.notesPlaceholder")} {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting the form on non-final steps
          if (e.key === "Enter" && currentStep < STEPS.length) {
            e.preventDefault();
          }
        }}
        className="h-full px-10"
      >
        <div className="w-full max-w-[800px] text-sm pb-10">
          {/* Progress bar */}
          <div className="pb-3">
            <ProgressBar
              steps={STEPS}
              currentStep={currentStep}
            />
          </div>

          {/* Navigation buttons — ABOVE the card, matching Property/Contact pattern */}
          <div className="flex justify-end gap-2 pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              {t("wizard.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={isLoading}
              >
                {t("wizard.buttons.next")}
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? commonT("buttonStates.creating") : t("wizard.buttons.create")}
              </Button>
            )}
          </div>

          {/* Step content in a Card — matching Property/Contact pattern */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent key={currentStep}>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
