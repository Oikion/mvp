# Outdated Files and References Analysis

## Executive Summary

This codebase has been migrated from a generic CRM to a Real Estate CRM. Several legacy models have been removed from the Prisma schema, but many files still reference them, causing potential runtime errors. Additionally, model names have changed (e.g., `crm_Accounts` → `Clients`, `crm_Contacts` → `Client_Contacts`).

## Removed Prisma Models (Confirmed in schema.prisma)

The following models have been removed and are no longer in the database:
- `crm_Leads` (line 76: "Removed legacy crm_ Leads and related enums")
- `crm_Contracts` (line 124: "Removed legacy crm_Contracts and related enum")
- `crm_Opportunities` (line 78: "Removed legacy Opportunities and Campaigns related models and enums")
- `crm_Opportunities_Type`
- `crm_Opportunities_Sales_Stages`
- `crm_campaigns`
- `crm_Industry_Type`
- `crm_Accounts` → **Renamed to** `Clients`
- `crm_Contacts` → **Renamed to** `Client_Contacts`

---

## Critical Issues: Files That Will Cause Runtime Errors

### 1. API Routes Referencing Non-Existent Models

#### Leads API Routes
- **`app/api/crm/leads/route.ts`**
  - Lines 38, 124: Uses `prismadb.crm_Leads.create()` and `crm_Leads.update()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor to use Clients model

- **`app/api/crm/leads/[leadId]/route.ts`**
  - Uses `prismadb.crm_Leads.delete()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

- **`app/api/crm/leads/create-lead-from-web/route.ts`**
  - Uses `prismadb.crm_Leads.create()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

#### Contracts API Routes
- **`actions/crm/contracts/create-new-contract/index.ts`**
  - Line 52: Uses `prismadb.crm_Contracts.create()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

- **`actions/crm/contracts/update-contract/index.ts`**
  - Uses `prismadb.crm_Contracts.update()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

- **`actions/crm/contracts/delete-contract/index.ts`**
  - Uses `prismadb.crm_Contracts.delete()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

#### Opportunities API Routes
- **`app/api/crm/opportunity/route.ts`**
  - Lines 38, 123: Uses `prismadb.crm_Opportunities.create()` and `update()`
  - Lines 184-191: Uses `crm_Accounts`, `crm_Contacts`, `crm_Opportunities_Type`, `crm_Opportunities_Sales_Stages`, `crm_campaigns`, `crm_Industry_Type`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

- **`app/api/crm/opportunity/[opportunityId]/route.ts`**
  - Uses `prismadb.crm_Opportunities.update()` and `delete()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

### 2. Actions Referencing Non-Existent Models

#### Leads Actions
- **`actions/crm/get-leads.ts`**
  - Line 4: Uses `prismadb.crm_Leads.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return empty array (like `get-opportunities.ts`)

- **`actions/crm/get-leads-by-accountId.ts`**
  - Uses `prismadb.crm_Leads.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return empty array

- **`actions/crm/get-lead.ts`**
  - Uses `prismadb.crm_Leads.findFirst()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return null

#### Contracts Actions
- **`actions/crm/get-contracts.ts`**
  - Lines 6, 27: Uses `prismadb.crm_Contracts.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return empty array (like `get-opportunities.ts`)

- **`actions/crm/get-contracts-by-accountId.ts`** (if exists)
  - **Status**: Check if exists and update

#### Opportunities Actions
- **`actions/crm/get-opportunity.ts`**
  - Uses `prismadb.crm_Opportunities.findFirst()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return null

- **`actions/crm/get-opportunities-with-includes.ts`**
  - Line 4: Comment says "Opportunities removed" but may still have code
  - **Status**: Check implementation

- **`actions/crm/get-opportunities-with-includes-by-accountId.ts`**
  - Uses `prismadb.crm_Opportunities.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return empty array

- **`actions/crm/get-opportunities-with-includes-by-contactId.ts`**
  - Uses `prismadb.crm_Opportunities.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Update to return empty array

- **`actions/crm/opportunity/dashboard/set-inactive.ts`**
  - Uses `prismadb.crm_Opportunities.update()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or refactor

- **`actions/crm/opportunity/get-expected-revenue.ts`**
  - Line 4: Comment says "Opportunities removed" but may still have code
  - **Status**: Check implementation

#### Legacy Model References
- **`actions/crm/get-sales-type.ts`**
  - Uses `prismadb.crm_Opportunities_Type.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or return empty array

