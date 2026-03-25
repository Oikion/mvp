# Email Template Conventions

This file applies whenever you are working in `emails/`.

## Stack

- **Templates**: React Email components (`@react-email/components`)
- **Sending service**: Resend via `lib/resend.ts`
- **Base layout**: `emails/components/BaseLayout.tsx` — all templates must extend this

## Directory Structure

```
emails/
  components/         # Shared layout and UI primitives
  admin/              # Platform-level notifications (account management, suspensions)
  notifications/      # Feature notifications (CRM, calendar, tasks, deals, social)
  campaigns/          # Marketing / broadcast emails
  changelog/          # Product update emails
  data-control/       # Data export, GDPR, privacy emails
  Welcome.tsx         # Onboarding email (top-level, sent on registration)
```

Reference templates for patterns:
- `emails/Welcome.tsx` — simple onboarding email
- `emails/InviteUser.tsx` — invitation with action button
- `emails/notifications/NewTaskFromCRM.tsx` — complex multi-section email

## Template Pattern

```typescript
import { BaseLayout } from "../components/BaseLayout";
import { Text, Section, Button } from "@react-email/components";

interface MyEmailProps {
  recipientName: string;
  actionUrl: string;
  // ... other props
}

export default function MyEmail({ recipientName, actionUrl }: MyEmailProps) {
  return (
    <BaseLayout>
      <Section>
        <Text>Hello {recipientName},</Text>
        {/* Email content here */}
        <Button href={actionUrl}>
          View Details
        </Button>
      </Section>
    </BaseLayout>
  );
}
```

## Sending Emails

Use the Resend client from `lib/resend.ts`:

```typescript
import { resend } from "@/lib/resend";
import MyEmail from "@/emails/MyEmail";

await resend.emails.send({
  from: "Oikion <noreply@oikion.gr>",
  to: [recipientEmail],
  subject: "Subject line",
  react: <MyEmail recipientName={name} actionUrl={url} />,
});
```

## Conventions

- **Locale support**: Support both Greek and English content where applicable — pass a `locale` prop and conditionally render strings, or maintain separate template files per locale
- **Simplicity**: Keep templates simple — email clients have severely limited CSS support compared to browsers
- **Styling**: Use inline styles via React Email components — do not rely on external CSS classes
- **Layout**: Single-column, mobile-friendly designs only — avoid complex multi-column layouts
- **URLs**: All link `href` values must be absolute URLs including the full domain (e.g. `https://app.oikion.gr/...`) — relative paths do not work in email clients
- **Plain text**: Always include a plain text fallback when sending via Resend (`text` field alongside `react`)
- **Preview**: Test with Resend's email preview before deploying changes to production

## Adding a New Template

1. Create the file in the appropriate subdirectory (`admin/`, `notifications/`, `campaigns/`, etc.)
2. Extend `BaseLayout` from `emails/components/BaseLayout.tsx`
3. Define a TypeScript interface for all props
4. Export as the default export
5. Import and call from the relevant server action or API route
6. Test the rendered output via Resend preview

## Anti-Patterns

- NEVER use relative URLs in `href` attributes — email clients cannot resolve them
- NEVER use CSS classes or external stylesheets — use React Email component props and inline styles
- NEVER send emails from client components — email sending must happen in server actions or API route handlers
- NEVER hardcode recipient addresses — always accept the address as a parameter
- NEVER skip testing the rendered output before deploying — broken layouts in email are very hard to debug after the fact
