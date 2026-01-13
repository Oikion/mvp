# Changelog CMS System

## Overview

The Changelog CMS System allows platform administrators to manage changelog entries through the admin interface. These entries are displayed on a public-facing changelog page accessible to all users.

## Version

- Initial implementation: v0.1.0-alpha
- Tags feature: v0.2.0-alpha
- Rich text editor (TipTap): v0.3.0-alpha

## Directory Structure

```
├── actions/platform-admin/
│   └── changelog-actions.ts      # Server actions for CRUD operations
├── app/[locale]/
│   ├── app/(platform-admin)/platform-admin/changelog/
│   │   ├── page.tsx              # Admin changelog management page
│   │   └── components/
│   │       ├── ChangelogClient.tsx  # Client component with table and filters
│   │       └── ChangelogForm.tsx    # Form for create/edit dialogs
│   └── changelog/
│       └── page.tsx              # Public changelog page
├── components/changelog/
│   ├── index.ts                  # Exports
│   ├── ChangelogList.tsx         # Public-facing list component
│   ├── ChangelogEntry.tsx        # Individual entry card (renders HTML)
│   ├── ChangelogCategoryBadge.tsx # Badge for category display
│   └── ChangelogRichEditor.tsx   # TipTap-based rich text editor
└── prisma/schema.prisma          # ChangelogEntry model & enums
```

## Database Schema

### ChangelogEntry Model

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| version | String | Semantic version (e.g., "1.2.3") |
| title | String | Entry title |
| description | String | HTML content from rich text editor |
| category | ChangelogCategory | Entry category |
| status | ChangelogStatus | Entry status (DRAFT, PUBLISHED, ARCHIVED) |
| tags | Json? | Array of tag objects with name and color |
| publishedAt | DateTime? | Publication timestamp |
| createdById | String | Reference to creator (Users) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Tags

Tags are stored as JSON in the database with the following structure:

```typescript
interface ChangelogTag {
  name: string;  // Tag name (max 30 chars)
  color: string; // Color identifier from preset
}
```

**Available Tag Colors:**
- gray, red, orange, amber, yellow, lime, green, emerald
- teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose

**Constraints:**
- Maximum 10 tags per entry
- Each tag name is unique within an entry (case-insensitive)
- Tag names max length: 30 characters

### TipTap Rich Text Editor

The description field uses a TipTap-based rich text editor that stores content as HTML.

**Available Features:**
- **Headings** - H1, H2, H3 headings via dropdown or keyboard shortcuts
- **Text Formatting** - Bold, Italic, Underline, Strikethrough, Inline Code
- **Lists** - Bulleted and numbered lists
- **Blockquote** - Quote blocks with styled left border
- **Horizontal Rule** - Content dividers
- **Links** - Hyperlinks with URL input
- **Images** - Insert images via URL
- **Callouts** - Tips, Warnings, and Info callouts for important notes
- **Text Alignment** - Left, Center, Right alignment

**Editor Tools:**
- **Toolbar** - Fixed toolbar with all formatting options
- **Bubble Menu** - Quick formatting menu when text is selected
- **Undo/Redo** - Full history support

**Callout Types:**
- 💡 **Tip** - Helpful suggestions (emerald/green styled)
- ⚠️ **Warning** - Important cautions (amber/yellow styled)
- ℹ️ **Info** - Additional information (blue styled)

### Enums

**ChangelogCategory:**
- FEATURE
- BUG_FIX
- IMPROVEMENT
- SECURITY
- OTHER

**ChangelogStatus:**
- DRAFT
- PUBLISHED
- ARCHIVED

## Server Actions

| Action | Description | Auth Required |
|--------|-------------|---------------|
| `createChangelogEntry()` | Create new entry with optional tags | Platform Admin |
| `updateChangelogEntry()` | Update existing entry and tags | Platform Admin |
| `deleteChangelogEntry()` | Archive entry (soft delete) | Platform Admin |
| `publishChangelogEntry()` | Publish draft entry | Platform Admin |
| `getChangelogEntries()` | Get entries with filters | Platform Admin |
| `getPublishedChangelogEntries()` | Get public entries | None |

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/app/platform-admin/changelog` | Admin changelog management |
| `/[locale]/changelog` | Public changelog page |

## Translations

- English: `locales/en/platformAdmin.json` (changelog.*)
- English: `locales/en/website.json` (changelog.*)
- Greek: `locales/el/platformAdmin.json` (changelog.*)
- Greek: `locales/el/website.json` (changelog.*)

## Security

- All admin actions require `requirePlatformAdmin()` check
- Admin actions are logged via `logAdminAction()`
- Input validation using Zod schemas
- Tags validated for max count (10) and name length (30 chars)
- Public page only shows PUBLISHED entries

## Usage

### Admin Interface

1. Navigate to Platform Admin > Changelog
2. Click "New Entry" to create a changelog entry
3. Fill in version, title, and category
4. **Use the Rich Text Editor** for description:
   - Use the toolbar to format text (Bold, Italic, Underline, etc.)
   - Select heading level from the dropdown (Paragraph, H1, H2, H3)
   - Add bullet or numbered lists
   - Insert blockquotes for emphasis
   - Add links and images via URL input popovers
   - Insert callouts (Tip, Warning, Info) from the dropdown
   - Align text left, center, or right
   - Select text to use the bubble menu for quick formatting
5. **Add Tags** (optional):
   - Click "Add Tag" to open the tag creator
   - Enter a tag name
   - Select a color from the preset palette
   - Preview the tag before adding
   - Click "Add Tag" to confirm
   - Remove tags by clicking the X on each tag
6. Choose "Save as Draft" or "Publish Now"
7. Edit, publish, or archive existing entries as needed

### Public Page

The public changelog page at `/[locale]/changelog` automatically displays all published entries:
- Sorted by publication date (newest first)
- Grouped by version
- Shows category badges, tags, and timestamps
- Tags display with their assigned colors
- Description renders as formatted HTML with proper typography styling

## Rich Text Editor Component

The `ChangelogRichEditor` component (`components/changelog/ChangelogRichEditor.tsx`) is a TipTap-based rich text editor specifically designed for changelog entries.

```tsx
import { ChangelogRichEditor } from "@/components/changelog/ChangelogRichEditor";

function MyComponent() {
  const [content, setContent] = useState("<p>Initial content</p>");

  return (
    <ChangelogRichEditor
      value={content}
      onChange={setContent}
      placeholder="Describe the changes in detail..."
      className="min-h-[300px]"
    />
  );
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | "" | HTML content |
| onChange | (value: string) => void | required | Change handler |
| placeholder | string | "Describe the changes..." | Placeholder text |
| className | string | undefined | Additional CSS classes |

## Keyboard Shortcuts

The editor supports standard keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + Shift + S | Strikethrough |
| Ctrl/Cmd + E | Inline code |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + Shift + 8 | Bullet list |
| Ctrl/Cmd + Shift + 9 | Numbered list |
