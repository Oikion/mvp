# Oikion Documentation

Welcome to the Oikion documentation! This directory contains comprehensive guides, references, and resources for developers, administrators, and users.

## 📚 Documentation Structure

### Getting Started

- **[Setup Guide](./setup/README.md)** - Installation and configuration instructions
- **[Development Guide](./development/README.md)** - Development workflow and best practices
- **[Troubleshooting](./troubleshooting/README.md)** - Common issues and solutions

### Features

- **[Changelog System](./changelog/index.md)** - Platform changelog management
- **[Financial Reports](./features/financial-report.md)** - Financial reporting feature
- **[Market Intelligence](./market-intelligence/index.md)** - Market data and analytics
- **[Portal Publishing](./portal-publishing/index.md)** - Property portal integrations
- **[Keyboard Shortcuts](./keyboard-shortcuts/index.md)** - Application shortcuts

### Design System

- **[Design System Overview](./design-system/index.md)** - Design system documentation
- **[Buttons](./design-system/buttons.md)** - Button component guidelines
- **[Colors](./design-system/colors.md)** - Color palette and usage
- **[Typography](./design-system/typography.md)** - Typography system
- **[Forms](./design-system/forms.md)** - Form components and patterns
- **[Feedback](./design-system/feedback.md)** - User feedback components
- **[AI Mentions](./design-system/ai-mentions.md)** - AI mention system
- **[Nielsen Heuristics](./design-system/nielsen-heuristics.md)** - UX principles

### UX Audit

- **[UX Audit Overview](./ux-audit/index.md)** - UX audit documentation
- **[Phase 1 Summary](./ux-audit/phase-1-summary.md)** - Initial audit findings
- **[Phase 2 Summary](./ux-audit/phase-2-summary.md)** - Second phase findings
- **[Phase 3 Summary](./ux-audit/phase-3-summary.md)** - Third phase findings
- **[Phase 4 Summary](./ux-audit/phase-4-summary.md)** - Fourth phase findings
- **[Phase 5 Summary](./ux-audit/phase-5-summary.md)** - Fifth phase findings
- **[Phase 6 Summary](./ux-audit/phase-6-summary.md)** - Final phase findings

### Development

- **[Type Safety Roadmap](./development/type-safety-roadmap.md)** - TypeScript improvements plan
- **[Logging Strategy](./development/logging-strategy.md)** - Logging guidelines and best practices
- **[Claude Integration](./claude-integration.md)** - AI integration documentation

### Optimization

- **[Optimization Overview](./optimization/README.md)** - Performance optimization guide
- **[Quick Start](./optimization/QUICK_START.md)** - Quick optimization wins
- **[Implementation Checklist](./optimization/IMPLEMENTATION_CHECKLIST.md)** - Step-by-step guide
- **[Phase 1: Critical](./optimization/phase-1-critical/)** - Critical optimizations
  - Database Connection Pooling
  - Database Indexes
  - N+1 Query Prevention
  - Credential Rotation
  - Data Serialization

### Migrations

- **[CalendarEvent Rename](./migrations/2026-02-01-calcom-to-calendarevent-rename.md)** - Calendar model migration
- **[AI Provider Settings](./migrations/add-ai-provider-settings.md)** - AI configuration migration

### Plans

- **[CalendarEvent Rename Plan](./plans/2026-02-01-rename-calcom-to-calendarevent.md)** - Calendar refactoring plan

### Legal

- **[License Compliance Analysis](./legal/license-compliance-analysis.md)** - Open source license review

### Release

- **[v1.0.0 Checklist](./release/v1.0.0-checklist.md)** - Pre-release verification checklist

### Infrastructure

- **[Kubernetes](../k8s/README.md)** - Kubernetes deployment documentation
- **[Monitoring](../k8s/monitoring/README.md)** - Monitoring and observability
- **[Provisioning](../k8s/PROVISIONING.md)** - Infrastructure provisioning

### Services

- **[Scraper Service](../services/scraper/README.md)** - Property scraping service
- **[Worker Services](../services/)** - Background worker services

## 🚀 Quick Links

### For Developers

