import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { expireReservations } from "@/lib/jobs/expire-reservations";
import { markOverdueLoansJob, runCleanupJobs, sendReturnRemindersJob } from "@/lib/jobs/loan-maintenance";

export type JobName =
  | "expire-reservations"
  | "mark-overdue-loans"
  | "send-return-reminders"
  | "cleanup";

export type JobResult = Record<string, number>;

export async function runCronJob(
  jobName: JobName,
  db: PrismaClient = prisma,
): Promise<JobResult> {
  const log = await db.cronJobLog.create({
    data: { jobName, status: "running" },
  });

  try {
    let result: JobResult;
    switch (jobName) {
      case "expire-reservations": {
        const r = await expireReservations(db);
        result = { expired: r.expired, skipped: r.skipped };
        break;
      }
      case "mark-overdue-loans": {
        const r = await markOverdueLoansJob(db);
        result = { marked: r.marked };
        break;
      }
      case "send-return-reminders": {
        const r = await sendReturnRemindersJob(db);
        result = { sent: r.sent };
        break;
      }
      case "cleanup": {
        const r = await runCleanupJobs(db);
        result = { rateLimits: r.rateLimits, resetTokens: r.resetTokens };
        break;
      }
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    const processed = Object.values(result).reduce((a, b) => a + b, 0);
    await db.cronJobLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        processed,
        metadata: result,
      },
    });

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.cronJobLog.update({
      where: { id: log.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        error: message,
      },
    });
    throw e;
  }
}
