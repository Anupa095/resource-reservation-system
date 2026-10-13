'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface Resource {
  id: string
  name: string
  category: string
  capacity: number | null
  location: string | null
  description: string | null
}

interface Reservation {
  id: string
  startTime: string
  endTime: string
  status: string
  user: { name: string }
  resource: Resource
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`API returned an unexpected response (HTTP ${response.status}).`)
  }
  return response.json()
}

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

const formatDay = (isoDate: string) => new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit' })

const formatMonth = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()

// Resources with at least this much capacity are treated as bulk stock,
// so we don't show an availability countdown for them.
const STOCK_CAPACITY_MIN = 20

const formatDuration = (ms: number) => {
  const minutes = Math.max(Math.floor(ms / 60_000), 1)
  const days = Math.floor(minutes / 1440)
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`
  return `${minutes} min`
}

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  cube: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5',
  check: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  pin: 'M12 22s8-7.2 8-13a8 8 0 1 0-16 0c0 5.8 8 13 8 13zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')

  const fetchData = async () => {
    try {
      const resRes = await fetch('/api/resources', { cache: 'no-store' })
      const resData = await readJsonResponse(resRes)
      if (!resRes.ok) throw new Error(resData.error || 'Failed to fetch resources')
      const resourceList = Array.isArray(resData) ? resData : resData.data
      if (!Array.isArray(resourceList)) throw new Error('Invalid resources API response')
      setResources(resourceList)

      const revRes = await fetch('/api/reservations', { cache: 'no-store' })
      const revData = await readJsonResponse(revRes)
      if (!revRes.ok) throw new Error(revData.error || 'Failed to fetch reservations')
      const reservationList = Array.isArray(revData) ? revData : revData.data
      if (!Array.isArray(reservationList)) throw new Error('Invalid reservations API response')
      setReservations(reservationList)

      setLoadError('')
    } catch (err) {
      console.error('Fetch error:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(fetchData)
  }, [])

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now())
    updateCurrentTime()
    const interval = window.setInterval(updateCurrentTime, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const upcomingReservations = [...reservations]
    .filter((reservation) => currentTime !== null && new Date(reservation.startTime).getTime() > currentTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5)

  const currentlyBookedResourceIds = new Set(
    currentTime === null
      ? []
      : reservations
          .filter((reservation) =>
            new Date(reservation.startTime).getTime() <= currentTime &&
            new Date(reservation.endTime).getTime() > currentTime &&
            reservation.status !== 'CANCELLED'
          )
          .map((reservation) => reservation.resource?.id)
          .filter((resourceId): resourceId is string => Boolean(resourceId))
  )

  // Start time of the next non-cancelled booking for a resource (null if none)
  const nextBookingStartFor = (resourceId: string): number | null => {
    if (currentTime === null) return null
    const starts = reservations
      .filter((r) => r.resource?.id === resourceId && r.status !== 'CANCELLED')
      .map((r) => new Date(r.startTime).getTime())
      .filter((t) => t > currentTime)
      .sort((a, b) => a - b)
    return starts[0] ?? null
  }

  // End time of the booking that is running right now (null if none)
  const currentBookingEndFor = (resourceId: string): number | null => {
    if (currentTime === null) return null
    const ends = reservations
      .filter(
        (r) =>
          r.resource?.id === resourceId &&
          r.status !== 'CANCELLED' &&
          new Date(r.startTime).getTime() <= currentTime &&
          new Date(r.endTime).getTime() > currentTime
      )
      .map((r) => new Date(r.endTime).getTime())
      .sort((a, b) => b - a)
    return ends[0] ?? null
  }

  const resourceAvailability = resources.map((resource) => ({
    ...resource,
    nextBookingStart: nextBookingStartFor(resource.id),
    currentBookingEnd: currentBookingEndFor(resource.id),
    upcomingBookings: reservations.filter((reservation) =>
      reservation.resource?.id === resource.id &&
      currentTime !== null &&
      new Date(reservation.startTime).getTime() > currentTime
    ).length,
    isInUse: currentlyBookedResourceIds.has(resource.id),
    bookedCapacity: currentlyBookedResourceIds.has(resource.id) ? 1 : 0,
  }))

  const categories = ['All', ...Array.from(new Set(resources.map((r) => r.category).filter(Boolean)))]
  const visibleResources =
    activeCategory === 'All'
      ? resourceAvailability
      : resourceAvailability.filter((r) => r.category === activeCategory)

  const stats = {
    totalResources: resources.length,
    availableNow: currentTime === null ? null : resources.length - currentlyBookedResourceIds.size,
    inUseNow: currentTime === null ? null : currentlyBookedResourceIds.size,
    upcoming: upcomingReservations.length,
  }

  const statCards = [
    { label: 'Total resources', value: stats.totalResources, icon: ICONS.cube, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Available now', value: stats.availableNow ?? '—', icon: ICONS.check, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'In use now', value: stats.inUseNow ?? '—', icon: ICONS.clock, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Upcoming reservations', value: stats.upcoming, icon: ICONS.calendar, tone: 'bg-indigo-50 text-indigo-600' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Page header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Operations overview</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Resource Reservation Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Keep shared spaces and equipment organized, visible, and available for teams without overlap.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Stats */}
        <section aria-label="Summary" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon path={card.icon} className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Resource availability */}
          <section className="lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resource availability</h2>
                <p className="mt-1 text-sm text-slate-500">Live status of every shared resource.</p>
              </div>
              {categories.length > 2 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        activeCategory === category
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              {dataLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : loadError ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  role="alert"
                >
                  {loadError}
                  <button
                    type="button"
                    onClick={() => {
                      setDataLoading(true)
                      setLoadError('')
                      void fetchData()
                    }}
                    className="ml-2 font-medium underline"
                  >
                    Try again
                  </button>
                </div>
              ) : visibleResources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                  No resources found.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {visibleResources.map((res) => {
                    const remainingCapacity =
                      currentTime === null || res.capacity === null
                        ? null
                        : Math.max(res.capacity - res.bookedCapacity, 0)
                    const isAtCapacity = remainingCapacity === 0
                    const usagePercent =
                      res.capacity && res.capacity > 0
                        ? Math.min((res.bookedCapacity / res.capacity) * 100, 100)
                        : res.isInUse
                          ? 100
                          : 0

                    const badge =
                      currentTime === null
                        ? { text: 'Checking…', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
                        : isAtCapacity
                          ? { text: 'Fully booked', cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' }
                          : res.isInUse
                            ? { text: 'In use', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
                            : { text: 'Available', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }

                    const barColor = isAtCapacity ? 'bg-red-500' : res.isInUse ? 'bg-amber-500' : 'bg-emerald-500'

                    const isStock = res.capacity !== null && res.capacity >= STOCK_CAPACITY_MIN
                    const availabilityNote =
                      currentTime === null || isStock
                        ? null
                        : res.isInUse
                          ? res.currentBookingEnd
                            ? { text: `Free in ${formatDuration(res.currentBookingEnd - currentTime)}`, cls: 'bg-amber-50 text-amber-700' }
                            : null
                          : res.nextBookingStart === null
                            ? { text: 'Available · no upcoming bookings', cls: 'bg-emerald-50 text-emerald-700' }
                            : { text: `Available for ${formatDuration(res.nextBookingStart - currentTime)}`, cls: 'bg-emerald-50 text-emerald-700' }

                    return (
                      <article
                        key={res.id}
                        className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            {res.category}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.text}
                          </span>
                        </div>

                        <h3 className="mt-4 text-base font-semibold text-slate-900">{res.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
                          {res.description || 'No description provided.'}
                        </p>

                        <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                          <Icon path={ICONS.pin} className="h-4 w-4 text-slate-400" />
                          <span>{res.location || 'Location not set'}</span>
                        </div>

                        {availabilityNote && (
                          <div
                            className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${availabilityNote.cls}`}
                          >
                            <Icon path={ICONS.clock} className="h-3.5 w-3.5" />
                            {availabilityNote.text}
                          </div>
                        )}

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">Capacity usage</span>
                            <span className="text-slate-500">
                              {currentTime === null ? '—' : res.bookedCapacity} / {res.capacity ?? 'Not set'}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                          <span>
                            Remaining:{' '}
                            <span
                              className={`font-semibold ${isAtCapacity ? 'text-red-600' : 'text-slate-800'}`}
                            >
                              {remainingCapacity === null ? '—' : remainingCapacity}
                            </span>
                          </span>
                          <span>
                            {res.upcomingBookings} upcoming booking{res.upcomingBookings === 1 ? '' : 's'}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Upcoming reservations */}
          <aside>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming reservations</h2>
            <p className="mt-1 text-sm text-slate-500">Next 5 bookings, soonest first.</p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {upcomingReservations.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No upcoming reservations found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcomingReservations.map((reservation) => (
                    <li key={reservation.id} className="flex gap-4 p-4">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <span className="text-lg font-bold leading-none">{formatDay(reservation.startTime)}</span>
                        <span className="mt-1 text-[10px] font-semibold tracking-wider">
                          {formatMonth(reservation.startTime)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {reservation.resource?.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          Reserved by {reservation.user?.name}
                        </p>
                        <p
                          className="mt-1.5 text-xs font-medium text-slate-600"
                          title={`${formatDateTime(reservation.startTime)} → ${formatDateTime(reservation.endTime)}`}
                        >
                          {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}