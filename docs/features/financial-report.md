# Financial Report Feature

## Overview

The Financial Report feature provides comprehensive revenue and commission analysis directly from the Dashboard's Total Revenue stat card. Users can view detailed financial insights and download reports in CSV or JSON format.

## Components

### 1. FinancialReportDialog Component

**Location:** `/components/dashboard/FinancialReportDialog.tsx`

A client-side dialog component that displays financial report data and provides download options.

**Features:**
- View financial summary with key metrics
- Monthly revenue breakdown
- Top performing agents
- Recent deals list
- Download reports in CSV or JSON format

**Props:**
```typescript
interface FinancialReportDialogProps {
  readonly trigger?: React.ReactNode;  // Custom trigger button
  readonly locale: string;              // Locale for formatting
}
```

**Usage:**
```tsx
import { FinancialReportDialog } from "@/components/dashboard/FinancialReportDialog";

<FinancialReportDialog locale="en" />
```

### 2. StatsCard Enhancement

**Location:** `/components/ui/stats-card.tsx`

Enhanced the StatsCard component to support custom action buttons via the `customActions` prop.

**New Prop:**
```typescript
customActions?: React.ReactNode;  // Custom actions to render in the action area
```

This allows any stat card to have custom buttons instead of the default view/add buttons.

## Server Actions

### generateFinancialReport

**Location:** `/actions/dashboard/generate-financial-report.ts`

Server action that generates comprehensive financial report data.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  data?: {
    summary: {
      totalRevenue: number;
      totalDeals: number;
      averageCommission: number;
      yearToDateRevenue: number;
      yearToDateDeals: number;
      currentQuarterRevenue: number;
      quarterGrowth: number;
    };
    monthlyBreakdown: Array<{
      month: string;
      revenue: number;
      deals: number;
      avgCommission: number;
    }>;
    topAgents: Array<{
      name: string;
      email: string;
      revenue: number;
      deals: number;
    }>;
    recentDeals: Array<{
      id: string;
      propertyTitle: string;
      propertyAddress: string;
      clientName: string;
      agentName: string;
      commission: number;
      salePrice: number;
      closedAt: Date | null;
      dealType: string | null;
    }>;
    generatedAt: string;
  };
}
```

**Permissions:**
Requires `report:view` permission to access financial data.

## API Routes

### GET /api/dashboard/financial-report

**Location:** `/app/api/dashboard/financial-report/route.ts`

Downloads financial report in CSV or JSON format.

**Query Parameters:**
- `format`: `"csv"` | `"json"` (default: `"csv"`)

**Response:**
- CSV format: Structured CSV file with sections for summary, monthly breakdown, top agents, and recent deals
- JSON format: Raw JSON data from `generateFinancialReport`

**Example:**
```bash
# Download CSV
GET /api/dashboard/financial-report?format=csv

# Download JSON
GET /api/dashboard/financial-report?format=json
```

## Integration

### Dashboard Integration

**Location:** `/app/[locale]/app/(routes)/page.tsx`

The Total Revenue stat card now includes the Financial Report dialog when revenue is greater than zero:

```tsx
<StatsCard
  title={dict.dashboard.totalRevenue}
  value={`€${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
  icon={<DollarSignIcon className="h-4 w-4" />}
  trend={revenueTrend.value > 0 ? `${revenueTrend.direction === "up" ? "+" : "-"}${revenueTrend.value.toFixed(1)}%` : undefined}
  trendUp={revenueTrend.direction === "up"}
  description={dict.dashboard.fromLastMonth}
  emptyMessage={dict.dashboard.noRevenueYet}
  customActions={
    !totalRevenue || totalRevenue === 0 ? undefined : (
      <FinancialReportDialog locale={locale} />
    )
  }
/>
```

## Translations

### English (`locales/en/dashboard.json`)
```json
{
  "financialReport": "Financial Report",
  "viewReport": "View",
  "downloadReport": "Download"
}
```

### Greek (`locales/el/dashboard.json`)
```json
{
  "financialReport": "Οικονομική Αναφορά",
  "viewReport": "Προβολή",
  "downloadReport": "Λήψη"
}
```

## CSV Report Structure

The CSV report is organized into sections:

1. **Summary Section**
   - Total Revenue
   - Total Deals
   - Average Commission
   - Year-to-Date Revenue
   - Year-to-Date Deals
   - Current Quarter Revenue
   - Quarter Growth

2. **Monthly Breakdown**
   - Month, Revenue, Deals, Average Commission

3. **Top Performing Agents**
   - Agent Name, Email, Revenue, Deals

4. **Recent Deals**
   - Property, Address, Client, Agent, Commission, Sale Price, Closed Date, Deal Type

## Data Sources

The financial report aggregates data from:
- **Deals table**: Completed deals with commission data
- **Properties table**: Property details and sale prices
- **Clients table**: Client information
- **Users table**: Agent information

## Permissions

Users must have the `report:view` permission to:
- Generate financial reports
- View report data
- Download reports

## Future Enhancements

Potential improvements:
1. PDF export with charts and graphs
2. Date range filters
3. Agent-specific reports
4. Property type breakdown
5. Commission rate analysis
6. Comparison with previous periods
7. Email report scheduling
8. Custom report templates

## Testing

To test the feature:

1. Ensure you have completed deals in the database
2. Navigate to the Dashboard
3. Look for the Total Revenue stat card
4. Click "View Report" to see the financial summary
5. Click "Download" to download the CSV report
6. Verify the CSV contains all sections with correct data

## Troubleshooting

**Issue: "You don't have permission to view financial reports"**
- Solution: Ensure your user has the `report:view` permission

**Issue: Report shows no data**
- Solution: Verify there are completed deals in the database with `status: "COMPLETED"`

**Issue: Download fails**
- Solution: Check browser console for errors and verify the API route is accessible
