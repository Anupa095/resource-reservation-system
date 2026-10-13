"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ResourceView } from "@/types";

type ResourceOption = Pick<ResourceView, "id" | "name" | "category">;

function isResourceOption(value: unknown): value is ResourceOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string"
  );
}

function parseResources(payload: unknown): ResourceOption[] {
  let resources: unknown = payload;

  if (!Array.isArray(resources) && typeof payload === "object" && payload !== null && "data" in payload) {
    resources = payload.data;
  }

  if (!Array.isArray(resources) || !resources.every(isResourceOption)) {
    throw new Error("Unexpected response while loading resources.");
  }

  return resources;
}

function getApiError(payload: unknown): string | undefined {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
}

export default function ReservationForm() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [resourceError, setResourceError] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/resources")
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getApiError(body) || "Unable to load resources.");
        }
        return parseResources(body);
      })
      .then((items) => {
        if (active) setResources(items);
      })
      .catch((error: unknown) => {
        if (active) setResourceError(error instanceof Error ? error.message : "Unable to load resources.");
      });
    return () => { active = false; };
  }, []);

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const startTime = new Date(String(formData.get("startTime")));
    const endTime = new Date(String(formData.get("endTime")));

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: formData.get("resourceId"),
          name: formData.get("name"),
          email: formData.get("email"),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getApiError(body) || "Unable to create reservation.");

      form.reset();
      setMessage("Reservation confirmed. It is now visible in the availability calendar.");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to create reservation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>New reservation</h2>
      {resourceError && <p className="form-message error" role="alert">{resourceError}</p>}
      <form className="form-stack" onSubmit={submitReservation}>
        <div className="field">
          <label htmlFor="reservation-resource">Resource</label>
          <select id="reservation-resource" name="resourceId" required defaultValue="">
            <option value="" disabled>Select a resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>{resource.name} · {resource.category}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="reservation-name">Your name</label>
          <input id="reservation-name" name="name" autoComplete="name" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="reservation-email">Email address</label>
          <input id="reservation-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
        <div className="field">
          <label htmlFor="reservation-start">Starts</label>
          <input id="reservation-start" name="startTime" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="reservation-end">Ends</label>
          <input id="reservation-end" name="endTime" type="datetime-local" required />
        </div>
        <button className="button button-primary" type="submit" disabled={isSubmitting || resources.length === 0}>
          {isSubmitting ? "Saving..." : "Reserve resource"}
        </button>
        {message && <p className={`form-message ${isError ? "error" : ""}`} role={isError ? "alert" : "status"}>{message}</p>}
      </form>
    </section>
  );
}
