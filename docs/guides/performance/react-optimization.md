# React Optimization Reference

50 rules organized by impact. Each rule includes a one-line description and before/after example.
Code examples are illustrative — they are from `.cursor/skills/vercel-react-best-practices/rules/`.

---

## 1. Eliminating Waterfalls (CRITICAL)

### `async-parallel` — Promise.all() for independent operations
Run independent async calls concurrently instead of sequentially.

```typescript
// Before (3 round trips)
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// After (1 round trip)
const [user, posts, comments] = await Promise.all([
  fetchUser(), fetchPosts(), fetchComments()
])
```

---

### `async-api-routes` — Prevent waterfall chains in API routes
Start independent operations immediately without awaiting them first.

```typescript
// Before (config waits for auth unnecessarily)
const session = await auth()
const config = await fetchConfig()
const data = await fetchData(session.user.id)

// After (auth and config start in parallel)
const sessionPromise = auth()
const configPromise = fetchConfig()
const session = await sessionPromise
const [config, data] = await Promise.all([
  configPromise,
  fetchData(session.user.id)
])
```

---

### `async-dependencies` — Dependency-based parallelization
Use `better-all` to automatically maximize parallelism in partial-dependency chains.

```typescript
import { all } from 'better-all'

// Before: profile waits for config unnecessarily
const [user, config] = await Promise.all([fetchUser(), fetchConfig()])
const profile = await fetchProfile(user.id)

// After: config and profile run in parallel
const { user, config, profile } = await all({
  async user() { return fetchUser() },
  async config() { return fetchConfig() },
  async profile() {
    return fetchProfile((await this.$.user).id)
  }
})
```

---

### `async-defer-await` — Defer await until needed
Move `await` into the branches that actually use the data.

```typescript
// Before (always fetches even when skipping)
async function handleRequest(userId: string, skip: boolean) {
  const userData = await fetchUserData(userId)
  if (skip) return { skipped: true }
  return processUserData(userData)
}

// After (only fetches when needed)
async function handleRequest(userId: string, skip: boolean) {
  if (skip) return { skipped: true }
  const userData = await fetchUserData(userId)
  return processUserData(userData)
}
```

---

### `async-suspense-boundaries` — Strategic Suspense boundaries
Use Suspense to show wrapper UI immediately while data loads in a child component.

```tsx
// Before (entire page blocked by data fetch)
async function Page() {
  const data = await fetchData()
  return (
    <div>
      <Sidebar />
      <DataDisplay data={data} />
    </div>
  )
}

// After (sidebar renders immediately; DataDisplay streams in)
function Page() {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
    </div>
  )
}
async function DataDisplay() {
  const data = await fetchData()
  return <div>{data.content}</div>
}
```

Trade-off: faster initial paint vs potential layout shift. Use `use(promise)` to share one fetch across multiple Suspense children.

---

### `server-parallel-fetching` — Parallel data fetching with RSC composition
Restructure React Server Components so sibling components fetch simultaneously.

```tsx
// Before (Sidebar waits for Page's fetch to complete)
export default async function Page() {
  const header = await fetchHeader()
  return <div><div>{header}</div><Sidebar /></div>
}

// After (Header and Sidebar fetch simultaneously)
async function Header() {
  const data = await fetchHeader()
  return <div>{data}</div>
}
async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}
export default function Page() {
  return <div><Header /><Sidebar /></div>
}
```

---

## 2. Bundle Size Optimization (CRITICAL)

### `bundle-dynamic-imports` — Dynamic imports for heavy components
Lazy-load large components not needed on initial render.

```tsx
// Before (bundles ~300KB with main chunk)
import { MonacoEditor } from './monaco-editor'

// After (loads on demand, doesn't affect TTI/LCP)
import dynamic from 'next/dynamic'
const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
)
```

---

### `bundle-barrel-imports` — Avoid barrel file imports
Import directly from source files to avoid loading thousands of unused modules.

```tsx
// Before: loads 1,583 modules, ~2.8s extra in dev
import { Check, X, Menu } from 'lucide-react'

// After: loads only 3 modules
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'

// Alternative (Next.js 13.5+): keep ergonomic imports + add to next.config.js:
// experimental: { optimizePackageImports: ['lucide-react', '@radix-ui/react-*'] }
```

