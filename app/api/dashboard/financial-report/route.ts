import { NextRequest, NextResponse } from "next/server";
import { generateFinancialReport } from "@/actions/dashboard/generate-financial-report";

/**
 * GET /api/dashboard/financial-report
 * Download financial report as CSV
 * Query params:
 *   - format: "csv" | "json" (default: "csv")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    const result = await generateFinancialReport();

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to generate report" },
        { status: 500 }
      );
    }

    const { data } = result;

    // Return JSON format
    if (format === "json") {
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": `attachment; filename="financial-report-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // Generate CSV format
    const csvLines: string[] = [
      "FINANCIAL REPORT SUMMARY",
      `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
      "",
      "Metric,Value",
      `Total Revenue,€${data.summary.totalRevenue.toFixed(2)}`,
      `Total Deals,${data.summary.totalDeals}`,
      `Average Commission,€${data.summary.averageCommission.toFixed(2)}`,
      `Year-to-Date Revenue,€${data.summary.yearToDateRevenue.toFixed(2)}`,
      `Year-to-Date Deals,${data.summary.yearToDateDeals}`,
      `Current Quarter Revenue,€${data.summary.currentQuarterRevenue.toFixed(2)}`,
      `Quarter Growth,${data.summary.quarterGrowth.toFixed(2)}%`,
      "",
      "MONTHLY BREAKDOWN",
      "Month,Revenue,Deals,Average Commission",
    ];

    // Add monthly breakdown
    data.monthlyBreakdown.forEach((month) => {
      csvLines.push(
        `${month.month},€${month.revenue.toFixed(2)},${month.deals},€${month.avgCommission.toFixed(2)}`
      );
    });

    csvLines.push("", "TOP PERFORMING AGENTS", "Agent Name,Email,Revenue,Deals");

    // Add top agents
    data.topAgents.forEach((agent) => {
      csvLines.push(
        `"${agent.name}","${agent.email}",€${agent.revenue.toFixed(2)},${agent.deals}`
      );
    });

    csvLines.push(
      "",
      "RECENT DEALS",
      "Property,Address,Client,Agent,Commission,Sale Price,Closed Date,Deal Type"
    );

    // Add recent deals
    data.recentDeals.forEach((deal) => {
      csvLines.push(
        `"${deal.propertyTitle}","${deal.propertyAddress}","${deal.clientName}","${deal.agentName}",€${deal.commission.toFixed(2)},€${deal.salePrice},${deal.closedAt ? new Date(deal.closedAt).toLocaleDateString() : "N/A"},"${deal.dealType || "N/A"}"`
      );
    });

    const csvContent = csvLines.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="financial-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating financial report:", error);
    return NextResponse.json(
      { error: "Failed to generate financial report" },
      { status: 500 }
    );
  }
}
