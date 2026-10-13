import "dotenv/config";
import { getPrismaClient } from "../src/lib/prisma";

const users = [
  { name: "Anupa Perera", email: "anupa@example.com", role: "ADMIN" as const },
  { name: "Kasun Kalhara", email: "kasun@example.com", role: "USER" as const },
];

const resources = [
  {
    name: "Main Conference Room A",
    category: "Meeting Room",
    capacity: 20,
    location: "1st Floor",
    description: "Equipped with 4K Projector, Whiteboard, and Video Conferencing set.",
  },
  {
    name: "Discussion Pod B",
    category: "Meeting Room",
    capacity: 4,
    location: "2nd Floor",
    description: "Small quiet room ideal for quick team syncs.",
  },
  {
    name: "Sony A7IV Camera Kit",
    category: "Equipment",
    capacity: 1,
    location: "Media Desk",
    description: "Includes 24-70mm lens, 2 extra batteries, and 128GB SD card.",
  },
  {
    name: "Dell XPS 15 Test Laptop",
    category: "Hardware",
    capacity: 1,
    location: "IT Dept",
    description: "High performance laptop for QA and heavy computational testing.",
  },
];

async function main() {
  const prisma = getPrismaClient();
  try {
    console.log("Seeding database...");

    await prisma.$transaction(async (transaction) => {
      for (const user of users) {
        await transaction.user.upsert({
          where: { email: user.email },
          update: { name: user.name, role: user.role },
          create: user,
        });
      }

      for (const resource of resources) {
        const existingResource = await transaction.resource.findFirst({
          where: { name: resource.name, category: resource.category },
          select: { id: true },
        });

        if (existingResource) {
          await transaction.resource.update({
            where: { id: existingResource.id },
            data: resource,
          });
        } else {
          await transaction.resource.create({ data: resource });
        }
      }
    });

    console.log("Seed data added successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error: unknown) => {
    console.error("Error during seeding:", error);
    process.exitCode = 1;
  });