# Graph Report - CivicTask-LocalRewards  (2026-10-31)

## Corpus Check
- 52 files · ~56,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 342 nodes · 798 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ecf8dde4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- AuthContext.tsx
- App.tsx
- package.json
- demo-data.ts
- dependencies
- compilerOptions
- vite.config.ts
- scripts
- CivicTask & Local Rewards 🌱
- roleAccessControl.test.ts
- qrcode.react
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 35 edges
2. `useToast()` - 26 edges
3. `react` - 25 edges
4. `lucide-react` - 23 edges
5. `useRouter()` - 21 edges
6. `apiFetch()` - 19 edges
7. `CivicTask & Local Rewards 🌱` - 19 edges
8. `compilerOptions` - 16 edges
9. `firebase` - 15 edges
10. `AppContent()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `runDemoBackendAuthTest()` --calls--> `handleApiRequest()`  [EXTRACTED]
  tests/demoBackendAuth.test.ts → server/api.ts
- `runDemoModeTests()` --calls--> `demoProfile()`  [EXTRACTED]
  tests/demoMode.test.ts → src/lib/demo-data.ts
- `runDemoModeTests()` --calls--> `subscribeDemoCollection()`  [EXTRACTED]
  tests/demoMode.test.ts → src/lib/demo-data.ts
- `request()` --calls--> `runDemoApi()`  [EXTRACTED]
  tests/demoMode.test.ts → src/lib/demo-data.ts
- `App()` --calls--> `AuthProvider()`  [EXTRACTED]
  src/App.tsx → src/context/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (14 total, 3 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (52): ADMIN_EMAILS, checkRateLimit(), db, generateSecureRedemptionCode(), getGooglePublicCerts(), handleApiRequest(), hashString(), parseBody() (+44 more)

### Community 1 - "AuthContext.tsx"
Cohesion: 0.10
Nodes (45): canvas-confetti, firebase, html5-qrcode, AdminDashboard(), AdminInterfaceProps, MerchantInterfaceProps, ShopkeeperDashboard(), ApiResponse (+37 more)

### Community 2 - "App.tsx"
Cohesion: 0.10
Nodes (44): lucide-react, react, App(), AppContent(), AdminInterface(), AuthModal(), AuthModalProps, LoginPage() (+36 more)

### Community 3 - "package.json"
Cohesion: 0.11
Nodes (25): devDependencies, autoprefixer@^10.4.21, esbuild@^0.28.2, tailwindcss@^4.3.3, tsx@^4.21.0, @types/canvas-confetti@^1.9.0, @types/express@^4.17.21, @types/node@^22.14.0 (+17 more)

### Community 4 - "demo-data.ts"
Cohesion: 0.13
Nodes (28): ApplicationUser, AuthContext, AuthContextType, AuthProvider(), createGuestId(), guestId(), storedRole(), unavailableAuthentication() (+20 more)

### Community 5 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, canvas-confetti@^1.9.4, dotenv@^17.2.3, express@^4.21.2, firebase@^13.0.0, @google/genai@^2.4.0, html5-qrcode@^2.3.8, lucide-react@^0.546.0 (+12 more)

### Community 6 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 7 - "vite.config.ts"
Cohesion: 0.22
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 8 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, dev, lint, preview

### Community 9 - "CivicTask & Local Rewards 🌱"
Cohesion: 0.06
Nodes (33): 1. Clone the repository, 2. Install dependencies, 3. Configure the environment, 4. Configure Firebase, 5. Run the application, 6. Build and test, Administration and moderation, Administrator (+25 more)

### Community 10 - "roleAccessControl.test.ts"
Cohesion: 0.60
Nodes (4): apiCall(), assert(), db, runRoleAccessControlTests()

## Knowledge Gaps
- **6 isolated node(s):** `CREATE`, `UPDATE`, `DELETE`, `LIST`, `GET` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 131 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `firebase` connect `AuthContext.tsx` to `api.ts`, `roleAccessControl.test.ts`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **What connects `CREATE`, `UPDATE`, `DELETE` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05267778753292362 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.tsx` to `AuthContext.tsx`, `package.json`, `demo-data.ts`, `dependencies`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `AuthContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09800362976406533 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App.tsx` to `AuthContext.tsx`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09518773135906927 - nodes in this community are weakly interconnected._