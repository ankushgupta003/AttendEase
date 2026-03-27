import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { dayjs, isSunday, toDateStart } from "../utils/date.js";
import { AttendanceStatus } from "../constants/enums.js";

export function startDailyProcessor() {
  cron.schedule("0 1 * * *", async () => {
    const today = dayjs().startOf("day");
    const todayDate = toDateStart(today);

    const employees = await prisma.employee.findMany();
    for (const employee of employees) {
      const exists = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: todayDate } }
      });
      if (exists) continue;

      const status = isSunday(today) ? AttendanceStatus.WEEK_OFF : AttendanceStatus.ABSENT;
      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: todayDate,
          status,
          isLate: false
        }
      });
    }
  });
}
