# Calendar Foreign Key Constraint Fix

**Date:** 2026-02-01  
**Issue:** Foreign key constraint violation when creating/updating calendar events  
**Error Code:** P2003  
**Status:** ✅ Resolved

## Problem Description

When creating or updating calendar events, the API was throwing a foreign key constraint error:

```
Foreign key constraint violated on the constraint: `_DocumentsToCalendarEvents_A_fkey`
```

### Error Details

```
[PrismaClientKnownRequestError]: 
Invalid `prismadb.calendarEvent.create()` invocation
Foreign key constraint violated on the constraint: `_DocumentsToCalendarEvents_A_fkey`
code: 'P2003'
```

### Root Cause

The calendar event creation/update endpoints were attempting to connect related entities (Documents, Clients, Properties, Tasks) without validating that those IDs actually exist in the database. This caused Prisma to fail with a foreign key constraint violation when trying to establish relationships with non-existent records.

**Affected Endpoints:**
1. `POST /api/calendar/events` - Create calendar event
2. `PUT /api/calendar/events/[eventId]` - Update calendar event

## Technical Analysis

### Original Code (POST route)

```typescript
// Build relations using correct Prisma relation names
const relations: any = {};

if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
  relations.Documents = {
    connect: documentIds.map((id: string) => ({ id })),
  };
}
// ... similar code for Clients, Properties, Tasks
```

**Problem:** The code blindly attempts to connect entities without checking if they exist.

### Database Schema

```prisma
model CalendarEvent {
  id                 String               @id
  // ... other fields
  Documents          Documents[]          @relation("DocumentsToCalendarEvents")
  Clients            Clients[]            @relation("EventToClients")
  Properties         Properties[]         @relation("EventToProperties")
  crm_Accounts_Tasks crm_Accounts_Tasks[]
}
```

The many-to-many relationships require that all connected IDs exist in their respective tables and belong to the same organization.

## Solution Implemented

### 1. POST Route Fix (`/app/api/calendar/events/route.ts`)

Added validation to check that all entity IDs exist before attempting to connect them:

```typescript
// Build relations using correct Prisma relation names
// Validate that all IDs exist before attempting to connect them
const relations: any = {};

if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
  // Validate client IDs exist
  const validClients = await prismadb.clients.findMany({
    where: {
      id: { in: clientIds },
      organizationId,
    },
    select: { id: true },
  });
  
  if (validClients.length > 0) {
    relations.Clients = {
      connect: validClients.map((client) => ({ id: client.id })),
    };
  }
}

// Similar validation for Properties, Documents, and Tasks
```

**Key Improvements:**
- ✅ Validates entity IDs exist in database
- ✅ Ensures entities belong to the same organization
- ✅ Only connects valid IDs
- ✅ Silently ignores invalid IDs (graceful degradation)

### 2. PUT Route Fix (`/app/api/calendar/events/[eventId]/route.ts`)

Applied the same validation pattern with additional handling for empty arrays:

```typescript
if (documentIds !== undefined) {
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    // Validate document IDs exist
    const validDocuments = await prismadb.documents.findMany({
      where: {
        id: { in: documentIds },
        organizationId: currentOrgId,
      },
      select: { id: true },
    });
    
    connectDisconnect.Documents = {
      set: validDocuments.map((doc) => ({ id: doc.id })),
    };
  } else {
    // Clear all documents if empty array
    connectDisconnect.Documents = { set: [] };
  }
}
```

**Key Improvements:**
- ✅ Validates entity IDs exist in database
- ✅ Ensures entities belong to the same organization
- ✅ Handles empty arrays (clears relationships)
- ✅ Uses `set` instead of `connect` for updates (replaces all relationships)

## Validation Logic

### Entity Validation Process

For each entity type (Clients, Properties, Documents, Tasks):

1. **Check if IDs provided:** `if (entityIds && Array.isArray(entityIds) && entityIds.length > 0)`
2. **Query database for valid IDs:**
   ```typescript
   const validEntities = await prismadb.entityTable.findMany({
     where: {
       id: { in: entityIds },
       organizationId, // Ensure tenant isolation
     },
     select: { id: true },
   });
   ```
