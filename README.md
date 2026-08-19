# Game Library Manager

A personal video game collection tracker that lives entirely in your browser.
Your data is stored in **Supabase**, with each authenticated user isolated by Row Level Security.

---

## For Users

### Try it

**[https://paoloiulita.github.io/game-library/](https://paoloiulita.github.io/game-library/)**

### Features

- **Games** — track every title with one of three states: *Finished*, *Put Aside*, *Not Yet Played*
- **Stores** — organise your collection by platform or store; many-to-many relationships supported
- **Dashboard** — KPI cards, state distribution pie charts, and time-series charts of your backlog over time
- **Statistics** — currently hidden while the feature is reviewed
- **Alphabetical index** — jump to any letter instantly in large collections

### First-time setup

1. Create or open a Supabase project.
2. In **Project Settings → Data API**, copy the project URL and publishable key.
3. In **Authentication → Providers**, enable Google and configure its OAuth credentials.
4. Open the app and sign in with Google.

Visit [https://paoloiulita.github.io/game-library/](https://paoloiulita.github.io/game-library/). On first load, sign in with Google.

---

## For Developers

### Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Type safety across the whole codebase |
| Build tool | Vite 5 | Fast HMR, minimal config |
| UI | Material UI v6 + Emotion | Comprehensive component library, consistent design |
| Charts | Recharts | Composable, React-native charting |
| Routing | React Router v7 | File-less SPA routing |
| State | React Context + `useReducer` / `useState` | No external state library needed at this scale |
| Backend | Supabase Database + JavaScript SDK | Managed Postgres with Row Level Security |
| Auth | Supabase Auth | Browser OAuth with persistent sessions |
| Linting | ESLint 8 + Airbnb style guide | Strict, consistent code style |
| Pre-commit | Husky + lint-staged | Blocks commits that fail lint or type-check |

### Key architectural decisions

**Supabase as a database** — Core persistence uses the `games`, `stores`, and `game_store` tables. Row Level Security scopes records to the authenticated user.

**Client-side only** — The browser uses the Supabase publishable key. The database enforces tenant isolation through RLS; service-role credentials never belong in the frontend.

**Single context for shared data** — `GameDataContext` wraps `useGameData` at the authenticated layout level. All four pages consume data from this single context, so navigating between pages never triggers a re-fetch.

**Batch deletes sorted descending** — When deleting multiple rows from Sheets (e.g. all relations for a game), row indices are sorted in descending order before the batch request so that earlier deletions don't invalidate later indices.

### Project structure

```
src/
├── components/
│   ├── Games/          # GameFormDialog
│   ├── Layout/         # AppLayout (sidebar + app bar)
│   └── Stores/         # StoreFormDialog, DeleteStoreDialog
├── config/
│   └── storage.ts      # Browser storage keys
├── context/
│   ├── AppContext.tsx   # Supabase session and sign-in/out
│   └── GameDataContext.tsx   # Shared data layer (games, stores, history)
├── hooks/
│   └── useGameData.ts  # Data fetching, CRUD operations, derived helpers
├── pages/
│   ├── DashboardPage.tsx
│   ├── GamesPage.tsx
│   ├── StatisticsPage.tsx
│   └── StoresPage.tsx
├── services/
│   ├── supabaseAuth.ts       # Supabase Auth wrapper
│   ├── supabaseClient.ts     # Typed Supabase client
│   └── supabaseRepository.ts # Core database operations
└── types/
    ├── entities.ts     # Domain types (Game, Store, StatisticsEntry, …)
    └── google.d.ts     # GIS ambient declarations
```

### Local development setup

```bash
npm install
printf 'VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-public-key\n' > .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Add the local callback URL to the allowed redirect URLs in Supabase Auth and its Google provider configuration.

### Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (http://localhost:5173) |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Check all `.ts` / `.tsx` files with ESLint |
| `npm run lint:fix` | Same as above, auto-fixing where possible |
| `npm run type-check` | Run `tsc --noEmit` without building |

> The pre-commit hook runs `eslint --fix` and `tsc --noEmit` automatically on every staged `.ts` / `.tsx` file via Husky + lint-staged.

### Deployment

The app is deployed to GitHub Pages via GitHub Actions on every push to `main`. The workflow builds the project and uploads the `dist/` folder as a Pages artifact. SPA routing on GitHub Pages is handled by a `public/404.html` that encodes the requested path into `sessionStorage` and redirects to the root, where `index.html` restores it before React Router initialises.
