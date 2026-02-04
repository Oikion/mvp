"use client";

import { MetricCard, MetricCardGroup } from "@/components/reports";
import { LineChart } from "@/components/reports/LineChart";
import { BarChartDemo } from "@/components/tremor/BarChart";
import { StatsChart } from "../../components/dashboard/StatsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, PieChart } from "lucide-react";

interface LeadMetricsTabProps {
  data: {
    conversionRate: { rate: number; converted: number; total: number };
    conversionTrend: Array<{ name: string; rate: number; converted: number; total: number }>;
    costPerLead: { costPerLead: number; totalSpend: number; totalLeads: number };
    leadSources: Array<{ name: string; value: number; percentage: number }>;
    leadSourcesWithConversion: Array<{ name: string; total: number; converted: number; conversionRate: number }>;
    pipelineValue: { total: number; byStatus: Array<{ status: string; value: number; count: number }>; dealCount: number };
    pipelineTrend: Array<{ name: string; pipeline: number; closed: number }>;
  };
  dict: Record<string, any>;
}

export function LeadMetricsTab({ data, dict }: LeadMetricsTabProps) {
  const t = dict.reports?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <MetricCardGroup columns={4}>
        <MetricCard
          title={t.leadConversionRate || "Lead Conversion Rate"}
          value={data.conversionRate.rate}
          suffix="%"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description={`${data.conversionRate.converted} of ${data.conversionRate.total} leads converted`}
          helpText="Percentage of leads that become clients. Top agents often hit 10-20%+"
          benchmark="Top agents: 10-20%"
          trend={data.conversionTrend.length >= 2 ? {
            value: data.conversionTrend[data.conversionTrend.length - 1]?.rate - data.conversionTrend[data.conversionTrend.length - 2]?.rate || 0,
            direction: (data.conversionTrend[data.conversionTrend.length - 1]?.rate || 0) >= (data.conversionTrend[data.conversionTrend.length - 2]?.rate || 0) ? "up" : "down",
            label: "vs last month",
          } : undefined}
        />
        <MetricCard
          title={t.costPerLead || "Cost Per Lead"}
          value={data.costPerLead.costPerLead}
          prefix="€"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          description={`€${data.costPerLead.totalSpend.toLocaleString()} spent on ${data.costPerLead.totalLeads} leads`}
          helpText="Marketing spend divided by number of leads generated"
        />
        <MetricCard
          title={t.totalLeads || "Total Leads"}
          value={data.conversionRate.total}
          icon={<Users className="h-4 w-4 text-primary" />}
          description="All-time leads in your database"
        />
        <MetricCard
          title={t.pipelineValue || "Pipeline Value"}
          value={data.pipelineValue.total}
          prefix="€"
          icon={<PieChart className="h-4 w-4 text-primary" />}
          description={`${data.pipelineValue.dealCount} active deals`}
          helpText="Total potential commission from active prospects and pending deals"
        />
      </MetricCardGroup>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lead Conversion Trend */}
        {data.conversionTrend.length > 0 && (
          <LineChart
            title={t.conversionTrend || "Conversion Rate Trend"}
            description="Monthly lead conversion rate"
            data={data.conversionTrend}
            xAxisKey="name"
            lines={[
              { dataKey: "rate", label: "Conversion Rate (%)", color: "hsl(var(--chart-1))" },
            ]}
            height={250}
            valueFormatter={(v) => `${v}%`}
          />
        )}

        {/* Lead Sources Distribution */}
        {data.leadSources.length > 0 && (
          <StatsChart
            title={t.leadSources || "Lead Sources"}
            description="Distribution of leads by source"
            data={data.leadSources}
          />
        )}
      </div>

      {/* Lead Sources with Conversion */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.leadSourcesWithConversion.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.sourceConversion || "Source Conversion Rates"}</CardTitle>
              <CardDescription>Which sources produce the best clients</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.leadSourcesWithConversion.map((s) => ({
                  name: s.name,
                  Number: s.conversionRate,
                }))}
                title=""
              />
            </CardContent>
          </Card>
        )}

        {/* Pipeline by Status */}
        {data.pipelineValue.byStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.pipelineByStatus || "Pipeline by Status"}</CardTitle>
              <CardDescription>Deal value distribution by stage</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartDemo
                chartData={data.pipelineValue.byStatus.map((s) => ({
                  name: s.status,
                  Number: s.value,
                }))}
                title=""
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pipeline Trend */}
      {data.pipelineTrend.length > 0 && (
        <LineChart
          title={t.pipelineTrend || "Pipeline Value Trend"}
          description="Monthly pipeline vs closed deals"
          data={data.pipelineTrend}
          xAxisKey="name"
          lines={[
            { dataKey: "pipeline", label: "Pipeline", color: "hsl(var(--chart-1))" },
            { dataKey: "closed", label: "Closed", color: "hsl(var(--chart-2))" },
          ]}
          height={250}
        />
      )}
    </div>
  );
}
