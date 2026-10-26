import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { GpsPoint } from '../types'

const startIcon = L.divIcon({
  className: 'route-pin route-pin-start',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const endIcon = L.divIcon({
  className: 'route-pin route-pin-end',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: true })
    } else if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 16, animate: true })
    }
  }, [map, positions])

  return null
}

export default function TripMap({ points }: { points: GpsPoint[] }) {
  const positions = points.map((point) => [point.latitude, point.longitude] as [number, number])
  const center: [number, number] = positions[0] ?? [43.6532, -79.3832]

  return (
    <MapContainer center={center} zoom={positions.length ? 13 : 11} scrollWheelZoom className="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url={`https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${import.meta.env.CARTO_BASEMAPS_API_KEY}`}
      />
      {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#ff0000', weight: 5, opacity: 0.9 }} />}
      {positions.length === 1 && <Marker position={positions[0]} icon={startIcon} />}
      {positions.length > 1 && (
        <>
          <Marker position={positions[0]} icon={startIcon}>
            <Popup>Ride start</Popup>
          </Marker>
          <Marker position={positions[positions.length - 1]} icon={endIcon}>
            <Popup>Ride finish</Popup>
          </Marker>
        </>
      )}
      {positions.length > 0 && <FitRoute positions={positions} />}
    </MapContainer>
  )
}