3. **Connect only valid IDs:**
   ```typescript
   if (validEntities.length > 0) {
     relations.EntityName = {
       connect: validEntities.map((entity) => ({ id: entity.id })),
     };
   }
   ```

### Benefits

1. **Data Integrity:** Only valid, existing entities are connected
2. **Tenant Isolation:** Ensures entities belong to the same organization
3. **Graceful Degradation:** Invalid IDs are silently ignored, valid ones are connected
4. **No Breaking Changes:** API behavior remains the same for valid requests
5. **Better Error Handling:** Prevents cryptic Prisma foreign key errors

## Testing Recommendations

### Test Cases

1. **Valid IDs:**
   - ✅ Create event with valid document IDs
   - ✅ Create event with valid client IDs
   - ✅ Create event with valid property IDs
   - ✅ Create event with valid task IDs

2. **Invalid IDs:**
   - ✅ Create event with non-existent document IDs (should succeed, ignore invalid IDs)
   - ✅ Create event with IDs from different organization (should ignore)
   - ✅ Create event with mix of valid and invalid IDs (should connect only valid)

3. **Edge Cases:**
   - ✅ Create event with empty arrays
   - ✅ Create event with null/undefined entity IDs
   - ✅ Update event to clear all relationships (empty arrays)

4. **Update Operations:**
   - ✅ Update event to add new relationships
   - ✅ Update event to remove relationships
   - ✅ Update event to replace relationships

### Manual Testing

```bash
# Test creating event with invalid document ID
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "startTime": "2026-02-10T10:00:00Z",
    "endTime": "2026-02-10T11:00:00Z",
    "documentIds": ["non-existent-id"]
  }'

# Expected: Event created successfully, invalid document ID ignored
```

## Performance Considerations

### Query Overhead

Each entity type validation adds one database query:
- Clients validation: 1 query
- Properties validation: 1 query
- Documents validation: 1 query
- Tasks validation: 1 query

**Total:** Up to 4 additional queries per event creation/update

### Optimization Opportunities

1. **Parallel Queries:** Validation queries can run in parallel using `Promise.all()`
2. **Caching:** Consider caching valid entity IDs for frequently used entities
3. **Batch Operations:** For bulk event creation, validate all IDs once

### Current Performance Impact

- **Minimal:** Validation queries are simple `SELECT id` queries with indexes
- **Acceptable:** Trade-off between data integrity and performance is reasonable
- **Scalable:** Queries scale linearly with number of entity IDs

## Related Files

### Modified Files
1. `/app/api/calendar/events/route.ts` - POST endpoint
2. `/app/api/calendar/events/[eventId]/route.ts` - PUT endpoint

### Related Schema
- `/prisma/schema.prisma` - CalendarEvent model and relationships

### Related Utilities
- `/lib/prisma.ts` - Prisma client instance
- `/lib/calendar-permissions.ts` - Permission checks

## Migration Notes

### Breaking Changes
**None.** This is a backward-compatible fix.

### Deployment Steps
1. Deploy updated code
2. No database migration required
3. Existing calendar events are not affected

### Rollback Plan
If issues occur, revert the changes to both route files. The original behavior will be restored, but foreign key errors will return.

## Future Improvements

1. **Better Error Messages:**
   - Return which IDs were invalid
   - Provide user-friendly error messages

2. **Validation Endpoint:**
   - Create `/api/calendar/events/validate` endpoint
   - Allow frontend to validate IDs before submission

3. **Bulk Validation:**
   - Optimize validation for bulk operations
   - Use single query for multiple entity types

4. **Audit Logging:**
   - Log when invalid IDs are provided
   - Track which users/clients are sending invalid data

5. **Frontend Validation:**
   - Add client-side validation before API calls
   - Implement entity ID autocomplete/search

## Conclusion

The foreign key constraint error has been resolved by adding proper validation before attempting to connect related entities. The fix ensures data integrity while maintaining backward compatibility and providing graceful degradation for invalid inputs.

**Status:** ✅ Ready for testing and deployment
