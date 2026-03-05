# AI Mention System - Design Documentation

## Component: AiMentionInput

### Purpose
Provides an intelligent input field that allows users to mention entities (clients, properties, documents, events) by typing `@`, offering autocomplete suggestions from the organization's data.

## Visual Design

### Mention Badge Colors

```
Clients    : Blue    bg-primary/10 text-primary border-primary/30
Properties : Green   bg-success/10 text-success border-success/30  
Events     : Purple  bg-purple-500/10 text-purple-600 border-purple-500/30
Documents  : Blue    bg-blue-500/10 text-blue-600 border-blue-500/30
```

### Icons

- **Clients**: Users (lucide-react)
- **Properties**: Home (lucide-react)
- **Events**: Calendar (lucide-react)
- **Documents**: FileText (lucide-react)

## User Experience Flow

### 1. Trigger
```
User Input: "Show me properties for @"
           ↓
Mention dropdown appears
```

### 2. Search & Filter
```
User continues typing: "Show me properties for @john"
           ↓
Dropdown filters to show:
CLIENTS
  - John Smith
  - John Doe
```

### 3. Selection
```
User selects "John Smith"
           ↓
Input updates: "Show me properties for @John Smith "
           ↓
Badge appears in message when sent
```

## Dropdown Design

### Structure
```
┌─────────────────────────────┐
│ CLIENTS                     │
│ 👥 John Smith              │
│ 👥 Jane Doe                │
├─────────────────────────────┤
│ PROPERTIES                  │
│ 🏠 Luxury Villa Athens     │
│ 🏠 Modern Apartment        │
├─────────────────────────────┤
│ EVENTS                      │
│ 📅 Property Viewing         │
│ 📅 Client Meeting           │
├─────────────────────────────┤
│ DOCUMENTS                   │
│ 📄 Contract Template        │
│ 📄 Property Photos          │
└─────────────────────────────┘
```

### Behavior
- **Position**: Above input (side="top")
- **Width**: 300px
- **Max Items per Category**: 5
- **Loading State**: "Loading..." centered text
- **Empty State**: "No results found."

## Message Display

### With Mentions
```
┌─────────────────────────────────────────┐
│ [👥 John Smith] [🏠 Villa Athens]      │
│                                         │
│ What properties should I show to       │
│ John Smith for his villa search?       │
└─────────────────────────────────────────┘
```

### Badge Styling
- **Size**: h-5 (20px height)
- **Padding**: py-0 (vertical), standard horizontal
- **Font Size**: text-xs
- **Border**: outline variant
- **User Messages**: White badges with transparency
- **Assistant Messages**: Color-coded by type

## Accessibility

### Keyboard Navigation
- `↓` `↑` - Navigate between suggestions
- `Enter` - Select highlighted suggestion
- `Esc` - Close dropdown
- `@` - Open dropdown

### Screen Readers
- Dropdown announced as "Mention suggestions"
- Selected item announced
- Badge role: "badge" with entity type

## Responsive Behavior

### Desktop (>768px)
- Full dropdown with all groups
- 300px width
- Appears above input

### Mobile (<768px)
- Full width dropdown
- Touch-optimized spacing
- Same functionality, adjusted sizing

## States

### Default
- Input: Normal border
- Placeholder: "Type @ to mention entities or a message..."

### Active (@)
- Dropdown: Visible
- Input: Focused border
- Loading indicator if data fetching

### Selected
- Badge added to input
- Cursor positioned after badge
- Dropdown closes

### Disabled
- Input: Disabled styling
- Dropdown: Not accessible
- Used when message is sending

## Best Practices

### Do ✅
- Use mentions to provide context
- Search entities by name
- Combine multiple mentions
- Use for specific questions about entities

### Don't ❌
- Mention entities not relevant to query
- Over-mention (> 5 entities per message)
- Use mentions for generic questions
- Rely solely on mentions without clear question

## Technical Implementation

### Data Flow
```
useClients() ──┐
useProperties()├─→ AiMentionInput ─→ User Selection
useDocuments()│                      ↓
useEvents() ───┘                mentions state
                                     ↓
                              AiChatInterface
                                     ↓
                              POST /api/ai/chat
                                     ↓
                        fetchMentionedEntityDetails()
                                     ↓
                          OpenAI (with context)
```

### State Management
- Input value: Local state (useState)
- Mentioned entities: Array of { id, name, type }
- Cursor position: Ref for insertion point
- Dropdown open: Boolean state

## Performance

### Optimization Strategies
1. **SWR Caching**: 5min cache for entity lists
2. **Debounced Search**: Filter on client side
3. **Limit Results**: Max 5 per category
4. **Lazy Loading**: Entities loaded on mount
5. **Memoization**: Group filtering memoized

### Metrics
- Time to open dropdown: <100ms
- Search filter delay: <50ms
- Entity context fetch: <500ms
- Total interaction: ~1s

## Example Use Cases

### 1. Property Recommendation
```
User: "What properties should I show to @John Smith?"
AI Context: John's budget, preferences, previous viewings
Response: Personalized property suggestions
```

### 2. Event Scheduling
```
User: "Summarize my @Property Viewing event"
AI Context: Event details, attendees, location, time
Response: Detailed event summary
```

### 3. Document Generation
```
User: "Draft a contract for @Luxury Villa and @Jane Doe"
AI Context: Property details, client information
Response: Pre-filled contract template
```

### 4. Status Updates
```
User: "What's the status of @Downtown Apartment?"
AI Context: Property current status, history, viewings
Response: Comprehensive status report
```
