# Cycletrace frontend

A React + Leaflet ride archive that reads `trips` and `gps_points` from Supabase. Select a trip to draw its GPS route and download it as GeoJSON.

You can find my blog post about my journey in creating Cycletrace here: [mbrahimi.social](https://www.mbrahimi.social/bike-tracker)

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable (or legacy anon) key.
4. Start the app with `npm run dev`.

The frontend reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. A Vite `VITE_` variable is included in browser code, so never put a Supabase secret or service-role key there. Configure Row Level Security policies that allow the intended users to select from both tables.

The app queries trips by descending `start_time` and GPS points by ascending `timestamp` (then `id` for stable ordering). Point queries are paged in batches of 1,000. GeoJSON exports use a `LineString` for two or more coordinates, a `Point` for a single coordinate, and disable export when no valid coordinates exist; timestamp and speed arrays are included in feature properties in route order.