- **`actions/crm/get-sales-stage.ts`**
  - Uses `prismadb.crm_Opportunities_Sales_Stages.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or return empty array

- **`actions/crm/get-industries.ts`**
  - Uses `prismadb.crm_Industry_Type.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or return empty array

- **`actions/crm/get-campaigns.ts`**
  - Uses `prismadb.crm_campaigns.findMany()`
  - **Status**: Will cause runtime errors
  - **Action**: Remove or return empty array

### 3. Outdated Model Name References

#### Files Using `crm_Accounts` (should be `Clients`)
- `actions/crm/get-account.ts` - Line 4
- `app/api/crm/account/route.ts` - Lines 40, 113, 160
- `app/api/fulltext-search/route.ts` - Line 32
- `app/api/crm/opportunity/route.ts` - Line 184
- `actions/fulltext/get-search-results.ts` - Line 18
- `actions/crm/get-accounts-by-opportunityId.ts` - Line 4
- `actions/crm/get-accounts-by-contactId.ts` - Line 4
- `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx` - Line 40
- `app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx` - Line 8
- `app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx` - Line 8
- `app/[locale]/(routes)/crm/accounts/[accountId]/components/TasksView.tsx` - Line 6
- `app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx` - Line 35

#### Files Using `crm_Contacts` (should be `Client_Contacts`)
- `actions/crm/get-contacts-by-accountId.ts` - Line 4 (but uses correct field `clientsIDs`)
- `app/api/crm/contacts/route.ts` - Lines 46, 160
- `app/api/crm/contacts/create-from-remote/route.ts` - Line 32
- `app/api/crm/contacts/[contactId]/route.ts` - Line 21
- `app/api/crm/contacts/unlink-opportunity/[contactId]/route.ts` - Line 30
- `app/api/fulltext-search/route.ts` - Line 44
- `app/api/crm/opportunity/route.ts` - Line 185
- `actions/fulltext/get-search-results.ts` - Line 30
- `actions/crm/get-contacts-by-opportunityId.ts` - Line 4
- `actions/crm/get-contact.ts` - Line 4
- `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx` - Line 41

---

## Unused Component Files (No Routes Exist)

### Leads Components (No `page.tsx` exists)
All files in `app/[locale]/(routes)/crm/leads/` are unused:
- `app/[locale]/(routes)/crm/leads/table-data/schema.tsx`
- `app/[locale]/(routes)/crm/leads/table-data/data.tsx`
- `app/[locale]/(routes)/crm/leads/table-components/*.tsx` (9 files)
- `app/[locale]/(routes)/crm/leads/components/UpdateLeadForm.tsx`
- `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx`
- `app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx`

**Note**: `app/[locale]/(routes)/crm/components/LeadsView.tsx` exists but is not imported anywhere.

### Contracts Components (No `page.tsx` exists)
All files in `app/[locale]/(routes)/crm/contracts/` are unused:
- `app/[locale]/(routes)/crm/contracts/table-data/schema.tsx`
- `app/[locale]/(routes)/crm/contracts/table-data/data.tsx`
- `app/[locale]/(routes)/crm/contracts/table-components/*.tsx` (9 files)
- `app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx`
- `app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx`

**Note**: `app/[locale]/(routes)/crm/components/ContractsView.tsx` exists but is not imported anywhere.

### Opportunities Components (No `page.tsx` exists)
All files in `app/[locale]/(routes)/crm/opportunities/` are unused:
- `app/[locale]/(routes)/crm/opportunities/table-data/schema.tsx`
- `app/[locale]/(routes)/crm/opportunities/table-data/data.tsx`
- `app/[locale]/(routes)/crm/opportunities/table-components/*.tsx` (9 files)
- `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`
- `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`
- `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx`

**Note**: `app/[locale]/(routes)/crm/components/OpportunitiesView.tsx` exists but is not imported anywhere.

---

## Outdated References in Active Code

