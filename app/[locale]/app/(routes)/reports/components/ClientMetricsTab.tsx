"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { StatsChart } from "../../components/dashboard/StatsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Repeat, Users, UserPlus } from "lucide-react";

interface ClientMetricsTabProps {
  data: {
    lifetimeValue: { average: number; total: number; clientCount: number };
    topClients: Array<{ id: string; name: string; value: number; deals: number }>;
    repeatRate: { rate: number; repeatClients: number; totalClients: number };
    repeatDistribution: Array<{ name: string; value: number }>;
    referralRate: { rate: number; referralDeals: number; totalDeals: number; referralValue: number; totalValue: number };
    sphere: { total: number; active: number; contacts: number; byStatus: Array<{ status: string; count: number }> };
    sphereGrowth: Array<{ name: string; added: number; total: number }>;
    engagement: { activeEngagements: number; pendingTasks: number; upcomingEvents: number };
  };
  dict: Record<string, any>;
}

export function ClientMetricsTab({ data, dict }: ClientMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.clientLifetimeValue || "Client Lifetime Value"}
          value={data.lifetimeValue.average}
          prefix="€"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          description={`Total: €${data.lifetimeValue.total.toLocaleString()} from ${data.lifetimeValue.clientCount} clients`}
          helpText="Total commission from a client over their entire relationship"
        />
        <MetricCard
          title={t.repeatClientRate || "Repeat Client Rate"}
          value={data.repeatRate.rate}
          suffix="%"
          icon={<Repeat className="h-4 w-4 text-primary" />}
          description={`${data.repeatRate.repeatClients} of ${data.repeatRate.totalClients} clients returned`}
          helpText="Percentage of past clients who return for future transactions"
        />
        <MetricCard
          title={t.referralRate || "Referral Rate"}
          value={data.referralRate.rate}
          suffix="%"
          icon={<UserPlus className="h-4 w-4 text-primary" />}
          description={`${data.referralRate.referralDeals} of ${data.referralRate.totalDeals} deals from referrals`}
          helpText="Top agents often see 50-80% referral rate"
          benchmark="Top agents: 50-80%"
        />
        <MetricCard
          title={t.sphereSize || "Sphere of Influence"}
          value={data.sphere.total}
          icon={<Users className="h-4 w-4 text-primary" />}
          description={`${data.sphere.active} active, ${data.sphere.contacts} contacts`}
          helpText="Number of meaningful contacts you regularly engage with"
        />
      </MetricCardGroup>

      {/* Repeat Clients and Referrals */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.repeatDistribution.length > 0 && (
          <StatsChart
            title={t.repeatDistribution || "Repeat Client Distribution"}
            description="Clients by number of transactions"
            data={data.repeatDistribution}
          />
        )}

        {/* Referral Value Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.referralValue || "Referral Value"}</CardTitle>
            <CardDescription>Commission earned from referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Referral Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  €{data.referralRate.referralValue.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  €{data.referralRate.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Referral Share</span>
                <span className="font-semibold">
                  {data.referralRate.totalValue > 0
                    ? Math.round((data.referralRate.referralValue / data.referralRate.totalValue) * 100)
                    : 0}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${data.referralRate.totalValue > 0
                      ? (data.referralRate.referralValue / data.referralRate.totalValue) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sphere Growth and Top Clients */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.sphereGrowth.length > 0 && (
          <LineChart
            title={t.sphereGrowth || "Sphere Growth"}
            description="Cumulative client network growth"
            data={data.sphereGrowth}
            xAxisKey="name"
            lines={[
              { dataKey: "total", label: "Total Clients", color: "hsl(var(--chart-1))" },
              { dataKey: "added", label: "New Clients", color: "hsl(var(--chart-2))", strokeDasharray: "5 5" },
            ]}
            height={250}
          />
        )}

        {data.topClients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.topClients || "Top Clients by Value"}</CardTitle>
              <CardDescription>Highest lifetime value clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topClients.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.deals} deal(s)</p>
                      </div>
                    </div>
                    <span className="font-semibold">€{client.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Client Engagement Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t.engagement || "Client Engagement"}</CardTitle>
          <CardDescription>Current engagement activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{data.engagement.activeEngagements}</p>
              <p className="text-sm text-muted-foreground">Active Engagements</p>
            </div>
            <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{data.engagement.pendingTasks}</p>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
            </div>
            <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{data.engagement.upcomingEvents}</p>
              <p className="text-sm text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
