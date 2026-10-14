import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";

const reservationInput = z.union([
  z.object({
    resourceId: z.string().uuid("Choose a valid resource."),
    userId: z.string().uuid("Choose a valid user."),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
  }),
  z.object({
    resourceId: z.string().uuid("Choose a valid resource."),
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
  }),
]);

class ReservationConflictError extends Error {}
class ResourceNotFoundError extends Error {}
class UserNotFoundError extends Error {}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");
  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");
  const from = fromValue ? new Date(fromValue) : null;
  const to = toValue ? new Date(toValue) : null;

  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Date filters must be valid dates." }, { status: 400 });
  }
  if (resourceId && !z.string().uuid().safeParse(resourceId).success) {
    return NextResponse.json({ error: "Resource filter must be a valid resource ID." }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const reservations = await prisma.reservation.findMany({
      where: {
        ...(resourceId ? { resourceId } : {}),
        status: { not: "CANCELLED" },
        ...(from || to
          ? {
              startTime: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        resource: { select: { id: true, name: true, category: true, location: true } },
        user: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Failed to list reservations:", error);
    return NextResponse.json({ error: "Unable to load reservations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = reservationInput.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Please check the reservation details.", details: input.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const startTime = new Date(input.data.startTime);
  const endTime = new Date(input.data.endTime);
  if (startTime >= endTime) {
    return NextResponse.json({ error: "End time must be later than start time." }, { status: 400 });
  }
  if (startTime <= new Date()) {
    return NextResponse.json({ error: "Reservations must start in the future." }, { status: 400 });
  }

  try {
    const prisma = getPrismaClient();
    const reservation = await prisma.$transaction(
      async (transaction) => {
        const resource = await transaction.resource.findUnique({
          where: { id: input.data.resourceId },
          select: { id: true, category: true, capacity: true },
        });
        if (!resource) {
          throw new ResourceNotFoundError("The selected resource does not exist.");
        }

        // Count overlapping reservations for the selected time range
        const overlappingCount = await transaction.reservation.count({
          where: {
            resourceId: input.data.resourceId,
            status: { not: "CANCELLED" },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        // Room condition: Max allowed booking = 1.
        // Other Categories: Max allowed = capacity || 1.
        const isRoomCategory = resource.category.trim().toLowerCase() === "room";
        const maxCapacity = isRoomCategory ? 1 : (resource.capacity ?? 1);

        if (overlappingCount >= maxCapacity) {
          throw new ReservationConflictError(
            isRoomCategory
              ? "This room is already reserved for the selected time slot."
              : `This resource has reached its maximum booking capacity (${maxCapacity}) for that time period.`
          );
        }

        const user = "userId" in input.data
          ? await transaction.user.findUnique({
              where: { id: input.data.userId },
              select: { id: true, name: true },
            })
          : await transaction.user.upsert({
              where: { email: input.data.email.toLowerCase() },
              update: { name: input.data.name },
              create: { name: input.data.name, email: input.data.email.toLowerCase() },
              select: { id: true, name: true },
            });

        if (!user) {
          throw new UserNotFoundError("The selected user does not exist.");
        }

        return transaction.reservation.create({
          data: {
            resourceId: input.data.resourceId,
            userId: user.id,
            startTime,
            endTime,
          },
          include: {
            resource: { select: { id: true, name: true, category: true, location: true } },
            user: { select: { name: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (hasErrorCode(error, "P2034")) {
      return NextResponse.json(
        { error: "Another reservation was made at the same time. Please check availability and try again." },
        { status: 409 },
      );
    }
    console.error("Failed to create reservation:", error);
    return NextResponse.json({ error: "Unable to create this reservation." }, { status: 500 });
  }
}