import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";

// Zod schema for resource validation
const resourceInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  category: z.string().trim().min(1, "Category is required.").max(80),
  capacity: z.number().int().positive().nullable().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

// 1. GET: සියලුම සම්පත් ලබාගැනීම
export async function GET() {
  try {
    const resources = await getPrismaClient().resource.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    
    // Frontend එකට පහසු වන පරිදි success flag එකක් සමඟ යැවීම
    return NextResponse.json({ success: true, data: resources }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch resources:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resources." },
      { status: 500 },
    );
  }
}

// 2. POST: අලුත් සම්පතක් එකතු කිරීම
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const input = resourceInput.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Please check the resource details.",
        details: input.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const resource = await getPrismaClient().resource.create({
      data: {
        ...input.data,
        capacity: input.data.capacity ?? null,
        location: input.data.location || null,
        description: input.data.description || null,
      },
    });

    return NextResponse.json({ success: true, data: resource }, { status: 201 });
  } catch (error) {
    console.error("Failed to create resource:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create resource." },
      { status: 500 },
    );
  }
}