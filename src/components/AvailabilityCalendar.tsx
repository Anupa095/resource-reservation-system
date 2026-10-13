import { addDays, isSameDay, startOfDay } from "date-fns";
import type { ReservationView } from "@/types";

export default function AvailabilityCalendar({
  reservations,
}: {
  reservations: ReservationView[];
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <section className="calendar-card" aria-labelledby="availability-heading">
      <h2 id="availability-heading">Availability this week</h2>
      <div className="calendar-days">
        {days.map((day) => {
          const count = reservations.filter((reservation) =>
            isSameDay(new Date(reservation.startTime), day),
          ).length;
          return (
            <div className={`calendar-day ${count > 0 ? "is-booked" : "is-free"}`} key={day.toISOString()}>
              <span>{day.toLocaleDateString("en", { weekday: "short" })}</span>
              <strong>{count ? `${count} ${count === 1 ? "booking" : "bookings"}` : "Available"}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
