# AI Assistant Mention System

## Overview

The AI Assistant now supports @ mentions for properties, clients, documents, and events. When users type `@` in the chat input, they can dynamically search and select entities to provide context to the AI.

## Features

### 1. **Dynamic Entity Search**
- Type `@` in the chat input to trigger the mention dropdown
- Real-time filtering as you type
- Searches across:
  - **Clients**: From CRM module
  - **Properties**: From MLS module  
  - **Documents**: From documents module
  - **Events**: From calendar module

### 2. **Visual Indication**
- Mentioned entities are displayed as colored badges in the message
- Each entity type has a unique color and icon:
  - 🔵 **Clients** - Blue with Users icon
  - 🟢 **Properties** - Green with Home icon
  - 🟣 **Events** - Purple with Calendar icon
  - 🔵 **Documents** - Blue with FileText icon

### 3. **Context-Aware AI Responses**
- The AI receives detailed information about mentioned entities
- Context includes:
  - **Clients**: Name, status, category, contact details, notes
  - **Properties**: Name, type, price, location, size, bedrooms, bathrooms, status, description
  - **Events**: Title, type, time, location, status, description
  - **Documents**: Name, type, description, creation date

## Implementation Details

### New Components

#### `AiMentionInput.tsx`
- Custom input component with mention functionality
- Uses SWR hooks to fetch entity data
- Implements autocomplete dropdown with grouped results
- Tracks mentioned entities and passes them to parent

#### Updated `AiChatInterface.tsx`
- Replaced standard Input with AiMentionInput
- Tracks mentioned entities state
- Sends mentions to API with each message

#### Updated `MessageList.tsx`
- Displays mentioned entities as badges above message content
- Color-coded badges for easy identification

### API Changes

#### `POST /api/ai/chat`
Updated to accept `mentions` in request body:

```typescript
interface ChatRequest {
  messages: ChatMessage[];
  useTools?: boolean;
  mentions?: MentionedEntity[]; // New field
}

interface MentionedEntity {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "document";
}
```

The API now:
1. Accepts mentioned entities in the request
2. Fetches detailed information from the database
3. Injects entity context into the system prompt
4. Provides the AI with rich context for more relevant responses

### Database Queries

The system efficiently fetches entity details using Prisma:
- Batches queries by entity type
- Only fetches necessary fields
- Filters by organization for multi-tenancy

## Usage Example

### User Flow:
1. User opens AI Assistant
2. Types a message like "What properties should I show to "
3. Types `@` to trigger mentions
4. Searches and selects "John Smith" (client)
5. Continues: "What properties should I show to @John Smith?"
6. AI receives John Smith's details (budget, preferences, notes)
7. AI provides personalized property recommendations

### Code Example:

```typescript
// Sending a message with mentions
const userMessage = {
  role: "user",
  content: "What properties should I show to @John Smith?",
  mentions: [
    {
      id: "client_123",
      name: "John Smith",
      type: "client"
    }
  ]
};

// AI receives enhanced context:
// - John Smith's budget: €300,000
// - Preference: 2-bedroom apartment
// - Location: Athens
// - Notes: First-time buyer, prefers modern buildings
```

## Technical Stack

- **React Hooks**: useState, useRef for state management
- **SWR**: Data fetching for entities
- **shadcn/ui**: Command component for dropdown
- **Prisma**: Database queries for entity details
- **OpenAI**: Context-aware AI responses

## Performance Considerations

- Entity lists are cached using SWR (5 minutes for clients/properties)
- Mention dropdown limits results to 5 per category
- Batched database queries for mentioned entities
- Optimized Prisma queries with selected fields only

## Future Enhancements

1. **Entity Preview**: Show quick preview on hover
2. **Multi-turn Context**: Maintain mentioned entities across conversation
3. **Smart Suggestions**: AI suggests relevant entities to mention
4. **Linked Entities**: Automatically include related entities (e.g., properties linked to a client)
5. **Mention History**: Quick access to recently mentioned entities

## Files Changed

### New Files
- `/app/[locale]/app/(routes)/ai/components/AiMentionInput.tsx`

### Modified Files
- `/app/[locale]/app/(routes)/ai/components/AiChatInterface.tsx`
- `/app/[locale]/app/(routes)/ai/components/MessageList.tsx`
- `/app/api/ai/chat/route.ts`

### Existing Hooks Used
- `/hooks/swr/useClients.ts`
- `/hooks/swr/useProperties.ts`
- `/hooks/swr/useDocuments.ts`
- `/hooks/swr/useCalendarEvents.ts`

## Testing Checklist

- [ ] Mention dropdown appears when typing `@`
- [ ] Search filters entities as you type
- [ ] Selecting an entity inserts it into the input
- [ ] Mentioned entities show as badges in messages
- [ ] AI receives and uses entity context
- [ ] Multiple entities can be mentioned in one message
- [ ] Works with all entity types (clients, properties, events, documents)
- [ ] Performance is acceptable with large datasets
- [ ] Respects organization boundaries (multi-tenancy)

## Troubleshooting

### Mention dropdown doesn't appear
- Check that SWR hooks are fetching data
- Verify user has access to the organization's entities
- Check console for errors

### AI doesn't use mentioned entity context
- Verify mentions are being sent in the API request
- Check that fetchMentionedEntityDetails is executing
- Review OpenAI system prompt includes context

### Entity data is outdated
- SWR cache may need invalidation
- Check dedupingInterval settings in hooks
- Consider reducing cache time for more real-time data
