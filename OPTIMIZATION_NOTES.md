# Dev Startup Optimization Notes

## Current Status (Updated 2026-01-20)
- **node_modules size**: 1.9GB (large but acceptable for this stack)
- **Top-level dependencies**: 139 packages
- **Default bundler**: Turbopack (Next.js 16 default, 2-10x faster than Webpack)
- **File system cache**: Enabled for faster restarts

## Optimizations Applied

### 1. Turbopack as Default Bundler ✅
- **Changed**: Default `dev` script now uses `--turbopack` instead of `--webpack`
- **Impact**: 2-10x faster Fast Refresh/HMR, significantly faster cold starts
- **Fallback**: `pnpm run dev:webpack` still available if needed

### 2. Turbopack File System Cache ✅
- **Enabled**: `turbopackFileSystemCacheForDev: true` in `next.config.js`
- **Impact**: Subsequent dev server restarts should be much faster (cache persists between runs)
- **Location**: Cache stored in `.next/dev/cache/turbopack/`

### 3. Removed .pnpm-store from Repo ✅
- **Removed**: `.pnpm-store/` directory (82MB) from repository root
- **Added**: `.pnpm-store/` to `.gitignore` to prevent re-adding
- **Impact**: Eliminates thousands of unnecessary files from file watchers and git operations
- **Note**: pnpm store now correctly uses `~/.pnpm-store` per `.npmrc` configuration

### 4. Package Import Optimization
- Enabled `optimizePackageImports` for production builds:
  - All Radix UI components (22 packages)
  - lucide-react (large icon library)
  - date-fns (date utilities)
  - recharts (chart library)
- **Note**: Disabled in dev mode to improve startup time (can add overhead)

### 5. TypeScript/ESLint Optimization
- Type checking and linting skipped during dev (faster startup)
- Still enforced via `pnpm lint` and CI

### 6. pnpm Configuration (.npmrc)
- Isolated node linker for better dependency resolution
- Store directory set to `~/.pnpm-store` (outside repo)
- Reduced hoisting for smaller node_modules

## Expected Performance

### First Run (Cold Start)
- **Before**: 90+ seconds
- **After**: 10-30 seconds (depending on machine)
- **Why**: Turbopack is faster, but first run still needs to build module graph

### Subsequent Runs (Warm Start)
- **Before**: 90+ seconds (cache disabled)
- **After**: 2-5 seconds (with cache enabled)
- **Why**: Turbopack cache persists between runs

### Hot Module Replacement (HMR)
- **Before**: 5-10 seconds per edit
- **After**: <2 seconds for most component edits
- **Why**: Turbopack's incremental compilation is much faster

## Troubleshooting

### If startup is still slow (>30s on warm start)
1. **Check cache is working**:
   ```bash
   du -sh .next/dev/cache/turbopack/*
   ```
   If cache directory is empty or not growing, cache may not be working.

2. **Clear cache and retry**:
   ```bash
   pnpm clean:next
   pnpm dev
   ```

3. **Use Webpack fallback** (if Turbopack has issues):
   ```bash
   pnpm run dev:webpack
   ```

### If HMR is slow (>5s per edit)
- Check for large barrel exports (`index.ts` files re-exporting many modules)
- Consider splitting large components
- Check for circular dependencies

## Best Practices

1. **Keep dev server running**: Use hot reload instead of restarting
2. **Monitor cache growth**: Cache should grow over time as you develop
3. **Clear cache if issues**: Run `pnpm clean:next` if you see weird behavior
4. **Profile startup**: Use `pnpm run dev:profile` to identify bottlenecks

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
