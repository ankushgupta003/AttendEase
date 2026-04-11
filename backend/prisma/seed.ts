import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { UserRole } from "../src/constants/enums.js";

const prisma = new PrismaClient();

async function main() {
  const adminUser = process.env.SEED_ADMIN_USER ?? "admin";
  const adminPass = process.env.SEED_ADMIN_PASS ?? "admin";
  const hrUser = process.env.SEED_HR_USER ?? "hr";
  const hrPass = process.env.SEED_HR_PASS ?? "hr";

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

  const defaultLeaveTypes = [
    {
      code: "CL",
      name: "Casual Leave",
      paidLeave: true,
      carryForward: false,
      paymentOnLapse: false,
      maxDays: 12
    },
    {
      code: "PL",
      name: "Privilege Leave",
      paidLeave: true,
      carryForward: true,
      paymentOnLapse: false,
      maxDays: 15
    },
    {
      code: "SL",
      name: "Sick Leave",
      paidLeave: true,
      carryForward: false,
      paymentOnLapse: false,
      maxDays: 10
    }
  ];

  for (const leaveType of defaultLeaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: leaveType.code },
      create: leaveType,
      update: leaveType
    });
  }
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
