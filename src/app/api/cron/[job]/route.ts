import { NextResponse } from "next/server";
import { runCronJob, type JobName } from "@/lib/jobs/runner";

const VALID_JOBS = new Set<JobName>([
  "expire-reservations",
  "mark-overdue-loans",
  "send-return-reminders",
  "cleanup",
]);

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ job: string }> },
) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job } = await context.params;
  if (!VALID_JOBS.has(job as JobName)) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  try {
    const result = await runCronJob(job as JobName);
    return NextResponse.json({ ok: true, job, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Job failed";
    console.error(`[cron/${job}]`, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
