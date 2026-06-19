import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "europe-west1" });

const cronSecret = defineSecret("CRON_SECRET");
const appUrl = defineSecret("APP_URL");

type JobName =
  | "expire-reservations"
  | "mark-overdue-loans"
  | "send-return-reminders"
  | "cleanup";

async function invokeCronJob(job: JobName): Promise<void> {
  const base = appUrl.value().replace(/\/$/, "");
  const secret = cronSecret.value();
  const res = await fetch(`${base}/api/cron/${job}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cron ${job} failed (${res.status}): ${body}`);
  }
  console.info(`Cron ${job} OK`, await res.json());
}

const scheduleOpts = {
  schedule: "every 1 hours",
  timeZone: "Europe/Warsaw",
  secrets: [cronSecret, appUrl],
  memory: "256MiB" as const,
};

export const cronExpireReservations = onSchedule(scheduleOpts, async () => {
  await invokeCronJob("expire-reservations");
});

export const cronMarkOverdueLoans = onSchedule(
  { ...scheduleOpts, schedule: "every 6 hours" },
  async () => {
    await invokeCronJob("mark-overdue-loans");
  },
);

export const cronSendReturnReminders = onSchedule(
  { ...scheduleOpts, schedule: "every 12 hours" },
  async () => {
    await invokeCronJob("send-return-reminders");
  },
);

export const cronCleanup = onSchedule(
  { ...scheduleOpts, schedule: "every 24 hours" },
  async () => {
    await invokeCronJob("cleanup");
  },
);
