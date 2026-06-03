import { DEFAULT_SETTINGS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type AppSettingsMap = typeof DEFAULT_SETTINGS;

export async function getAppSettings(): Promise<AppSettingsMap> {
  const rows = await prisma.appSetting.findMany();
  const map = { ...DEFAULT_SETTINGS } as Record<string, string>;
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map as AppSettingsMap;
}

export async function getSettingNumber(key: keyof AppSettingsMap, fallback: number) {
  const settings = await getAppSettings();
  const v = parseInt(settings[key], 10);
  return Number.isFinite(v) ? v : fallback;
}

export async function upsertSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
