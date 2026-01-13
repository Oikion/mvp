#!/bin/bash

# Timing test script for Next.js dev server
# This measures actual time until first page load, not just "Ready" message

echo "=== Next.js Dev Server Timing Test ==="
echo "Starting dev server and measuring time to first successful page load..."
echo ""

# Start time
START_TIME=$(date +%s)

# Start dev server in background
echo "[$(date +%H:%M:%S)] Starting dev server..."
pnpm run dev > /tmp/nextjs-dev.log 2>&1 &
DEV_PID=$!

# Wait for "Ready" message
echo "[$(date +%H:%M:%S)] Waiting for 'Ready' message..."
READY_TIME=0
while [ $READY_TIME -lt 300 ]; do
  if grep -q "Ready in" /tmp/nextjs-dev.log 2>/dev/null; then
    READY_TIME=$(($(date +%s) - START_TIME))
    echo "[$(date +%H:%M:%S)] ✓ Server reported 'Ready' after ${READY_TIME}s"
    break
  fi
  sleep 1
done

# Wait a bit for server to fully initialize
sleep 2

# Try to load the homepage
echo "[$(date +%H:%M:%S)] Attempting to load homepage..."
PAGE_START=$(date +%s)

# Try curl with timeout
for i in {1..60}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 --insecure https://localhost:3000/el 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
    PAGE_TIME=$(($(date +%s) - PAGE_START))
    TOTAL_TIME=$(($(date +%s) - START_TIME))
    echo "[$(date +%H:%M:%S)] ✓ Page loaded successfully (HTTP $HTTP_CODE)"
    echo ""
    echo "=== Results ==="
    echo "Time to 'Ready' message: ${READY_TIME}s"
    echo "Time to first page load: ${PAGE_TIME}s"
    echo "Total time: ${TOTAL_TIME}s"
    
    # Kill dev server
    kill $DEV_PID 2>/dev/null
    wait $DEV_PID 2>/dev/null
    
    exit 0
  fi
  sleep 1
done

# Timeout
TOTAL_TIME=$(($(date +%s) - START_TIME))
echo "[$(date +%H:%M:%S)] ✗ Timeout waiting for page load (${TOTAL_TIME}s total)"
echo ""
echo "=== Results ==="
echo "Time to 'Ready' message: ${READY_TIME}s"
echo "Time to first page load: TIMEOUT (>60s)"
echo "Total time: ${TOTAL_TIME}s"

# Kill dev server
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null

exit 1
