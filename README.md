# Cycletrace frontend

A React + Leaflet ride archive that reads `trips` and `gps_points` from Supabase. Select a trip to draw its GPS route and download it as GeoJSON.

You can find my blog post about my journey in creating Cycletrace here: [mbrahimi.social](https://www.mbrahimi.social/bike-tracker)

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable (or legacy anon) key, plus your own CARTO basemaps API key. You can get a CARTO basemaps key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/).
4. Connect and configure a USB GPS module to your Raspberry Pi, along with a pushbutton and a 16x2 LCD (optional).
5. Copy `/pi_code/bike-supabase-tracker.py` and your filled-in `.env` onto the same directory in your Raspberry Pi.
6. Set up a SQLite database beside `bike-supabase-tracker.py` with the appropriate tables and columns.
7. Use a `systemd` service to start `bike-supabase-tracker.py` at boot.
8. Start the web app with `npm run dev`.

The frontend reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `CARTO_BASEMAPS_API_KEY`. These values are included in browser code, so never put a Supabase secret or service-role key there. Configure Row Level Security policies that allow the intended users to select from both tables.

The app queries trips by descending `start_time` and GPS points by ascending `timestamp` (then `id` for stable ordering). Point queries are paged in batches of 1,000. GeoJSON exports use a `LineString` for two or more coordinates, a `Point` for a single coordinate, and disable export when no valid coordinates exist; timestamp and speed arrays are included in feature properties in route order.
