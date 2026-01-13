# Dev Startup Optimization Notes

## Current Status
- **node_modules size**: 1.9GB (large but acceptable for this stack)
- **Top-level dependencies**: 139 packages
- **Cache directories**: Exist and contain data (352MB + 177MB)
- **Issue**: Cache not being used effectively on subsequent startups

## Optimizations Applied

### 1. Turbopack File System Cache
- Enabled `turbopackFileSystemCacheForDev: true`
- Cache is being written (352MB in v16.0.9 directory)
- May not be reading properly due to experimental nature in 16.0.10

### 2. Package Import Optimization
- Enabled `optimizePackageImports` for:
  - All Radix UI components (22 packages)
  - lucide-react (large icon library)
  - date-fns (date utilities)
  - recharts (chart library)
- This tree-shakes unused exports, reducing compilation overhead

### 3. TypeScript/ESLint Optimization
- Type checking and linting skipped during dev (faster startup)
- Still enforced via `pnpm lint` and CI

### 4. pnpm Configuration (.npmrc)
- Isolated node linker for better dependency resolution
- Reduced hoisting for smaller node_modules

## Known Issues

### Next.js 16.0.10 Limitations
- File system cache is **experimental** and may not work reliably
- Cache feature is **stable** in Next.js 16.1.0+ but has Clerk compatibility issues

### Potential Solutions

1. **Upgrade to Next.js 16.1.0+** (when Clerk compatibility is fixed)
   - Cache is stable and enabled by default
   - Better performance overall

2. **Use Webpack as fallback** (if Turbopack cache doesn't work)
   ```bash
   pnpm run dev:webpack
   ```
   - Webpack has more mature caching
   - May be slower but more reliable

3. **Keep dev server running** (avoid restarts)
   - Use hot reload instead of restarting
   - Only restart when absolutely necessary

## Monitoring Cache Usage

Check cache directory size:
```bash
du -sh .next/dev/cache/turbopack/*
```

If cache grows but startup doesn't improve, the cache may not be reading properly.

## Next Steps

1. Test with current optimizations
2. Monitor cache directory growth
3. Consider upgrading to Next.js 16.1.0+ when Clerk compatibility is resolved
4. If still slow, consider using webpack as temporary solution
