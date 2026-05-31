"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useAppToast } from "@/hooks/use-app-toast";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressFieldGroup } from "@/components/form/AddressFieldGroup";

type Props = {
  industries: any[];
  users: any[];
  onFinish: () => void;
};

type TFunc = ReturnType<typeof useTranslations<"crm">>;

const createFormSchema = (t: TFunc) =>
  z.object({
    // Step 1: Basic Information
    client_name: z.string().min(2, t("accounts.form.validation.clientNameMin")),
    primary_email: z.string().email(t("accounts.form.validation.emailInvalid")).optional().or(z.literal("")),
    office_phone: z.string().optional().or(z.literal("")),
    client_type: z.string().optional().nullable(),
    client_status: z.string().optional().nullable(),

    // Step 2: Company Details
    company_id: z.string().optional().or(z.literal("")),
    vat: z.string().optional().or(z.literal("")),
    website: z.union([z.string().url(t("accounts.form.validation.urlInvalid")), z.literal(""), z.undefined()]).optional(),
    fax: z.string().optional().or(z.literal("")),

    // Step 3: Billing Address
    billing_street: z.string().optional().or(z.literal("")),
    billing_city: z.string().optional().or(z.literal("")),
    billing_state: z.string().optional().or(z.literal("")),
    billing_postal_code: z.string().optional().or(z.literal("")),
    billing_country: z.string().optional().default("GR"),
    billing_municipality: z.string().optional().or(z.literal("")),
    billing_area: z.string().optional().or(z.literal("")),

    // Step 4: Properties
    propertyIds: z.array(z.string()).optional().default([]),

    // Step 5: Additional Information
    description: z.string().optional().or(z.literal("")),
    assigned_to: z.string().min(3).max(50),
    member_of: z.string().optional().or(z.literal("")),
  }).refine(
    (data) => !!(data.primary_email && data.primary_email.length) || !!(data.office_phone && data.office_phone.length),
    {
      path: ["primary_email"],
      message: t("accounts.form.validation.emailOrPhoneRequired"),
    }
  );

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export function NewAccountForm({ industries, users, onFinish }: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const clientTypeOptions = [
    { value: "BUYER", label: t("accounts.form.clientType.BUYER") },
    { value: "SELLER", label: t("accounts.form.clientType.SELLER") },
    { value: "RENTER", label: t("accounts.form.clientType.RENTER") },
    { value: "INVESTOR", label: t("accounts.form.clientType.INVESTOR") },
    { value: "REFERRAL_PARTNER", label: t("accounts.form.clientType.REFERRAL_PARTNER") },
  ];

  const clientStatusOptions = [
    { value: "LEAD", label: t("accounts.form.clientStatus.LEAD") },
    { value: "ACTIVE", label: t("accounts.form.clientStatus.ACTIVE") },
    { value: "INACTIVE", label: t("accounts.form.clientStatus.INACTIVE") },
    { value: "CONVERTED", label: t("accounts.form.clientStatus.CONVERTED") },
    { value: "LOST", label: t("accounts.form.clientStatus.LOST") },
  ];

  const STEPS = [
    { id: 1, title: t("accounts.form.steps.basic.title"), description: t("accounts.form.steps.basic.description") },
    { id: 2, title: t("accounts.form.steps.company.title"), description: t("accounts.form.steps.company.description") },
    { id: 3, title: t("accounts.form.steps.billing.title"), description: t("accounts.form.steps.billing.description") },
    { id: 4, title: t("accounts.form.steps.properties.title"), description: t("accounts.form.steps.properties.description") },
    { id: 5, title: t("accounts.form.steps.additional.title"), description: t("accounts.form.steps.additional.description") },
  ];

  const formSchema = createFormSchema(t);
  const [currentStep, setCurrentStep] = useState(1);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: "",
      primary_email: "",
      office_phone: "",
      client_type: undefined,
      client_status: "LEAD",
      company_id: "",
      vat: "",
      website: "",
      fax: "",
      billing_street: "",
      billing_city: "",
      billing_state: "",
      billing_postal_code: "",
      billing_country: "",
      propertyIds: [],
      description: "",
      assigned_to: "",
      member_of: "",
    },
  });

  // Fetch properties on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get("/api/mls/properties");
        setProperties(response.data || []);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ["client_name", "primary_email", "office_phone"];
        break;
      case 2:
        fieldsToValidate = ["company_id", "vat", "website", "fax"];
        break;
      case 3:
        fieldsToValidate = ["billing_street", "billing_city", "billing_state", "billing_postal_code", "billing_country"];
        break;
      case 4:
        // Properties step is optional, no validation needed
        fieldsToValidate = [];
        break;
      case 5:
        fieldsToValidate = ["assigned_to"];
        break;
    }

    const result = await form.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    const clientTypeToCategory: Record<string, string> = {
      BUYER: "BUYER", SELLER: "SELLER", RENTER: "TENANT",
      INVESTOR: "INVESTOR", REFERRAL_PARTNER: "BROKER",
    };
    const clientStatusMap: Record<string, string> = {
      LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE",
      CONVERTED: "COMPLETED", LOST: "INACTIVE",
    };
    const category = data.client_type
      ? [clientTypeToCategory[data.client_type] ?? "BUYER"]
      : ["BUYER"];
    const status = data.client_status
      ? clientStatusMap[data.client_status] ?? "LEAD"
      : "LEAD";
    const billingFields = [
      data.billing_street, data.billing_city, data.billing_postal_code,
    ].some(Boolean);
    const addresses = billingFields
      ? [{ type: "billing" as const, street: data.billing_street || undefined, city: data.billing_city || undefined, postalCode: data.billing_postal_code || undefined, municipality: data.billing_municipality || undefined, country: data.billing_country || "GR" }]
      : undefined;

    try {
      const clientResponse = await axios.post("/api/crm/contacts", {
        displayName: data.client_name,
        email: data.primary_email || undefined,
        officePhone: data.office_phone || undefined,
        category,
        status,
        companyId: data.company_id || undefined,
        taxId: data.vat || undefined,
        addresses,
        notes: data.description || undefined,
        assignedAgentId: data.assigned_to,
      });

      const clientId = clientResponse.data.data.id;

      // Link properties if any are selected
      if (data.propertyIds && data.propertyIds.length > 0) {
        await axios.post(`/api/crm/contacts/${clientId}/link-properties`, {
          propertyIds: data.propertyIds,
        });
      }

      toast.success("success", { description: t("accounts.form.toast.createSuccess") });
      form.reset();
      router.refresh();
      onFinish();
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data || error?.message || t("accounts.form.toast.genericError");
      toast.error("error", { description: typeof errorMessage === 'string' ? errorMessage : String(errorMessage) });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
  return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.clientName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.clientName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.email")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="email" placeholder={t("accounts.form.placeholders.email")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="office_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.phone")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.phone")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.clientType")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("accounts.form.placeholders.selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="client_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.status")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "LEAD"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("accounts.form.placeholders.selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientStatusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.companyId")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.companyId")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.vatNumber")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.vatNumber")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.website")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="url" placeholder={t("accounts.form.placeholders.website")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.fax")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.fax")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="billing_street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.streetAddress")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.streetAddress")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <AddressFieldGroup
              control={form.control}
              countryFieldName="billing_country"
              municipalityFieldName="billing_municipality"
              areaFieldName="billing_area"
              postalCodeFieldName="billing_postal_code"
              defaultCountry="GR"
              disabled={isLoading}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              {t("accounts.form.properties.instructions")}
            </div>
            {loadingProperties ? (
              <div className="text-sm text-muted-foreground">{t("accounts.form.properties.loading")}</div>
            ) : properties.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("accounts.form.properties.none")}</div>
            ) : (
              <FormField
                control={form.control}
                name="propertyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.form.labels.selectProperties")}</FormLabel>
                    <FormControl>
                      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
                        {properties.map((property) => (
                          <div key={property.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`property-${property.id}`}
                              checked={field.value?.includes(property.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, property.id]);
                                } else {
                                  field.onChange(currentValues.filter((id) => id !== property.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`property-${property.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div className="font-medium">{property.property_name}</div>
                              {property.address_street && (
                                <div className="text-xs text-muted-foreground">
                                  {property.address_street}
                                  {property.address_city && `, ${property.address_city}`}
                                  {property.address_state && ` ${property.address_state}`}
                                </div>
                              )}
                              {property.price && (
                                <div className="text-xs text-muted-foreground">
                                  ${property.price.toLocaleString()}
                                </div>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.description")}</FormLabel>
                  <FormControl>
                    <Textarea disabled={isLoading} placeholder={t("accounts.form.placeholders.description")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.assignedTo")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("accounts.form.placeholders.assignUser")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
              name="member_of"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.form.labels.memberOf")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("accounts.form.placeholders.memberOf")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div className="w-full max-w-[800px] text-sm">
          {/* Step Indicator */}
          <div className="pb-6">
            <div className="flex items-start justify-between mb-4 relative">
              {/* Connecting lines container - behind icons */}
              <div className="absolute top-4 left-0 right-0 h-0.5 pointer-events-none z-0">
                <div className="flex w-full" style={{ 
                  paddingLeft: 'calc(1rem + 16px)', // Start from center of first icon (1rem margin + half icon width)
                  paddingRight: 'calc(1rem + 16px)'  // End at center of last icon
                }}>
                  {STEPS.slice(0, -1).map((_, index) => {
                    const stepIndex = index;
                    const isCompleted = currentStep > stepIndex + 1;
                    return (
                      <div
                        key={`line-${stepIndex}`}
                        className={`h-0.5 flex-1 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Steps container - on top */}
              <div className="flex items-start justify-between w-full relative z-10">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    {/* Icon circle - solid background to hide line behind */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 ${
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.id ? "✓" : step.id}
                    </div>
                    {/* Label */}
                    <div className="text-xs mt-2 text-center max-w-[120px] text-text-secondary">
                      {step.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              {t("accounts.form.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                {t("accounts.form.buttons.next")}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("accounts.form.buttons.creating") : t("accounts.form.buttons.create")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