Affected libraries: `lucide-react`, `@mui/material`, `@radix-ui/react-*`, `lodash`, `date-fns`, `rxjs`.
This project already has `optimizePackageImports` configured in `next.config.js`.

---

### `bundle-conditional` — Conditional module loading
Load large data or modules only when a feature is activated.

```tsx
useEffect(() => {
  if (enabled && !frames && typeof window !== 'undefined') {
    import('./animation-frames.js')
      .then(mod => setFrames(mod.frames))
      .catch(() => setEnabled(false))
  }
}, [enabled, frames, setEnabled])
// typeof window check prevents bundling for SSR
```

---

### `bundle-defer-third-party` — Defer non-critical third-party libraries
Load analytics/logging after hydration, not in the initial bundle.

```tsx
// Before (blocks initial bundle)
import { Analytics } from '@vercel/analytics/react'

// After (loads after hydration)
import dynamic from 'next/dynamic'
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

---

### `bundle-preload` — Preload based on user intent
Trigger dynamic imports on hover/focus to reduce perceived latency.

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    if (typeof window !== 'undefined') void import('./monaco-editor')
  }
  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  )
}
```

---

## 3. Server-Side Performance (HIGH)

### `server-auth-actions` — Authenticate Server Actions like API routes
Always verify auth inside each Server Action — middleware/layout guards are not sufficient.

```typescript
'use server'

// Before (no auth check — anyone can call this endpoint)
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } })
}

// After
export async function deleteUser(userId: string) {
  const session = await verifySession()
  if (!session) throw unauthorized('Must be logged in')
  if (session.user.role !== 'admin' && session.user.id !== userId) {
    throw unauthorized('Cannot delete other users')
  }
  await db.user.delete({ where: { id: userId } })
  return { success: true }
}
```

In this project use `requireAction('permission:name')` from `lib/permissions/action-guards`.

---

### `server-cache-lru` — Cross-request LRU caching
Cache data across sequential requests using an LRU cache (beyond single-request `React.cache()`).

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({ max: 1000, ttl: 5 * 60 * 1000 })

export async function getUser(id: string) {
  const cached = cache.get(id)
  if (cached) return cached
  const user = await db.user.findUnique({ where: { id } })
  cache.set(id, user)
  return user
}
// Request 1: DB query, result cached. Request 2: cache hit, no DB query.
```

Especially effective with Vercel Fluid Compute where multiple requests share an instance.

---

### `server-cache-react` — Per-request deduplication with React.cache()
Wrap DB queries in `React.cache()` to deduplicate calls within a single request.

```typescript
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return await db.user.findUnique({ where: { id: session.user.id } })
})
// Multiple components calling getCurrentUser() in one request = one DB query.
```

Use primitive arguments — inline objects always miss the cache (`Object.is` comparison).

---

### `server-after-nonblocking` — Use after() for non-blocking operations
Schedule logging/analytics to run after the response is sent.

```tsx
import { after } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  await updateDatabase(request)
  after(async () => {
    const userAgent = (await headers()).get('user-agent') || 'unknown'
    await logUserAction({ userAgent })
  })
  return Response.json({ status: 'success' })
}
// Response sent immediately; logging runs in background.
```

Works in Server Actions, Route Handlers, and Server Components.

---

### `server-serialization` — Minimize serialization at RSC boundaries
Only pass fields the client component actually uses across the server/client boundary.

```tsx
// Before (serializes all 50 fields across boundary)
async function Page() {
  const user = await fetchUser()  // 50 fields
  return <Profile user={user} />  // client uses only user.name
}

// After (serializes 1 field)
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} />
}
```

---

### `server-dedup-props` — Avoid duplicate serialization in RSC props
Do array transformations in the client component, not on the server.

```tsx
// Before (serializes 6 strings: 2 arrays × 3 items)
<ClientList usernames={usernames} usernamesOrdered={usernames.toSorted()} />

// After (serializes 3 strings; sort in client)
// RSC:
<ClientList usernames={usernames} />
// Client component:
const sorted = useMemo(() => [...usernames].sort(), [usernames])
```

---

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

### `client-swr-dedup` — Use SWR for automatic deduplication
Multiple component instances share one network request automatically.

```tsx
// Before (each instance fetches independently)
function UserList() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])
}

