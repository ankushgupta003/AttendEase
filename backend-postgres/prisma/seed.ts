import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { UserRole } from "../src/constants/enums.js";

const prisma = new PrismaClient();

async function main() {
  const adminUser = process.env.SEED_ADMIN_USER ?? "admin";
  const adminPass = process.env.SEED_ADMIN_PASS ?? "admin123";
  const hrUser = process.env.SEED_HR_USER ?? "hr";
  const hrPass = process.env.SEED_HR_PASS ?? "hr123";

  const adminHash = await bcrypt.hash(adminPass, 10);
  const hrHash = await bcrypt.hash(hrPass, 10);

  await prisma.user.upsert({
    where: { username: adminUser },
    create: { username: adminUser, passwordHash: adminHash, role: UserRole.ADMIN },
    update: { passwordHash: adminHash, role: UserRole.ADMIN }
  });

  await prisma.user.upsert({
    where: { username: hrUser },
    create: { username: hrUser, passwordHash: hrHash, role: UserRole.HR },
    update: { passwordHash: hrHash, role: UserRole.HR }
  });

  await prisma.salaryType.upsert({
    where: { name: "Nuvo" },
    create: { name: "Nuvo", isActive: true },
    update: { isActive: true }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
