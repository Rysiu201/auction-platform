import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@local.test";
  const name = "Admin";
  const password = "Admin123!"; // zmień po seede

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN" }
  });
  console.log("Admin created:", email, "password:", password);
}

main().catch(console.error).finally(() => prisma.$disconnect());