// After (all instances share one request)
import useSWR from 'swr'
function UserList() {
  const { data: users } = useSWR('/api/users', fetcher)
}
```

For immutable data use `useSWR` with `revalidateIfStale: false`; for mutations use `useSWRMutation`.
SWR hooks in this project live in `hooks/swr/`.

---

### `client-event-listeners` — Deduplicate global event listeners
Use `useSWRSubscription()` to share a single global listener across all component instances.

```tsx
import useSWRSubscription from 'swr/subscription'

// N components = 1 shared listener (not N listeners)
useSWRSubscription('global-keydown', () => {
  const handler = (e: KeyboardEvent) => { /* dispatch to callbacks map */ }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
})
```

---

### `client-passive-event-listeners` — Use passive event listeners for scrolling
Add `{ passive: true }` to touch/wheel listeners to eliminate scroll delay.

```typescript
// Before (browser waits to check if preventDefault() called)
document.addEventListener('touchstart', handleTouch)
document.addEventListener('wheel', handleWheel)

// After (browser scrolls immediately)
document.addEventListener('touchstart', handleTouch, { passive: true })
document.addEventListener('wheel', handleWheel, { passive: true })
// Do NOT use passive: true if the listener calls preventDefault()
```

---

### `client-localstorage-schema` — Version and minimize localStorage data
Prefix keys with a version string; store only needed fields; always wrap in try-catch.

```typescript
const VERSION = 'v2'

function saveConfig(config: { theme: string; language: string }) {
  try {
    localStorage.setItem(`userConfig:${VERSION}`, JSON.stringify(config))
  } catch { /* throws in private browsing, quota exceeded, disabled */ }
}

