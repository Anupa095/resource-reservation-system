"use client";

import { useEffect, useState, type FormEvent } from "react";
import ResourceCard from "@/components/ResourceCard";
import type { ResourceView } from "@/types";

type ApiError = { error?: string };

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && ("data" in value || "error" in value || "success" in value);
}

function unwrapData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isApiEnvelope<T[]>(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const labelClass = "block text-sm font-medium text-slate-700";

const DEFAULT_CATEGORIES = ["Room", "Laptop", "Projector", "Vehicle", "Equipment"];

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceView[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("Room");
  const [customCategory, setCustomCategory] = useState("");

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...resources.map((r) => r.category)])
  );

  async function loadResources() {
    const response = await fetch("/api/resources");
    const body = (await response.json()) as ResourceView[] | ApiEnvelope<ResourceView[]> | ApiError;
    if (!response.ok) {
      throw new Error(("error" in body && body.error) || "Unable to load resources.");
    }
    setResources(unwrapData(body));
  }

  useEffect(() => {
    let active = true;
    fetch("/api/resources")
      .then(async (response) => {
        const body = (await response.json()) as ResourceView[] | ApiEnvelope<ResourceView[]> | ApiError;
        if (!response.ok) {
          throw new Error(("error" in body && body.error) || "Unable to load resources.");
        }
        if (active) setResources(unwrapData(body));
      })
      .catch((error: unknown) => {
        if (active) {
          setIsError(true);
          setMessage(error instanceof Error ? error.message : "Unable to load resources.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function addResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const form = event.currentTarget;
    const values = new FormData(form);
    
    const finalCategory = selectedCategory === "Other" ? customCategory.trim() : selectedCategory;

    if (!finalCategory) {
      setIsError(true);
      setMessage("Please provide a valid category.");
      return;
    }

    let finalCapacity: number | null = null;
    if (selectedCategory === "Room") {
      finalCapacity = 1;
    } else {
      const capVal = String(values.get("capacity") || "").trim();
      finalCapacity = capVal ? Number(capVal) : null;
    }

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          category: finalCategory,
          capacity: finalCapacity,
          location: values.get("location") || null,
          description: values.get("description") || null,
        }),
      });
      const body = (await response.json()) as ResourceView | ApiEnvelope<ResourceView> | ApiError;
      if (!response.ok) {
        throw new Error(("error" in body && body.error) || "Unable to add resource.");
      }
      const createdResource = isApiEnvelope<ResourceView>(body) ? body.data : body;
      if (!createdResource || !("id" in createdResource)) {
        throw new Error("Unable to add resource.");
      }

      form.reset();
      setSelectedCategory("Room");
      setCustomCategory("");
      setMessage("Resource added successfully.");
      await loadResources();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to add resource.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Shared spaces &amp; equipment
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Resources</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Browse the resources available to your team or add a shared resource to the directory.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-3">
          {/* Resource list */}
          <section aria-label="Resource list" className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Directory</h2>
                <p className="mt-1 text-sm text-slate-500">Everything your team can reserve.</p>
              </div>
              {!isLoading && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {resources.length} {resources.length === 1 ? "resource" : "resources"}
                </span>
              )}
            </div>

            <div className="mt-6">
              {isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : resources.length === 0 ? (
                message && isError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                    {message}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <p className="text-sm font-medium text-slate-700">No resources yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first shared resource using the form.
                    </p>
                  </div>
                )
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Add resource form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold text-slate-900">Add a resource</h2>
            <p className="mt-1 text-sm text-slate-500">Fields marked optional can be left blank.</p>

            <form className="mt-6 space-y-5" onSubmit={addResource}>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="resource-name">Name</label>
                <input
                  id="resource-name"
                  name="name"
                  required
                  maxLength={120}
                  placeholder="e.g. Cedar meeting room"
                  className={inputClass}
                />
              </div>

              {/* Dynamic Category Dropdown & Other input */}
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="resource-category">Category</label>
                <select
                  id="resource-category"
                  name="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={inputClass}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">Other (Type custom)</option>
                </select>

                {selectedCategory === "Other" && (
                  <input
                    type="text"
                    required
                    maxLength={80}
                    placeholder="Enter custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="resource-capacity">
                    Capacity {selectedCategory === "Room" ? "(Fixed to 1 for Rooms)" : "(optional)"}
                  </label>
                  <input
                    key={selectedCategory}
                    id="resource-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    step="1"
                    disabled={selectedCategory === "Room"}
                    defaultValue={selectedCategory === "Room" ? 1 : ""}
                    placeholder={selectedCategory === "Room" ? "1" : "e.g. 5"}
                    className={`${inputClass} ${
                      selectedCategory === "Room" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="resource-location">
                    Location <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input id="resource-location" name="location" maxLength={160} className={inputClass} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="resource-description">
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="resource-description"
                  name="description"
                  maxLength={1000}
                  rows={4}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add resource
              </button>

              {message && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isError
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                  role={isError ? "alert" : "status"}
                >
                  {message}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}