"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { upsertSetting } from "@/lib/settings";
import { ok, type ActionResult } from "@/lib/actions/utils";

export async function saveSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = formData.get(key);
    if (typeof value === "string") {
      await upsertSetting(key, value);
    }
  }

  await logAudit({
    actorId: actorResult.id,
    action: "SETTINGS",
    entityType: "app_settings",
  });

  revalidatePath("/admin/ustawienia");
  return ok();
}
