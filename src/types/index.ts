export type ResourceView = {
  id: string;
  name: string;
  category: string;
  capacity: number | null;
  location: string | null;
  description: string | null;
  createdAt: string;
};

export type ReservationView = {
  id: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  resource: Pick<ResourceView, "id" | "name" | "category" | "location">;
  user: { name: string };
};
