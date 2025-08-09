import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

(async () => {
  const email = "admin@local.test";
  const name = "Admin";
  const password = "Admin123!";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" }
  });

  console.log("Admin ensured:", email);
  await prisma.$disconnect();
})();
