# Changelog

All notable changes to Oikion will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-pre-release] - 2026-02-03

### 🎉 Pre-Release Version

The pre-release version of Oikion 1.0.0 - The Operating System for Greek Real Estate Agencies. This version is feature-complete and ready for final testing before the official 1.0.0 release.

**Note**: This is a pre-release version intended for testing and feedback. While all features are functional and stable, this release allows for final adjustments based on user testing before the official 1.0.0 production release.

### ✨ Features

#### MLS (Multiple Listing System)
- Property management with full CRUD operations
- Advanced filtering by status, type, price range, and location
- Bulk import via CSV/XML
- Document generation with customizable templates
- Photo management with drag-and-drop ordering
- Property sharing and public listings
- Property matching with clients

#### CRM (Customer Relationship Management)
- Comprehensive client management with tagging
- Timeline of interactions and notes per client
- Task management with dashboard visibility
- Client ↔ Property ↔ Interaction linking
- Audience segmentation and filtering
- Activity tracking and follow-up reminders
- Client matching with properties

#### Oikosync (Team Activity Feed)
- Real-time organization-wide activity stream
- Filterable by actor, entity type, and date range
- Deep links to underlying items (Properties/Clients/Tasks)
- Automatic event tracking for MLS & CRM actions
- Social posts and team announcements

#### Real-time Messaging
- Direct messages between team members
- Channel-based conversations
- Audience-based messaging
- Message search and filtering
- Real-time notifications via Ably
- File attachments support

#### AI Features
- AI-powered property and client search
- Intelligent matchmaking between clients and properties
- AI conversation system for natural language queries
- Automated suggestions and recommendations
- Voice conversation support

#### Calendar & Events
- Event creation and management
- Event invitations and RSVP tracking
- Calendar view with drag-and-drop
- Integration with tasks and reminders
- Event linking to clients and properties

#### Document Management
- Rich text document editor with TipTap
- Document templates and versioning
- Mention system for linking entities
- Document sharing and permissions
- Export to multiple formats (PDF, DOCX)

#### Market Intelligence
- Property market data scraping
- Price tracking and analytics
- Market trends visualization
- Competitive analysis
- Alert system for market changes

#### Platform Administration
- User and organization management
- Role-based access control (ORG_OWNER, ADMIN, AGENT, VIEWER)
- Platform-wide settings and configuration
- Changelog management system
- AI agent and prompt configuration
- Audit logging for admin actions

#### Multi-Tenant Architecture
- Personal organization per user on signup
- Multiple organization support
- Secure tenant data isolation
- Organization switching
- Invite system for team members

#### Internationalization
- Full Greek (el) and English (en) language support
- Locale-aware formatting for dates and currencies
- Extensible translation system with next-intl
- RTL support ready

#### Authentication & Security
- Clerk authentication integration
- API key authentication for external APIs
- Rate limiting with tiered limits
- CORS configuration for external integrations
- Secure session management
- Webhook verification

#### Developer Experience
- TypeScript throughout the codebase
- Prisma ORM with PostgreSQL
- SWR for data fetching and caching
- Server actions for mutations
- Comprehensive API documentation
- Environment variable validation

### 🎨 Design System
- shadcn/ui component library
- Tailwind CSS for styling
- Tremor for dashboard charts
- Consistent color palette and typography
- Accessible components (WCAG 2.1 AA compliant)
- Responsive design for all screen sizes
- Dark mode support

### 🔧 Technical Stack
- **Framework**: Next.js 16 with App Router
- **React**: React 19 with concurrent features
- **Language**: TypeScript 5.6
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Real-time**: Ably
- **File Storage**: Vercel Blob / AWS S3
- **Email**: Resend with React Email templates
- **Deployment**: Vercel with CI/CD

### 📚 Documentation
- Comprehensive README with setup instructions
- Architecture documentation
- API documentation for external integrations
- Development workflow guides
- Troubleshooting guides
- License compliance analysis

### 🔐 Security
- Environment variable validation
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection
- Rate limiting on API endpoints
- Secure file upload handling
- Input validation with Zod schemas

### 🧪 Testing
- Cypress E2E test setup
- GitHub Actions CI/CD workflows
- Docker support for containerized deployment
- Kubernetes manifests for production deployment

### 📦 Deployment
- Vercel deployment configuration
- Docker and Dockerfile support
- Kubernetes deployment manifests
- Environment variable management
- Database migration scripts
- Worker services for background jobs

### Known Limitations
- Calendar functionality is internal (Cal.com integration deprecated)
- Mobile app not yet available (web-responsive only)
- API v1 is in beta (breaking changes possible)
- Some features require manual configuration (N8N, market intelligence scrapers)

### Migration Notes
- This is the first production release
- No migration required for new installations
- For alpha/beta testers: Database schema changes may require manual migration

---

## Pre-release Versions

### [0.1.4-alpha-pre-launch] - 2026-02-01
- Calendar event model refactoring (CalComEvent → CalendarEvent)
- Design system color token migration
- Bug fixes and stability improvements

### [0.1.3-alpha] - 2026-01-28
- Financial report feature implementation
- Dashboard hydration error fixes
- Browser error handling improvements

### [0.1.2-alpha] - 2026-01-25
- Button component consolidation
- UX audit phase 6 completion
- Design system documentation

### [0.1.1-alpha] - 2026-01-20
- AI mention system implementation
- Market intelligence features
- Platform admin enhancements

### [0.1.0-alpha] - 2026-01-15
- Initial alpha release
- Core MLS, CRM, and Oikosync features
- Multi-tenant architecture
- Basic authentication and authorization

---

## Links
- [Repository](https://github.com/Oikion/mvp)
- [Documentation](./docs/)
- [License](./LICENSE)
- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