- [Getting Started](./setup/README.md)
- [Development Workflow](./development/README.md)
- [Type Safety Roadmap](./development/type-safety-roadmap.md)
- [Logging Strategy](./development/logging-strategy.md)
- [Contributing Guide](../CONTRIBUTING.md)

### For Designers

- [Design System](./design-system/index.md)
- [Color Palette](./design-system/colors.md)
- [Typography](./design-system/typography.md)
- [UX Audit](./ux-audit/index.md)

### For Administrators

- [Setup Guide](./setup/README.md)
- [Troubleshooting](./troubleshooting/README.md)
- [Optimization Guide](./optimization/README.md)
- [Security Policy](../SECURITY.md)

### For Users

- [Keyboard Shortcuts](./keyboard-shortcuts/index.md)
- [Feature Documentation](./features/)
- [Changelog](./changelog/index.md)

## 📖 Documentation Standards

### File Naming

- Use **kebab-case** for file names: `feature-name.md`
- Use **README.md** for directory indexes
- Use **index.md** for feature documentation

### Document Structure

Each document should include:

1. **Title** - Clear, descriptive title
2. **Overview** - Brief description of the content
3. **Table of Contents** - For longer documents
4. **Main Content** - Well-organized sections
5. **Examples** - Code examples where applicable
6. **References** - Links to related documentation

### Code Examples

Use proper syntax highlighting:

```typescript
// TypeScript example
interface User {
  id: string;
  name: string;
}
```

```bash
# Shell commands
pnpm install
pnpm dev
```

### Links

- Use **relative links** for internal documentation
- Use **absolute links** for external resources
- Verify all links are working

## 🔄 Keeping Documentation Updated

### When to Update

Update documentation when:

- Adding new features
- Changing existing features
- Fixing bugs that affect usage
- Updating dependencies
- Changing configuration
- Modifying architecture

### Documentation Review

- Review documentation quarterly
- Update version numbers
- Verify code examples still work
- Check for broken links
- Update screenshots if needed

## 📝 Contributing to Documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to documentation.

### Quick Tips

- Write in clear, simple language
- Use examples liberally
- Keep documents focused and concise
- Use proper Markdown formatting
- Include code examples
- Add screenshots for UI features
- Link to related documentation

## 🆘 Getting Help

If you can't find what you're looking for:

1. Check the [Troubleshooting Guide](./troubleshooting/README.md)
2. Search existing [GitHub Issues](https://github.com/Oikion/mvp/issues)
3. Ask in [GitHub Discussions](https://github.com/Oikion/mvp/discussions)
4. Contact support at support@oikion.com

## 📊 Documentation Status

### Coverage

- ✅ **Setup & Installation** - Complete
- ✅ **Development Guides** - Complete
- ✅ **Design System** - Complete
- ✅ **Feature Documentation** - Complete
- ✅ **API Documentation** - In Progress
- ✅ **Deployment Guides** - Complete
- ✅ **Troubleshooting** - Complete

### Recent Updates

- **2026-02-03**: Added v1.0.0 release documentation
- **2026-02-03**: Created type safety roadmap
- **2026-02-03**: Created logging strategy guide
- **2026-02-01**: Updated calendar event documentation
- **2026-01-28**: Added financial report documentation

## 📚 External Resources

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### React

- [React Documentation](https://react.dev/)
- [React 19 Features](https://react.dev/blog/2024/04/25/react-19)
- [React Hooks](https://react.dev/reference/react)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript with React](https://react-typescript-cheatsheet.netlify.app/)

### Prisma

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### Clerk

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk with Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)

### Tailwind CSS

- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind Components](https://tailwindui.com/)

### shadcn/ui

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)

## 🎯 Roadmap

### Planned Documentation

- [ ] API v1 complete reference
- [ ] Video tutorials
- [ ] Interactive examples
- [ ] Architecture diagrams
- [ ] Performance benchmarks
- [ ] Security best practices guide
- [ ] Deployment automation guide
- [ ] Monitoring and alerting guide

---

**Last Updated**: 2026-02-03 (v1.0.0-pre-release)

**Maintained by**: Oikion Development Team

**License**: MIT
