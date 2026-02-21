# 🎮 Game Library Manager

A personal video game collection tracker that lives entirely in your browser.
Your data is stored in a **Google Spreadsheet** you own — no server, no database, no subscription.

---

## Features

- **Games** — track every title with one of three states: *Finished*, *Put Aside*, *Not Yet Played*
- **Stores** — organise your collection by platform or store; many-to-many relationships supported
- **Dashboard** — KPI cards, state distribution pie charts, and time-series charts of your backlog over time
- **Statistics** — manual snapshots of your collection counts with delta indicators between entries
- **Alphabetical index** — jump to any letter instantly in large collections

---

## First-time Setup

### 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or select an existing one).
2. Navigate to **APIs & Services → Library**, search for **Google Sheets API** and click **Enable**.

### 2 — Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** as the user type (unless you have a Google Workspace organisation).
3. Fill in the required fields (app name, support email).
4. Under **Scopes**, add `https://www.googleapis.com/auth/spreadsheets`.
5. Under **Test users**, add your own Google account.
6. Save and continue.

### 3 — Create an OAuth 2.0 Client ID

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Set the application type to **Web application**.
3. Under **Authorised JavaScript origins**, add the URL where you run the app:
   - Local development: `http://localhost:5173`
   - Production: your deployed domain
4. Click **Create** and copy the **Client ID** (format: `xxxxxx.apps.googleusercontent.com`).

> No redirect URIs are needed — the app uses the OAuth 2.0 token model (implicit flow).

### 4 — Create a Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank spreadsheet.
2. Copy the spreadsheet's URL (or just the ID — the long string between `/d/` and `/edit` in the URL).

> The app will automatically create all required sheets and headers on first sign-in.

### 5 — Launch the app

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
On first load a setup dialog appears — paste your **Client ID** and **Spreadsheet URL**, then click **Sign In with Google**.

---

## Migrating existing data

If you already have a collection in a spreadsheet, two Google Apps Scripts are available to migrate your data without manual entry. Paste each script into your source spreadsheet via **Extensions → Apps Script**, set the constants at the top, and run.

### Collection migration (Games, Stores, Relations)

Expected source layout:

| A | B | C | D → M |
|---|---|---|-------|
| Finished ✓ | Put Aside ✓ | Title | Store columns (X = owned) |

### Statistics history migration

Expected source layout:

| D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|
| Date (month/year) | Finished | Δ Finished | Put Aside | Δ Put Aside | Not Yet Played | Δ Not Yet Played | Total | % Not Yet Played | Δ % Not Yet Played |

Dates are stored as ISO strings (`2024-01-01T00:00:00.000Z`) — the day is always the 1st and the time is always midnight UTC.

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
| Backend | Google Sheets API v4 (REST) | Zero infrastructure — user owns their data |
| Auth | Google Identity Services (token model) | Browser-only OAuth 2.0, no server round-trip |
| Linting | ESLint 8 + Airbnb style guide | Strict, consistent code style |
| Pre-commit | Husky + lint-staged | Blocks commits that fail lint or type-check |

### Key architectural decisions

**Google Sheets as a database** — All persistence is handled through direct REST calls to the Sheets API v4. The app creates and manages four sheet tabs: `Games`, `Stores`, `Game_Store_Relations`, and `Statistics_History`.

**Client-side only** — There is no backend server. Authentication tokens are held in memory (never written to `localStorage`) and refreshed transparently via the GIS token model.

**Single context for shared data** — `SheetDataContext` wraps `useSheetData` at the authenticated layout level. All four pages consume data from this single context, so navigating between pages never triggers a re-fetch.

**Batch deletes sorted descending** — When deleting multiple rows from Sheets (e.g. all relations for a game), row indices are sorted in descending order before the batch request so that earlier deletions don't invalidate later indices.

### Project structure

```
src/
├── components/
│   ├── Games/          # GameFormDialog
│   ├── Layout/         # AppLayout (sidebar + app bar)
│   └── Stores/         # StoreFormDialog, DeleteStoreDialog
├── config/
│   └── sheets.ts       # Sheet names, headers, API constants
├── context/
│   ├── AppContext.tsx   # Auth state (config, token, sign-in/out)
│   └── SheetDataContext.tsx  # Shared data layer (games, stores, history)
├── hooks/
│   └── useSheetData.ts # Data fetching, CRUD operations, derived helpers
├── pages/
│   ├── DashboardPage.tsx
│   ├── GamesPage.tsx
│   ├── StatisticsPage.tsx
│   └── StoresPage.tsx
├── services/
│   ├── googleAuth.ts   # GIS token client
│   └── sheetsApi.ts    # All Sheets REST API calls
└── types/
    ├── entities.ts     # Domain types (Game, Store, StatisticsEntry, …)
    └── google.d.ts     # GIS ambient declarations
```

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
