"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { buildWeeklyDataGapsReport, reportRowsToCsv } from "@/lib/services/reports";

export async function getWeeklyReportAction() {
  await requireAdmin();
  return buildWeeklyDataGapsReport(prisma);
}

export async function exportWeeklyReportCsvAction(): Promise<string> {
  await requireAdmin();
  const report = await buildWeeklyDataGapsReport(prisma);
  return reportRowsToCsv(report.rows);
}
