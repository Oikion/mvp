# Credential Rotation Log

This file tracks all credential rotations performed for security compliance.

## Log Format

| Date | Credential Type | Rotated By | Reason | Notes |
| --- | --- | --- | --- | --- |
| YYYY-MM-DD | Credential name | Person/Team | Scheduled / Emergency | Any relevant details |

## Rotation History

| Date | Credential Type | Rotated By | Reason | Notes |
| --- | --- | --- | --- | --- |
| 2026-02-02 | Initial setup | Platform Admin | Initial deployment | All credentials set up for first time |

## Instructions

When rotating credentials:

1. Add a new row to the table above with:
   - Current date (YYYY-MM-DD format)
   - Credential type (e.g., "DATABASE_URL", "CLERK_SECRET_KEY")
   - Your name or team
   - Reason: "Scheduled" for regular rotations, "Emergency" for compromises
   - Any relevant notes (e.g., "Rotated after Q1 2026 security audit")

2. Update the "Last rotated" date in the quarterly reminder issue if applicable.

3. Commit this file to git after each rotation.

## Next Scheduled Rotations

Based on the [Credential Rotation Policy](./credential-rotation-policy.md):

- **Q2 2026 (April 1)**: DATABASE_URL, RESEND_API_KEY, ABLY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
- **Q3 2026 (July 1)**: DATABASE_URL, CLERK_SECRET_KEY, RESEND_API_KEY, ABLY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
- **Q4 2026 (October 1)**: DATABASE_URL, RESEND_API_KEY, ABLY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
