# Repository Guidelines

## Project Structure

The web app is a Vite + React + TypeScript project. Main UI code is in `src/`: `App.tsx` contains the app, `components/TripMap.tsx` renders route maps, `lib/supabase.ts` handles Supabase access, and `styles.css` contains styling. `pi_code/` holds the Raspberry Pi GPS/LCD/button tracker and its SQLite helpers or examples. `pi_code/tests/` contains database-related scripts. Root configuration includes the Vite and TypeScript configs, and `.env.example` documents frontend settings.

## Development Commands

- `npm install` installs frontend dependencies.
- `npm run dev` starts the local Vite development server.
- `npm run build` runs TypeScript project checks and creates the production bundle in `dist/`.
- `npm run preview` serves the built frontend locally for review.

Run Raspberry Pi scripts on the Pi with its hardware dependencies installed; the tracker expects GPS, GPIO, and LCD hardware and a local SQLite database.

## Coding Style

Follow the surrounding style: TypeScript/TSX with two-space indentation and single-quoted imports, and Python with four-space indentation and `snake_case` functions/variables. Use descriptive React component names in `PascalCase`; keep modules focused on UI, data access, or hardware responsibilities. No formatter or linter is configured in `package.json`, so keep changes consistent with nearby code and ensure the production build succeeds.

## Testing Guidelines

There is no configured frontend test runner. Run `npm run build` to check TypeScript and the production bundle. `pi_code/tests/test_database.py` is a standalone SQLite exercise script rather than a discovered unit-test suite; run it only with the expected database schema available. For tracker changes, validate hardware behavior on the Raspberry Pi.

## Commits and Pull Requests

Existing commit subjects are short, sentence-style summaries (for example, `Added ...` or `Changed ...`); no stricter convention is established. Use a concise imperative summary. Pull requests should explain the behavior change, list validation performed, link related issues when applicable, and include screenshots for visible frontend changes.

## Configuration and Secrets

Copy `.env.example` to `.env.local` for frontend development and keep local secrets out of Git. Browser-exposed Supabase settings must use a publishable/anon key with appropriate Row Level Security policies; never expose a service-role key. The Pi tracker loads `.env` from beside its script, so provide its Supabase URL and publishable/anon key there.
