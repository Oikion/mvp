import React from "react";
import Container from "../../components/ui/Container";
import { getProperties } from "@/actions/mls/get-properties";

export default async function MlsDashboardPage() {
  const props = await getProperties();
  const active = props.filter((p: any) => p.property_status === "ACTIVE").length;
  const pending = props.filter((p: any) => p.property_status === "PENDING").length;
  const sold = props.filter((p: any) => p.property_status === "SOLD").length;
  return (
    <Container title="MLS Dashboard" description="Overview of your properties">
      <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-semibold">{active}</div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-semibold">{pending}</div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Sold</div>
          <div className="text-2xl font-semibold">{sold}</div>
        </div>
      </div>
    </Container>
  );
}


