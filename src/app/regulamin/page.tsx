import { getAppSettings } from "@/lib/settings";

export const metadata = { title: "Regulamin" };

export default async function TermsPage() {
  const settings = await getAppSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 prose dark:prose-invert">
      <h1>Regulamin</h1>
      <div className="whitespace-pre-wrap">{settings.termsText}</div>
    </div>
  );
}