### Dashboard Page
- **`app/[locale]/(routes)/page.tsx`**
  - Line 144: Links to `/crm/opportunities` (route doesn't exist)
  - Lines 30, 35, 38: Imports `getLeadsCount`, `getContractsCount`, `getOpportunitiesCount` (these return 0, but still referenced)
  - **Status**: Link will 404, imports are safe but unnecessary

### Reports Page
- **`app/[locale]/(routes)/reports/page.tsx`**
  - Lines 13-15: Imports `getOpportunitiesByMonth`, `getOpportunitiesByStage` (these return empty arrays)
  - Lines 25-26: Uses these functions
  - **Status**: Safe but will show empty data

### CRM Dashboard Kanban
- **`app/[locale]/(routes)/crm/dashboard/_components/CRMKanban.tsx`**
  - Line 11: Imports `crm_Opportunities`, `crm_Opportunities_Sales_Stages` from Prisma
  - Line 29: Imports `NewOpportunityForm` from opportunities
  - Lines 39, 59, 65, 97, 115, 143, 188, 224, 344: Uses opportunities-related code
  - **Status**: Will cause TypeScript/runtime errors
  - **Action**: Component is commented out in dashboard page, but still has errors

### Other Component References
- **`app/[locale]/(routes)/crm/accounts/[accountId]/components/BasicView.tsx`**
  - Line 8: Imports `crm_Opportunities` (unused import)
  - **Status**: Safe but unnecessary

- **`app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx`**
  - Line 8: Imports `crm_Opportunities` (wrong type, should be `crm_Leads` if it existed)
  - **Status**: File is unused anyway

### Fulltext Search
- **`app/api/fulltext-search/route.ts`**
  - Line 21: Uses `prismadb.crm_Opportunities.findMany()`
  - Lines 32, 44: Uses `crm_Accounts` and `crm_Contacts`
  - **Status**: Will cause runtime errors
  - **Action**: Update to use correct models

- **`actions/fulltext/get-search-results.ts`**
  - Line 7: Uses `prismadb.crm_Opportunities.findMany()`
  - Lines 18, 30: Uses `crm_Accounts` and `crm_Contacts`
  - **Status**: Will cause runtime errors
  - **Action**: Update to use correct models

### Contact Unlink Route
- **`app/api/crm/contacts/unlink-opportunity/[contactId]/route.ts`**
  - Line 36: Uses `assigned_opportunities` field on `crm_Contacts`
  - **Status**: Field doesn't exist on `Client_Contacts`
  - **Action**: Remove or refactor

---

## Localization Files

- **`locales/en.json`**
  - Lines 11, 13, 14: Contains "opportunities", "leads", "contracts" translations
  - **Status**: Safe but unused

---

## Files That Have Been Updated Correctly

These files have been updated to return empty arrays/0:
- ✅ `actions/crm/get-opportunities.ts` - Returns empty arrays
- ✅ `actions/dashboard/get-leads-count.ts` - Returns 0
- ✅ `actions/dashboard/get-contracts-count.ts` - Returns 0
- ✅ `actions/dashboard/get-opportunities-count.ts` - Returns 0
- ✅ `actions/crm/get-opportunities-with-includes.ts` - Commented as removed

---

## Recommendations

### Priority 1: Fix Runtime Errors (Critical)
1. Update all API routes that use `crm_Leads`, `crm_Contracts`, `crm_Opportunities`
2. Update all actions that query these models
3. Update fulltext search to use correct model names
4. Fix `crm_Accounts` → `Clients` and `crm_Contacts` → `Client_Contacts` references

### Priority 2: Remove Unused Files
1. Delete all component files in `/crm/leads/`, `/crm/contracts/`, `/crm/opportunities/`
2. Delete unused view components (`LeadsView.tsx`, `ContractsView.tsx`, `OpportunitiesView.tsx`)
3. Remove unused action files (or update them to return empty arrays)

### Priority 3: Clean Up References
1. Remove outdated dashboard links
2. Clean up unused imports
3. Update navigation menus (already done correctly in `Crm.tsx`)
4. Remove unused localization keys

### Priority 4: Documentation
1. Update API documentation
2. Update README if it references these features

---

## Summary Statistics

- **Total files with outdated references**: ~50+
- **Files that will cause runtime errors**: ~25+
- **Unused component files**: ~38 files
- **API routes needing updates**: 8 routes
- **Actions needing updates**: 15+ actions

---

## Notes

- The navigation menu (`app/[locale]/(routes)/components/menu-items/Crm.tsx`) correctly only shows Dashboard and Clients - no leads, contracts, or opportunities links.
- The CRM dashboard page (`app/[locale]/(routes)/crm/dashboard/page.tsx`) has the CRMKanban component commented out, which is good since it references opportunities.
- Some files have comments indicating awareness of the removal (e.g., "Opportunities removed in Real Estate CRM"), but the code still exists.

