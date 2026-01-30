"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

const clientTypeOptions = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "RENTER", label: "Renter" },
  { value: "INVESTOR", label: "Investor" },
  { value: "REFERRAL_PARTNER", label: "Referral Partner" },
];

const clientStatusOptions = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

const formSchema = z.object({
  // Step 1: Basic Information
  client_name: z.string().min(2, "Client name must be at least 2 characters"),
  primary_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  office_phone: z.string().optional().or(z.literal("")),
  client_type: z.string().optional().nullable(),
  client_status: z.string().optional().nullable(),
  
  // Step 2: Company Details
  company_id: z.string().optional().or(z.literal("")),
  vat: z.string().optional().or(z.literal("")),
  website: z.union([z.string().url("Invalid URL"), z.literal(""), z.undefined()]).optional(),
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
    message: "Email or phone number is required",
  }
);

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Basic Information", description: "Client name, contact details, type and status" },
  { id: 2, title: "Company Details", description: "Company ID, VAT, website and fax" },
  { id: 3, title: "Billing Address", description: "Billing address information" },
  { id: 4, title: "Properties", description: "Link properties to this client" },
  { id: 5, title: "Additional Information", description: "Description, assignment and other details" },
];

export function NewAccountForm({ industries, users, onFinish }: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    try {
      // Create the client first
      const clientResponse = await axios.post("/api/crm/clients", {
        client_name: data.client_name,
        primary_email: data.primary_email || undefined,
        office_phone: data.office_phone || undefined,
        client_type: data.client_type || undefined,
        client_status: data.client_status || "LEAD",
        company_id: data.company_id || undefined,
        vat: data.vat || undefined,
        website: data.website && data.website.length > 0 ? data.website : undefined,
        fax: data.fax || undefined,
        billing_street: data.billing_street || undefined,
        billing_city: data.billing_city || undefined,
        billing_state: data.billing_state || undefined,
        billing_postal_code: data.billing_postal_code || undefined,
        billing_country: data.billing_country || undefined,
        description: data.description || undefined,
        assigned_to: data.assigned_to,
        member_of: data.member_of || undefined,
      });

      const clientId = clientResponse.data.newClient.id;

      // Link properties if any are selected
      if (data.propertyIds && data.propertyIds.length > 0) {
        await axios.post("/api/crm/clients/link-properties", {
          clientId,
          propertyIds: data.propertyIds,
        });
      }

      toast.success("Success", { description: "Client created successfully", isTranslationKey: false });
      form.reset();
      router.refresh();
      onFinish();
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data || error?.message || "Something went wrong. Please try again.";
      toast.error("Error", { description: typeof, isTranslationKey: false });
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
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="John Doe or Company Name" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="email" placeholder="john@domain.com" {...field} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="+1 555 123 4567" {...field} />
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
                    <FormLabel>Client Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "LEAD"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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
                  <FormLabel>Company ID</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Company registration number" {...field} />
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
                  <FormLabel>VAT Number</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="VAT/Tax ID" {...field} />
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
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="url" placeholder="https://example.com" {...field} />
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
                    <FormLabel>Fax</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="+1 555 123 4567" {...field} />
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
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="123 Main Street" {...field} />
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
              Select properties to link to this client. You can link properties later as well.
            </div>
            {loadingProperties ? (
              <div className="text-sm text-muted-foreground">Loading properties...</div>
            ) : properties.length === 0 ? (
              <div className="text-sm text-muted-foreground">No properties available. Create properties first.</div>
            ) : (
              <FormField
                control={form.control}
                name="propertyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Properties</FormLabel>
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
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea disabled={isLoading} placeholder="Additional notes about the client" {...field} />
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
                  <FormLabel>Assigned to *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to assign the client" />
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
                  <FormLabel>Member Of</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Parent organization or group" {...field} />
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
              Previous
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Client"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
