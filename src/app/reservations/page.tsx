import { Suspense } from "react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import ReservationForm from "@/components/ReservationForm";
import { getPrismaClient } from "@/lib/prisma";
import { connection } from "next/server";
import type { ReservationView } from "@/types";

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </main>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}

async function ReservationsContent() {
  await connection();
  const reservations = await getPrismaClient().reservation.findMany({
    where: { status: { not: "CANCELLED" }, endTime: { gte: new Date() } },
    include: {
      resource: { select: { id: true, name: true, category: true, location: true } },
      user: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 100,
  });
  const reservationViews: ReservationView[] = reservations.map((reservation) => ({
    ...reservation,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Plan ahead</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reservations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Check the upcoming schedule, then reserve a resource for the time you need.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Calendar */}
        <section aria-label="Availability calendar" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <AvailabilityCalendar reservations={reservationViews} />
        </section>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-3">
          {/* Upcoming bookings */}
          <section className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Schedule</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Upcoming bookings</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {reservationViews.length} total
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {reservationViews.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-500">
                  No upcoming reservations. Your resource is waiting.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {reservationViews.map((reservation) => {
                    const start = new Date(reservation.startTime);
                    const end = new Date(reservation.endTime);
                    return (
                      <li
                        key={reservation.id}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50 sm:p-5"
                      >
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {start.toLocaleDateString("en", { month: "short" })}
                          </span>
                          <strong className="text-lg font-bold leading-none">{start.getDate()}</strong>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {reservation.resource.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {reservation.user.name} · {reservation.resource.location ?? reservation.resource.category}
                          </p>
                        </div>

                        <time className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                          {start.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {end.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Booking form */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <ReservationForm />
          </aside>
        </div>
      </main>
    </div>
  );
}