function loadConfig() {
  try {
    const data = localStorage.getItem(`userConfig:${VERSION}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}
```

---

## 5. Re-render Optimization (MEDIUM)

### `rerender-memo` — Extract to memoized components
Extract expensive work into `memo()`-wrapped components to enable early returns before computation.

```tsx
// Before (computes avatar even when loading = wasted work)
function Profile({ user, loading }: Props) {
  const avatar = useMemo(() => <Avatar id={computeAvatarId(user)} />, [user])
  if (loading) return <Skeleton />
  return <div>{avatar}</div>
}

// After (computation skipped entirely when loading)
const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
  const id = useMemo(() => computeAvatarId(user), [user])
  return <Avatar id={id} />
})
function Profile({ user, loading }: Props) {
  if (loading) return <Skeleton />
  return <div><UserAvatar user={user} /></div>
}
```

Note: React Compiler eliminates the need for manual `memo()` if enabled.

---

### `rerender-derived-state` — Subscribe to derived state
Subscribe to a boolean derived value rather than a continuous value to reduce re-render frequency.

```tsx
// Before (re-renders on every pixel scroll)
const width = useWindowWidth()
const isMobile = width < 768

// After (re-renders only on mobile/desktop transition)
const isMobile = useMediaQuery('(max-width: 767px)')
```

---

### `rerender-functional-setstate` — Use functional setState updates
Use `setItems(curr => ...)` to prevent stale closures and stable callback references.

```tsx
// Before (callback recreated on every items change; stale closure risk)
const addItems = useCallback((newItems: Item[]) => {
  setItems([...items, ...newItems])
}, [items])

// After (stable callback, always operates on latest state)
const addItems = useCallback((newItems: Item[]) => {
  setItems(curr => [...curr, ...newItems])
}, [])
```

---

### `rerender-transitions` — Use transitions for non-urgent updates
Wrap high-frequency state updates in `startTransition` to keep the UI responsive.

```tsx
import { startTransition } from 'react'

useEffect(() => {
  const handler = () => {
    startTransition(() => setScrollY(window.scrollY))
  }
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

---

### `rerender-lazy-state-init` — Use lazy state initialization
Pass a function to `useState` for expensive initial values — without it the initializer runs on every render.

```tsx
// Before (JSON.parse runs on every render)
const [settings, setSettings] = useState(
  JSON.parse(localStorage.getItem('settings') || '{}')
)

// After (runs only on initial render)
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem('settings')
  return stored ? JSON.parse(stored) : {}
})
```

---

### `rerender-defer-reads` — Defer state reads to usage point
Don't subscribe to searchParams or localStorage if you only read inside a callback.

```tsx
// Before (component re-renders on every searchParams change)
function ShareButton({ chatId }: { chatId: string }) {
  const searchParams = useSearchParams()
  const handleShare = () => {
    shareChat(chatId, { ref: searchParams.get('ref') })
  }
  return <button onClick={handleShare}>Share</button>
}

// After (reads on demand, no subscription)
function ShareButton({ chatId }: { chatId: string }) {
  const handleShare = () => {
    const params = new URLSearchParams(window.location.search)
    shareChat(chatId, { ref: params.get('ref') })
  }
  return <button onClick={handleShare}>Share</button>
}
```

---

### `rerender-dependencies` — Narrow effect dependencies
Use primitive dependencies instead of objects to minimize effect re-runs.

```tsx
// Before (re-runs on any change to any user field)
useEffect(() => { console.log(user.id) }, [user])

// After (re-runs only when id changes)
useEffect(() => { console.log(user.id) }, [user.id])

// Also: compute booleans outside the effect
const isMobile = width < 768
useEffect(() => { if (isMobile) enableMobileMode() }, [isMobile])
```

---

### `rerender-simple-expression-in-memo` — Don't wrap simple primitives in useMemo
Simple boolean/string/number expressions cost less than `useMemo` bookkeeping.

```tsx
// Before (useMemo overhead > expression cost)
const isLoading = useMemo(
  () => user.isLoading || notifications.isLoading,
  [user.isLoading, notifications.isLoading]
)

// After (plain inline expression)
const isLoading = user.isLoading || notifications.isLoading
```

---

## 6. Rendering Performance (MEDIUM)

### `rendering-content-visibility` — CSS content-visibility for long lists
Apply `content-visibility: auto` to defer off-screen layout and paint.

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

For 1000 messages, browser skips layout/paint for ~990 off-screen items — approximately 10x faster initial render.

---

### `rendering-activity` — Use Activity component for show/hide
Preserve state and DOM for expensive components that toggle visibility frequently.

```tsx
import { Activity } from 'react'

function Dropdown({ isOpen }: Props) {
  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <ExpensiveMenu />
    </Activity>
  )
}
// Component stays mounted; no re-mount cost on re-open.
```

---

### `rendering-hydration-no-flicker` — Prevent hydration mismatch without flickering
Inject an inline script to set client-side values synchronously before React hydrates.

```tsx
// The inline script reads localStorage synchronously before the element is shown,
// so the DOM already has the correct value — no flash, no hydration mismatch.
// Note: The __html content must be trusted/static — never interpolate user data.
function ThemeWrapper({ children }: { children: ReactNode }) {
  const themeScript = [
    '(function(){',
    '  try {',
    '    var t = localStorage.getItem("theme") || "light";',
    '    var el = document.getElementById("theme-wrapper");',
    '    if (el) el.className = t;',
    '  } catch(e) {}',
    '})();',
  ].join('')

  return (
    <>
      <div id="theme-wrapper">{children}</div>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
    </>
  )
}
```

---

### `rendering-conditional-render` — Use explicit conditional rendering
Use ternaries instead of `&&` when conditions can be `0` or `NaN`.

```tsx
// Before (renders the string "0" when count is zero)
{count && <span className="badge">{count}</span>}

// After (renders nothing when count is zero)
{count > 0 ? <span className="badge">{count}</span> : null}
```

---

### `rendering-hoist-jsx` — Hoist static JSX elements
Extract static JSX outside components to avoid object re-creation on every render.

```tsx
// Before (new React element object every render)
function Container() {
  return <div>{loading && <div className="animate-pulse h-20 bg-gray-200" />}</div>
}

// After (same element reference reused across renders)
const loadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />
function Container() {
  return <div>{loading && loadingSkeleton}</div>
}
```

Note: React Compiler hoists static JSX automatically if enabled.

---

### `rendering-animate-svg-wrapper` — Animate SVG wrapper instead of SVG element
Many browsers lack hardware acceleration for CSS animations applied directly to `<svg>`.

```tsx
// Before (animating SVG element — no GPU acceleration in many browsers)
<svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" stroke="currentColor" />
</svg>

