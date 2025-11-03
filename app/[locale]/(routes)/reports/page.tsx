import React from "react";
import Container from "../components/ui/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { Users, Building2 } from "lucide-react";
import { getDictionary } from "@/dictionaries";
import {
  getClientsCount,
  getClientsByStatus,
} from "@/actions/reports/get-clients-stats";
import {
  getPropertiesCount,
  getPropertiesByStatus,
} from "@/actions/reports/get-properties-stats";

const ReportsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  // Fetch all data in parallel for better performance
  const [
    clientsCount,
    clientsByStatus,
    propertiesCount,
    propertiesByStatus,
  ] = await Promise.all([
    getClientsCount(),
    getClientsByStatus(),
    getPropertiesCount(),
    getPropertiesByStatus(),
  ]);

  return (
    <Container
      title={dict.ModuleMenu.reports}
      description={dict.ReportsPage.description}
    >
      <div className="space-y-6 pt-5">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsCount}</div>
              <CardDescription className="text-xs mt-1">
                Clients in your organization
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertiesCount}</div>
              <CardDescription className="text-xs mt-1">
                Properties in your organization
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - 2 column layout */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {clientsByStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clients by Status</CardTitle>
                <CardDescription>Distribution of clients across different statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartDemo
                  chartData={clientsByStatus}
                  title="Clients by Status"
                />
              </CardContent>
            </Card>
          )}

          {propertiesByStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Properties by Status</CardTitle>
                <CardDescription>Distribution of properties across different statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartDemo
                  chartData={propertiesByStatus}
                  title="Properties by Status"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ReportsPage;
