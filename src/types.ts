export type Trip = {
  id: number
  start_time: string
}

export type GpsPoint = {
  id: number
  trip_id: number
  timestamp: string
  latitude: number
  longitude: number
  speed: number | null
}

export function isValidCoordinate(point: GpsPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
}

export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
