# Financial Reports

Revenue and commission analysis accessible from the Dashboard's Total Revenue stat card.

## Overview

The financial report feature provides:
- Summary metrics (total revenue, deal count, avg commission, YTD, quarter-over-quarter growth)
- Monthly revenue breakdown (last 12 months)
- Top 10 agents by revenue
- Last 20 completed deals with full details
- CSV and JSON download

The report buttons appear on the Total Revenue stat card only when `totalRevenue > 0`.

## Key Files

| File | Purpose |
|------|---------|
| `actions/dashboard/generate-financial-report.ts` | Server action — queries and aggregates data |
| `app/api/dashboard/financial-report/route.ts` | Download endpoint (`?format=csv\|json`) |
| `components/dashboard/FinancialReportDialog.tsx` | Dialog component with summary cards and download |
| `components/ui/stats-card.tsx` | Enhanced with `customActions` prop |
| `app/[locale]/app/(routes)/page.tsx` | Wires dialog into Total Revenue stat card |

## Permission

Requires `report:view` permission. Checked server-side in both the action and the API route.

## Server Action

```typescript
import { generateFinancialReport } from '@/actions/dashboard/generate-financial-report'

const result = await generateFinancialReport()
// result.data.summary       — totals, YTD, quarter growth
// result.data.monthlyBreakdown — array per month
// result.data.topAgents     — top 10 agents
// result.data.recentDeals   — last 20 completed deals
```

Return shape:

```typescript
{
  success: boolean
  error?: string
  data?: {
    summary: {
      totalRevenue: number
      totalDeals: number
      averageCommission: number
      yearToDateRevenue: number
      yearToDateDeals: number
      currentQuarterRevenue: number
      quarterGrowth: number
    }
    monthlyBreakdown: Array<{ month: string; revenue: number; deals: number; avgCommission: number }>
    topAgents: Array<{ name: string; email: string; revenue: number; deals: number }>
    recentDeals: Array<{
      id: string; propertyTitle: string; propertyAddress: string
      clientName: string; agentName: string
      commission: number; salePrice: number
      closedAt: Date | null; dealType: string | null
    }>
    generatedAt: string
  }
}
```

## Download API

```bash
GET /api/dashboard/financial-report?format=csv   # structured CSV (default)
GET /api/dashboard/financial-report?format=json  # raw JSON
```

CSV sections: Summary → Monthly Breakdown → Top Performing Agents → Recent Deals.

## Data Sources

Queries `Deal` (status `COMPLETED`) with `include: { property, client, assignedTo }`, filtered by `organizationId`. Aggregates totals and groups by month in-memory.

## Dashboard Integration

```tsx
// app/[locale]/app/(routes)/page.tsx
<StatsCard
  title={dict.dashboard.totalRevenue}
  value={`€${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
  customActions={
    totalRevenue > 0 ? <FinancialReportDialog locale={locale} /> : undefined
  }
/>
```

## Translation Keys

| Key | en | el |
|-----|----|----|
| `dashboard.financialReport` | Financial Report | Οικονομική Αναφορά |
| `dashboard.viewReport` | View | Προβολή |
| `dashboard.downloadReport` | Download | Λήψη |

## Planned Enhancements

- Date range filters
- PDF export with charts
- Agent-specific reports
- Email report scheduling
- Comparison with previous periods
