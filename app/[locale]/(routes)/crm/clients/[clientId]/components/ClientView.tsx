"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UpdateAccountForm } from "../../../accounts/components/UpdateAccountForm";

export default function ClientView({ data }: { data: any }) {
  const [open, setOpen] = useState(false);

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground break-all">{value ?? "N/A"}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle>{data.client_name}</CardTitle>
        </div>
        <div>
          <Sheet open={open} onOpenChange={() => setOpen(false)}>
            <Button onClick={() => setOpen(true)}>Edit</Button>
            <SheetContent className="min-w-[900px] space-y-2">
              <SheetHeader>
                <SheetTitle>Edit Client</SheetTitle>
              </SheetHeader>
              <div className="h-full overflow-y-auto p-2">
                <UpdateAccountForm
                  initialData={{
                    id: data.id,
                    v: data.v ?? 0,
                    name: data.client_name,
                    office_phone: data.office_phone ?? "",
                    website: data.website ?? "",
                    fax: data.fax ?? "",
                    company_id: data.company_id ?? "",
                    vat: data.vat ?? "",
                    email: data.primary_email ?? "",
                    billing_street: data.billing_street ?? "",
                    billing_postal_code: data.billing_postal_code ?? "",
                    billing_city: data.billing_city ?? "",
                    billing_state: data.billing_state ?? "",
                    billing_country: data.billing_country ?? "",
                    shipping_street: data.shipping_street ?? "",
                    shipping_postal_code: data.shipping_postal_code ?? "",
                    shipping_city: data.shipping_city ?? "",
                    shipping_state: data.shipping_state ?? "",
                    shipping_country: data.shipping_country ?? "",
                    description: data.description ?? "",
                    assigned_to: data.assigned_to ?? "",
                    status: data.client_status ?? "",
                    annual_revenue: data.annual_revenue ?? "",
                    member_of: data.member_of ?? "",
                    industry: data.industry ?? "",
                  }}
                  open={setOpen}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <Row label="Email" value={data.primary_email} />
          <Row label="Phone" value={data.office_phone} />
          <Row label="Type" value={data.client_type} />
          <Row label="Status" value={data.client_status} />
          <Row label="Assigned to" value={data.assigned_to_user?.name} />
          <Row label="Created" value={new Date(data.createdAt).toLocaleString()} />
          <Row label="Updated" value={data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "N/A"} />
        </div>
        <div>
          <Row label="Description" value={data.description} />
          <Row label="Property preferences" value={data.property_preferences ? JSON.stringify(data.property_preferences) : "N/A"} />
          <Row label="Communication notes" value={data.communication_notes ? JSON.stringify(data.communication_notes) : "N/A"} />
          <Row label="Billing address" value={[data.billing_street, data.billing_city, data.billing_state, data.billing_postal_code, data.billing_country].filter(Boolean).join(", ")} />
          <Row label="Shipping address" value={[data.shipping_street, data.shipping_city, data.shipping_state, data.shipping_postal_code, data.shipping_country].filter(Boolean).join(", ")} />
          <Row label="Website" value={data.website} />
          <Row label="VAT" value={data.vat} />
        </div>
      </CardContent>
    </Card>
  );
}


