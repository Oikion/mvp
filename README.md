<p align="center">
  <img src="public/images/opengraph-image.png" alt="Oikion" width="600" />
</p>

<h1 align="center">Oikion</h1>

<p align="center">
  <strong>The Operating System for Greek Real Estate Agencies</strong>
</p>

<p align="center">
  MLS · CRM · Team Feed — All in one modern platform
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

Oikion delivers three core pillars in a single, unified web application designed specifically for Greek real estate professionals:

1. **MLS** — Internal Multiple Listing System for property management
2. **CRM** — Client relationship and deal workflow management  
3. **Socials (Oikosync)** — Organization-wide activity feed for team visibility

Our goal: **speedy daily operations**, **clean team visibility**, and **sustainable growth** through a subscription-based model.

---

## Features

### 🏠 MLS (Multiple Listing System)

- Fast CRUD operations for Properties & Listings
- Advanced filtering (status, type, price range, location)
- Intuitive list → detail → edit workflow
- Bulk import via CSV/XML
- Document generation with customizable templates
- Photo management with drag-and-drop ordering

### 👥 CRM (Customer Relationship Management)

- Comprehensive client management with tagging
- Timeline of interactions and notes per client
- Task management with dashboard visibility
- Client ↔ Property ↔ Interaction linking
- Audience segmentation and filtering
- Activity tracking and follow-up reminders

### 📢 Oikosync (Team Activity Feed)

- Real-time organization-wide activity stream
- Filterable by actor, entity type, and date range
- Deep links to underlying items (Properties/Clients/Tasks)
- Automatic event tracking for MLS & CRM actions
- Social posts and team announcements

### 🔐 Multi-Tenant Organization System

- Personal organization per user on signup
- Ability to create and manage multiple organizations
- Role-based access control: `ORG_OWNER`, `ADMIN`, `AGENT`, `VIEWER`
- Invite system for team members
- Secure tenant isolation

### 🌍 Localization

- Full Greek and English language support
- Locale-aware formatting for dates and currencies
- Extensible translation system

---

## Tech Stack

### Core Framework
- **[Next.js 16](https://nextjs.org/)** — React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development
- **[React 19](https://react.dev/)** — Latest React with concurrent features

### Authentication & Authorization
- **[Clerk](https://clerk.com/)** — Complete user management and authentication

### Database & ORM
- **[Prisma](https://www.prisma.io/)** — Type-safe ORM for Node.js
- **[PostgreSQL](https://www.postgresql.org/)** — Robust relational database (Neon-compatible)

### UI & Styling
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** — Accessible component library
- **[Tremor](https://www.tremor.so/)** — Dashboard charts and visualizations
- **[Lucide](https://lucide.dev/)** — Beautiful icon library
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library

### Data Management
- **[SWR](https://swr.vercel.app/)** — React hooks for data fetching
- **[Zod](https://zod.dev/)** — Schema validation
- **[React Hook Form](https://react-hook-form.com/)** — Performant forms

### Internationalization
- **[next-intl](https://next-intl-docs.vercel.app/)** — i18n for Next.js App Router

### File Storage
- **[Vercel Blob](https://vercel.com/docs/storage/vercel-blob)** — File storage
- **[AWS S3](https://aws.amazon.com/s3/)** — Alternative storage option (DigitalOcean Spaces compatible)

### Email
- **[Resend](https://resend.com/)** — Transactional emails
- **[React Email](https://react.email/)** — Email templates

### Deployment
- **[Vercel](https://vercel.com/)** — Production hosting and CI/CD

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended)
- PostgreSQL database (or [Neon](https://neon.tech/) account)
- [Clerk](https://clerk.com/) account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Oikion/mvp.git
   cd mvp
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```

   Update the following in your `.env` file:
   - `DATABASE_URL` — PostgreSQL connection string

   Update the following in your `.env.local` file:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
   - `CLERK_SECRET_KEY` — Clerk secret key
   - `RESEND_API_KEY` — For email functionality (optional)

4. **Initialize the database**

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Seed initial data** (optional)

   ```bash
   pnpm prisma db seed
   ```

6. **Start the development server**

   ```bash
   pnpm dev
   ```

7. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Architecture

### Directory Structure

```
├── app/                    # Next.js App Router pages
│   └── [locale]/          # Internationalized routes
│       ├── (auth)/        # Authentication pages
│       ├── (dashboard)/   # Main application
│       └── (onboarding)/  # User onboarding flow
├── actions/               # Server actions
│   ├── crm/              # CRM-related actions
│   ├── mls/              # MLS-related actions
│   └── feed/             # Activity feed actions
├── components/           # React components
│   ├── ui/              # Base UI components (shadcn)
│   └── ...              # Feature-specific components
├── hooks/               # Custom React hooks
│   └── swr/            # SWR data fetching hooks
├── lib/                 # Utility libraries
├── locales/            # Translation files (en, el)
├── prisma/             # Database schema and migrations
└── types/              # TypeScript type definitions
```

### Multi-Tenant Data Isolation

All tenant data is isolated using organization-scoped Prisma queries:

```typescript
// Always use prismaForOrg for tenant-scoped data
const prisma = prismaForOrg(session.user.organizationId);
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (HTTPS) |
| `pnpm dev:http` | Start development server (HTTP) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma studio` | Open Prisma Studio |
| `pnpm prisma db push` | Push schema changes |
| `pnpm db:seed` | Seed database |

---

## Roadmap

- [x] MLS v1 — Property CRUD, filtering, bulk import
- [x] CRM v1 — Client management, interactions, tasks
- [x] Oikosync v1 — Activity feed with filtering
- [x] Multi-tenant organization system
- [x] Role-based access control
- [x] Greek & English localization
- [x] Document template generation
- [ ] Calendar integration
- [ ] Advanced reporting & analytics
- [ ] Mobile-optimized views
- [ ] API for external integrations
- [ ] Syndication to Greek portals (Spitogatos, XE, etc.)

---

## Contributing

We welcome contributions! Please see our contributing guidelines for more details.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes with proper TypeScript types
3. Ensure all translations are added for new UI strings
4. Test your changes locally
5. Submit a pull request

---

## License

Licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Built with ❤️ for Greek Real Estate Professionals</strong>
</p>
