#!/bin/bash
# Script to extract all TypeScript build errors from Next.js build output

echo "Running build and extracting all errors..."
echo "=========================================="
echo ""

# Run build and capture output
pnpm build 2>&1 | tee /tmp/build_output.log > /dev/null

# Extract all TypeScript errors
echo "=== ALL TYPE ERRORS ==="
grep -E "^\.\/.*\.tsx?:\d+:\d+" /tmp/build_output.log | sort -u

echo ""
echo "=== ERROR DETAILS ==="
# Extract error blocks
awk '/Failed to compile/,/Next\.js build worker exited/' /tmp/build_output.log | \
  grep -A 5 "Type error" | \
  grep -E "(Type error|Property|does not exist|is not assignable|Cannot find|\.tsx?:\d+)" | \
  head -50

echo ""
echo "=== SUMMARY ==="
ERROR_COUNT=$(grep -c "Type error" /tmp/build_output.log || echo "0")
echo "Total TypeScript errors found: $ERROR_COUNT"

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ Build successful - no TypeScript errors!"
else
  echo "❌ Build failed with $ERROR_COUNT error(s)"
fi

