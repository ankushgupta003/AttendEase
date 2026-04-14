import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

type CompanyInfoPayload = {
  name?: string;
  gstNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
};

export async function getCompanyInfoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const companyInfo = await prisma.companyInfo.findFirst();
    return res.json(companyInfo ?? null);
  } catch (error) {
    return next(error);
  }
}

export async function updateCompanyInfoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as CompanyInfoPayload;
    const current = await prisma.companyInfo.findFirst();

    if (current) {
      const updated = await prisma.companyInfo.update({
        where: { id: current.id },
        data: payload,
      });
      return res.json(updated);
    }

    const created = await prisma.companyInfo.create({
      data: payload,
    });
    return res.json(created);
  } catch (error) {
    return next(error);
  }
}
