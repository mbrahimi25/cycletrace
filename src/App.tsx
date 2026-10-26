import { useCallback, useEffect, useMemo, useState } from 'react'
import TripMap from './components/TripMap'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { formatDate, isValidCoordinate } from './types'
import type { GpsPoint, Trip } from './types'

const PAGE_SIZE = 1000

async function fetchAllPoints(tripId: number): Promise<GpsPoint[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const rows: GpsPoint[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('gps_points')
      .select('id, trip_id, timestamp, latitude, longitude, speed')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as GpsPoint[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
    from += PAGE_SIZE
  }
}

function downloadGeoJson(trip: Trip, points: GpsPoint[]) {
  const coordinates = points.map(({ longitude, latitude }) => [longitude, latitude])
  const geometry = coordinates.length > 1
    ? { type: 'LineString', coordinates }
    : coordinates.length === 1
      ? { type: 'Point', coordinates: coordinates[0] }
      : null

  const geoJson = {
    type: 'FeatureCollection',
    features: geometry ? [{
      type: 'Feature',
      properties: {
        trip_id: trip.id,
        start_time: trip.start_time,
        point_count: points.length,
        timestamps: points.map((point) => point.timestamp),
        speeds: points.map((point) => point.speed),
      },
      geometry,
    }] : [],
  }

  const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `trip-${trip.id}.geojson`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [points, setPoints] = useState<GpsPoint[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [pointsLoading, setPointsLoading] = useState(false)
  const [tripsError, setTripsError] = useState<string | null>(null)
  const [pointsError, setPointsError] = useState<string | null>(null)

  const loadTrips = useCallback(async () => {
    if (!supabase) {
      setTripsLoading(false)
      return
    }
    setTripsLoading(true)
    setTripsError(null)
    const { data, error } = await supabase
      .from('trips')
      .select('id, start_time')
      .order('start_time', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      setTripsError(error.message)
      setTrips([])
      setSelectedTripId(null)
    } else {
      const results = (data ?? []) as Trip[]
      setTrips(results)
      setSelectedTripId((current) => results.some((trip) => trip.id === current) ? current : results[0]?.id ?? null)
    }
    setTripsLoading(false)
  }, [])

  useEffect(() => { void loadTrips() }, [loadTrips])

  useEffect(() => {
    let cancelled = false
    setPoints([])
    setPointsError(null)
    if (selectedTripId === null) {
      setPointsLoading(false)
      return () => { cancelled = true }
    }
    setPointsLoading(true)
    void fetchAllPoints(selectedTripId).then((results) => {
      if (!cancelled) setPoints(results)
    }).catch((error: unknown) => {
      if (!cancelled) setPointsError(error instanceof Error ? error.message : 'Could not load GPS points.')
    }).finally(() => {
      if (!cancelled) setPointsLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedTripId])

  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) ?? null
  const validPoints = useMemo(() => points.filter(isValidCoordinate), [points])
  const invalidPointCount = points.length - validPoints.length

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Cycletrace home">
          <span>Cycletrace</span>
        </a>

        <a className="brand" href="https://github.com/mbrahimi25/cycletrace" aria-label="Cycletrace home">
          <span>GitHub Repo Link</span>
        </a>

      </header>

      <section className="workspace" aria-label="Trip map and trip controls">
        <aside className="trip-panel">
          <div className="panel-heading">
            <div>
              <h2>Ride history</h2>
            </div>
            <span className="trip-count">{trips.length.toString().padStart(2, '0')} TRIPS</span>
          </div>

          <label htmlFor="trip-select" className="field-label">SELECT A TRIP</label>
          {tripsLoading ? (
            <div className="state-card" role="status"><span className="spinner" /> Loading your trips…</div>
          ) : !isSupabaseConfigured ? (
            <div className="state-card state-error" role="status">
              <strong>Connect Supabase</strong><span>Copy .env.example to .env.local, add your project URL and publishable key, then restart the app.</span>
            </div>
          ) : tripsError ? (
            <div className="state-card state-error" role="alert">
              <strong>Couldn’t load trips</strong><span>{tripsError}</span>
              <button className="text-button" onClick={() => void loadTrips()}>Try again ↗</button>
            </div>
          ) : trips.length === 0 ? (
            <div className="state-card"><strong>No rides yet</strong><span>Trips will show up here after your first ride is recorded.</span></div>
          ) : (
            <select id="trip-select" className="trip-select" value={selectedTripId ?? ''} onChange={(event) => setSelectedTripId(Number(event.target.value))}>
              {trips.map((trip) => <option key={trip.id} value={trip.id}>{formatDate(trip.start_time)} · Ride #{trip.id}</option>)}
            </select>
          )}

          {selectedTrip && !tripsError && (
            <>
              <div className="selected-trip">
                <p className="eyebrow">CURRENTLY EXPLORING</p>
                <p className="selected-date">{formatDate(selectedTrip.start_time)}</p>
                <p className="selected-id">RIDE #{selectedTrip.id}</p>
              </div>
              <div className="trip-stats">
                <div><span>GPS POINTS</span><strong>{validPoints.length.toLocaleString()}</strong></div>
                <div><span>ROUTE</span><strong>{validPoints.length > 1 ? 'Mapped' : validPoints.length === 1 ? '1 location' : '—'}</strong></div>
              </div>
              <button
                className="export-button"
                onClick={() => downloadGeoJson(selectedTrip, validPoints)}
                disabled={pointsLoading || validPoints.length === 0}
                title={validPoints.length === 0 ? 'There are no valid GPS points to export' : 'Download this trip as GeoJSON'}
              >
                <span aria-hidden="true">⇩</span> Export GeoJSON
              </button>
            </>
          )}

        </aside>

        <div className="map-panel">
          <div className="map-topline">
            <span><span className="map-dot" /> {pointsLoading ? 'FETCHING ROUTE' : validPoints.length > 0 ? 'ROUTE PREVIEW' : 'MAP VIEW'}</span>
            {selectedTrip && <span>{validPoints.length.toLocaleString()} {validPoints.length === 1 ? 'POINT' : 'POINTS'}</span>}
          </div>
          <div className="map-frame">
            <TripMap points={validPoints} />
            {!isSupabaseConfigured && (
              <div className="map-empty"><span className="map-empty-mark">⌁</span><strong>Connect Supabase to begin.</strong><span>Add your project URL and publishable key to .env.local.</span></div>
            )}
            {isSupabaseConfigured && !tripsLoading && !tripsError && trips.length === 0 && (
              <div className="map-empty"><span className="map-empty-mark">⌁</span><strong>Your map starts here.</strong><span>Record a ride to see your first route.</span></div>
            )}
            {selectedTrip && !pointsLoading && !pointsError && points.length === 0 && (
              <div className="map-empty"><span className="map-empty-mark">⌁</span><strong>No GPS points yet.</strong><span>This trip doesn’t have a recorded route.</span></div>
            )}
            {selectedTrip && !pointsLoading && !pointsError && points.length > 0 && validPoints.length === 0 && (
              <div className="map-empty"><span className="map-empty-mark">⌁</span><strong>No mappable coordinates.</strong><span>The recorded locations are outside the valid latitude and longitude ranges.</span></div>
            )}
            {selectedTrip && pointsLoading && <div className="map-message" role="status"><span className="spinner" /> Loading route…</div>}
            {selectedTrip && pointsError && <div className="map-message state-error" role="alert"><strong>Couldn’t load route</strong><span>{pointsError}</span></div>}
            {invalidPointCount > 0 && validPoints.length > 0 && <div className="map-warning" role="status">{invalidPointCount} invalid {invalidPointCount === 1 ? 'location was' : 'locations were'} skipped.</div>}
          </div>
          <div className="map-caption"><span>GPS TRACE <i>·</i> {validPoints.length.toLocaleString()} LOCATIONS</span><span>OPENSTREETMAP <i>·</i> LEAFLET</span></div>
        </div>
      </section>

      <footer className="page-footer">
        <span>Cycletrace - Mohamed Brahimi</span>
      </footer>
    </main>
  )
}
