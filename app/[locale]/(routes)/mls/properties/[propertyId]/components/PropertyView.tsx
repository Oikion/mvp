"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditPropertyForm } from "./EditPropertyForm";
import { CreateBookingButton } from "@/components/calendar/CreateBookingButton";

export default function PropertyView({ data }: { data: any }) {
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
          <CardTitle>{data.property_name}</CardTitle>
        </div>
        <div className="flex gap-2">
          <CreateBookingButton
            propertyId={data.id}
            eventType="property-viewing"
            prefilledData={{
              notes: `Property: ${data.property_name}${data.address_street ? ` - ${data.address_street}` : ''}`,
            }}
          />
          <Sheet open={open} onOpenChange={() => setOpen(false)}>
            <Button onClick={() => setOpen(true)}>Edit</Button>
            <SheetContent className="min-w-[900px] space-y-2">
              <SheetHeader>
                <SheetTitle>Edit Property</SheetTitle>
              </SheetHeader>
              <div className="h-full overflow-y-auto p-2">
                <EditPropertyForm initialData={data} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <Row label="Type" value={data.property_type} />
          <Row label="Status" value={data.property_status} />
          <Row label="Assigned to" value={data.assigned_to_user?.name} />
          <Row label="Price" value={data.price} />
          <Row label="Bedrooms" value={data.bedrooms} />
          <Row label="Bathrooms" value={data.bathrooms} />
          <Row label="Square feet" value={data.square_feet} />
          <Row label="Lot size" value={data.lot_size} />
          <Row label="Year built" value={data.year_built} />
          <Row label="Created" value={new Date(data.createdAt).toLocaleString()} />
          <Row label="Updated" value={data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "N/A"} />
        </div>
        <div>
          <Row label="Description" value={data.description} />
          <Row label="Address" value={[data.address_street, data.address_city, data.address_state, data.address_zip].filter(Boolean).join(", ")} />
          <Row label="Preferences" value={data.property_preferences ? JSON.stringify(data.property_preferences) : "N/A"} />
          <Row label="Notes" value={data.communication_notes ? JSON.stringify(data.communication_notes) : "N/A"} />
        </div>
      </CardContent>
    </Card>
  );
}


