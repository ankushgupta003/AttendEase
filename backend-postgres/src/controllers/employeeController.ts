import type { Request, Response, NextFunction } from "express";
import { createEmployee, listEmployees, updateEmployee, updateEmployeeShift, getEmployeeLeaveSummary, getEmployeeAttendanceSummary } from "../services/attendanceService.js";

type EmployeeDto = {
  id: string;
  code: string;
  name: string;
  department: string;
  shift: string;
  active: boolean;
  overtimeEligible: boolean;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  salary?: number;
  salaryTypeId?: string;
  salaryTypeName?: string | null;
};

function toEmployeeDto(employee: any): EmployeeDto {
  return {
    id: employee.id,
    code: employee.code,
    name: employee.name,
    department: employee.department,
    shift: employee.shift?.name ?? "General",
    active: employee.active,
    overtimeEligible: employee.overtimeEligible ?? false,
    email: employee.email ?? null,
    phone: employee.phone ?? null,
    designation: employee.designation ?? null,
    salary: employee.salary ?? 0,
    salaryTypeId: employee.salaryTypeId,
    salaryTypeName: employee.salaryType?.name ?? null
  };
}

export async function listEmployeesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employees = await listEmployees();
    return res.json(employees.map(toEmployeeDto));
  } catch (error) {
    return next(error);
  }
}

export async function createEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, name, department, shiftName, salaryTypeId, active, overtimeEligible, email, phone, designation, salary } = req.body as {
      code: string;
      name: string;
      department: string;
      shiftName?: string;
      salaryTypeId?: string;
      active?: boolean;
      overtimeEligible?: boolean;
      email?: string;
      phone?: string;
      designation?: string;
      salary?: number;
    };
    const created = await createEmployee({ code, name, department, shiftName, salaryTypeId, active, overtimeEligible, email, phone, designation, salary });
    return res.status(201).json(toEmployeeDto(created));
  } catch (error) {
    return next(error);
  }
}

export async function updateEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const updated = await updateEmployee(employeeId, req.body);
    return res.json(toEmployeeDto(updated));
  } catch (error) {
    return next(error);
  }
}

export async function updateEmployeeShiftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const { shiftName } = req.body as { shiftName: string };
    if (!shiftName) {
      return res.status(400).json({ message: "shiftName is required." });
    }
    const updated = await updateEmployeeShift(employeeId, shiftName);
    return res.json(toEmployeeDto(updated));
  } catch (error) {
    return next(error);
  }
}

export async function getEmployeeLeaveSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const period = req.query.period === 'monthly' ? 'monthly' : 'annual';

    const summary = await getEmployeeLeaveSummary(employeeId, { year, month, period });
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}

export async function getEmployeeAttendanceSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeId } = req.params;
    const month = req.query.month as string;
    const period = req.query.period === "quarterly"
      ? "quarterly"
      : req.query.period === "yearly"
        ? "yearly"
        : "monthly";

    if (!month) {
      return res.status(400).json({ error: "Month parameter required (YYYY-MM format)" });
    }

    const summary = await getEmployeeAttendanceSummary(employeeId, month, period);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}
