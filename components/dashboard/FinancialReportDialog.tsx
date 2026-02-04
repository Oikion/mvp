"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, TrendingUp, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { generateFinancialReport } from "@/actions/dashboard/generate-financial-report";
import { toast } from "sonner";

interface FinancialReportDialogProps {
  readonly trigger?: React.ReactNode;
  readonly locale: string;
}

export function FinancialReportDialog({
  trigger,
  locale,
}: FinancialReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleViewReport = async () => {
    setLoading(true);
    try {
      const result = await generateFinancialReport();
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        toast.error(result.error || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: "csv" | "json" = "csv") => {
    try {
      toast.loading("Generating report...");
      const response = await fetch(
        `/api/dashboard/financial-report?format=${format}`
      );

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();

      toast.dismiss();
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.dismiss();
      toast.error("Failed to download report");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1);
    return date.toLocaleString(locale, { month: "short", year: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleViewReport}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Report
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload("csv");
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Financial Report
          </DialogTitle>
          <DialogDescription>
            Comprehensive revenue and commission analysis
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!loading && !reportData && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Click "View Report" to generate your financial report
            </p>
            <Button onClick={handleViewReport}>
              <Eye className="h-4 w-4 mr-2" />
              View Report
            </Button>
          </div>
        )}

        {!loading && reportData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.totalDeals} deals closed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Year to Date
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reportData.summary.yearToDateRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.yearToDateDeals} deals this year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Commission
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reportData.summary.averageCommission)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.summary.quarterGrowth > 0 ? "+" : ""}
                    {reportData.summary.quarterGrowth.toFixed(1)}% this quarter
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Monthly Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
              <div className="space-y-2">
                {reportData.monthlyBreakdown.slice(0, 6).map((month: any) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{formatMonth(month.month)}</p>
                      <p className="text-sm text-muted-foreground">
                        {month.deals} deals
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(month.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(month.avgCommission)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Top Agents */}
            {reportData.topAgents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Performing Agents
                </h3>
                <div className="space-y-2">
                  {reportData.topAgents.slice(0, 5).map((agent: any, index: number) => (
                    <div
                      key={agent.email}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {agent.deals} deals
                          </p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(agent.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Download Actions */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Generated on{" "}
                {new Date(reportData.generatedAt).toLocaleString(locale)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload("json")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  JSON
                </Button>
                <Button size="sm" onClick={() => handleDownload("csv")}>
                  <Download className="h-3 w-3 mr-1" />
                  Download CSV
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