// After (animating wrapper div — GPU accelerated)
<div className="animate-spin">
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" />
  </svg>
</div>
```

---

### `rendering-svg-precision` — Optimize SVG precision
Reduce SVG coordinate precision to decrease file size.

```bash
npx svgo --precision=1 --multipass icon.svg
```

```svg
<!-- Before -->
<path d="M 10.293847 20.847362 L 30.938472 40.192837" />
<!-- After -->
<path d="M 10.3 20.8 L 30.9 40.2" />
```

---

## 7. JavaScript Performance (LOW-MEDIUM)

### `js-set-map-lookups` — Use Set/Map for O(1) lookups
Convert arrays to Set/Map for repeated membership checks.

```typescript
// Before (O(n) per check — slow for large arrays)
const allowedIds = ['a', 'b', 'c']
items.filter(item => allowedIds.includes(item.id))

// After (O(1) per check)
const allowedIds = new Set(['a', 'b', 'c'])
items.filter(item => allowedIds.has(item.id))
```

---

### `js-index-maps` — Build index maps for repeated lookups
Build a Map once (O(n)) so all subsequent lookups are O(1).

```typescript
// Before (O(n) per lookup — 1M ops for 1000 orders × 1000 users)
return orders.map(order => ({
  ...order,
  user: users.find(u => u.id === order.userId)
}))

// After (O(1) per lookup — 2K ops total)
const userById = new Map(users.map(u => [u.id, u]))
return orders.map(order => ({ ...order, user: userById.get(order.userId) }))
```

---

### `js-combine-iterations` — Combine multiple array iterations
Multiple `.filter()` / `.map()` chains iterate the full array each time. Merge into one loop.

```typescript
// Before (3 separate O(n) iterations)
const admins = users.filter(u => u.isAdmin)
const testers = users.filter(u => u.isTester)
const inactive = users.filter(u => !u.isActive)

// After (1 O(n) iteration)
const admins: User[] = [], testers: User[] = [], inactive: User[] = []
for (const user of users) {
  if (user.isAdmin) admins.push(user)
  if (user.isTester) testers.push(user)
  if (!user.isActive) inactive.push(user)
}
```

---

### `js-early-exit` — Early return from functions
Return as soon as the result is determined; skip unnecessary iterations.

```typescript
// After (returns on first invalid user, skips the rest)
function validateUsers(users: User[]) {
  for (const user of users) {
    if (!user.email) return { valid: false, error: 'Email required' }
    if (!user.name) return { valid: false, error: 'Name required' }
  }
  return { valid: true }
}
```

---

### `js-length-check-first` — Early length check for array comparisons
Arrays of different lengths can never be equal — check `length` before expensive sort/compare.

```typescript
// After (O(1) check avoids O(n log n) sort when lengths differ)
function hasChanges(current: string[], original: string[]) {
  if (current.length !== original.length) return true
  const cs = current.toSorted(), os = original.toSorted()
  for (let i = 0; i < cs.length; i++) {
    if (cs[i] !== os[i]) return true
  }
  return false
}
```

---

### `js-tosorted-immutable` — Use toSorted() instead of sort() for immutability
`.sort()` mutates the array in place — a bug waiting to happen with React state and props.

```typescript
// Before (mutates the users prop — breaks React's immutability model)
const sorted = useMemo(
  () => users.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
)

// After (creates new sorted array; original unchanged)
const sorted = useMemo(
  () => users.toSorted((a, b) => a.name.localeCompare(b.name)),
  [users]
)
// Related: .toReversed(), .toSpliced(), .with()
```

---

### `js-min-max-loop` — Use loop for min/max instead of sort
Finding min/max requires one pass O(n); sorting just to grab the first element is O(n log n).

```typescript
// Before (O(n log n) — sort entire array to find max)
const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
return sorted[0]

// After (O(n) — single pass)
function getLatestProject(projects: Project[]) {
  if (projects.length === 0) return null
  let latest = projects[0]
  for (let i = 1; i < projects.length; i++) {
    if (projects[i].updatedAt > latest.updatedAt) latest = projects[i]
  }
  return latest
}
```

---

### `js-cache-function-results` — Cache repeated function calls
Use a module-level Map to memoize pure function results between renders.

```typescript
const slugifyCache = new Map<string, string>()

