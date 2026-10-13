import type { ResourceView } from "@/types";

export default function ResourceCard({ resource }: { resource: ResourceView }) {
  return (
    <article className="resource-card">
      <h3>{resource.name}</h3>
      <p>{resource.description || "Ready to reserve for your next session."}</p>
      <div className="resource-meta">
        <span className="badge">{resource.category}</span>
        {resource.capacity !== null && <span className="badge">Up to {resource.capacity}</span>}
        {resource.location && <span className="badge">{resource.location}</span>}
      </div>
    </article>
  );
}
