# Market Intelligence Documentation

## Directory Structure

```
docs/market-intelligence/
├── index.md          # This file - documentation index
└── setup.md          # Complete setup and usage guide
```

## Version Information

- **Feature Version**: 2.0.0 (Multi-tenant)
- **Last Updated**: January 2026
- **Prisma Migrations**:
  - `20260120100000_market_intelligence` - Initial schema
  - `20260120150000_market_intel_multi_tenant` - Multi-tenant support

## Quick Links

### For Users
- [Setup Guide](./setup.md) - How to enable and configure Market Intelligence

### For Developers
- [Setup Guide - Technical Details](./setup.md#technical-details) - Database schema and file structure
- [API Reference](./setup.md#api-reference) - API endpoints documentation

## Key Usage Notes

1. **Zero Setup Required**: Users simply navigate to Settings, configure their preferences, and click Enable
2. **Multi-Tenant**: Each organization has isolated data and independent scraping schedules
3. **Serverless**: Runs on Vercel Cron, no additional infrastructure needed
4. **Auto-Recovery**: System handles failures gracefully with exponential backoff

## Related Files

### Configuration
- `vercel.json` - Cron job configuration
- `prisma/schema.prisma` - MarketIntelConfig model
- `prisma/migrations/20260120100000_market_intelligence/` - Initial schema
- `prisma/migrations/20260120150000_market_intel_multi_tenant/` - Multi-tenant

### Code
- `lib/market-intel/` - Core library (db, types, platforms, normalizer)
- `app/api/cron/market-intel/route.ts` - Cron endpoint
- `app/api/market-intel/` - API routes
- `app/[locale]/app/(routes)/market-intelligence/` - UI pages

## Changelog

### v2.0.0 (January 2026)
- Multi-tenant support: each organization has independent configuration
- Zero-setup user experience: auto-initialization on enable
- Serverless architecture: runs entirely on Vercel Cron
- Configurable frequency per organization (hourly to weekly)
- Enhanced settings UI with platform selection and filters

### v1.0.0 (January 2026)
- Initial implementation with standalone Docker microservice
- Basic scraping for Spitogatos, XE.gr, Tospitimou
- Price tracking and deduplication
- Alert system