function cachedSlugify(text: string): string {
  if (slugifyCache.has(text)) return slugifyCache.get(text)!
  const result = slugify(text)
  slugifyCache.set(text, result)
  return result
}
// Use a Map (not a hook) so it works outside React components.
```

---

### `js-cache-storage` — Cache Storage API calls
`localStorage`, `sessionStorage`, and `document.cookie` are synchronous I/O. Cache reads in memory.

```typescript
const storageCache = new Map<string, string | null>()

function getLocalStorage(key: string) {
  if (!storageCache.has(key)) storageCache.set(key, localStorage.getItem(key))
  return storageCache.get(key)
}
function setLocalStorage(key: string, value: string) {
  localStorage.setItem(key, value)
  storageCache.set(key, value)  // keep cache in sync
}
// Invalidate on 'storage' event (another tab) and 'visibilitychange'.
```

---

### `js-cache-property-access` — Cache property access in loops
Cache deeply nested property lookups before entering hot loops.

```typescript
// Before (3 lookups × N iterations)
for (let i = 0; i < arr.length; i++) {
  process(obj.config.settings.value)
}

// After (1 lookup total)
const value = obj.config.settings.value
const len = arr.length
for (let i = 0; i < len; i++) { process(value) }
```

---

### `js-hoist-regexp` — Hoist RegExp creation
A `new RegExp()` inside a component body creates a new object on every render — hoist or memoize it.

```tsx
// Before (new RegExp on every render)
function Highlighter({ text, query }: Props) {
  const regex = new RegExp(`(${query})`, 'gi')
  // ...
}

// After (memoized — recreated only when query changes)
function Highlighter({ text, query }: Props) {
  const regex = useMemo(
    () => new RegExp(`(${escapeRegex(query)})`, 'gi'),
    [query]
  )
  // ...
}
// Warning: global regex (/g flag) has mutable lastIndex — don't share one instance.
```

---

### `js-batch-dom-css` — Batch DOM CSS changes
Interleaving style writes with layout reads forces synchronous reflows.

```typescript
// Before (each read between writes forces a reflow)
element.style.width = '100px'
const width = element.offsetWidth    // forces reflow
element.style.height = '200px'
const height = element.offsetHeight // forces another reflow

// After (batch all writes; read once)
element.style.width = '100px'
element.style.height = '200px'
const { width, height } = element.getBoundingClientRect()  // single reflow

// Prefer CSS class swaps over inline style writes where possible:
element.classList.add('highlighted-box')
```

---

## 8. Advanced Patterns (LOW)

### `advanced-event-handler-refs` — Store event handlers in refs
Store callbacks in refs when used in effects that should not re-subscribe on callback changes.

```tsx
// Before (re-subscribes every render because handler is a new reference)
useEffect(() => {
  window.addEventListener(event, handler)
  return () => window.removeEventListener(event, handler)
}, [event, handler])

// After (stable subscription; ref always points to latest handler)
const handlerRef = useRef(handler)
useEffect(() => { handlerRef.current = handler }, [handler])
useEffect(() => {
  const listener = (e: Event) => handlerRef.current(e)
  window.addEventListener(event, listener)
  return () => window.removeEventListener(event, listener)
}, [event])

// React 19+ alternative: useEffectEvent
import { useEffectEvent } from 'react'
const onEvent = useEffectEvent(handler)
useEffect(() => {
  window.addEventListener(event, onEvent)
  return () => window.removeEventListener(event, onEvent)
}, [event])
```

---

### `advanced-use-latest` — useLatest for stable callback refs
Access the latest callback value inside an effect without adding it to the dependency array.

```typescript
// Utility hook
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => { ref.current = value }, [value])
  return ref
}
```

```tsx
// Before (effect re-runs whenever onSearch changes)
useEffect(() => {
  const timeout = setTimeout(() => onSearch(query), 300)
  return () => clearTimeout(timeout)
}, [query, onSearch])

// After (stable effect; always calls latest onSearch)
const onSearchRef = useLatest(onSearch)
useEffect(() => {
  const timeout = setTimeout(() => onSearchRef.current(query), 300)
  return () => clearTimeout(timeout)
}, [query])
```
