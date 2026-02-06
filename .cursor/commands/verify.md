Recommend the user run the verification loop to validate current changes are ready for commit/PR. Do not run build, lint, or other verification commands yourself.

Tell the user to run `/verify` (or run the steps below themselves). Reference the 6-phase verification from the verification-loop skill:

1. **Build**: User runs `pnpm build` — fix any reported errors
2. **Lint**: User runs `pnpm lint` — fix any reported lint errors
3. **Tenant Isolation**: User checks new Prisma queries include `organizationId` filtering
4. **i18n**: User verifies new user-facing strings exist in both `locales/el/` and `locales/en/`
5. **Permissions**: User verifies new server actions have `requireAction()` guards
6. **Diff Review**: User reviews `git diff` for unintended changes, debug code, secret exposure

You may output a short reminder they can use to run verification:
```
Recommend running verification before commit/PR:
  pnpm build && pnpm lint
Then check tenant isolation, i18n, permissions, and git diff (see verification-loop skill).
```
