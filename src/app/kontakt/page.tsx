import { getAppSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Kontakt" };

export default async function ContactPage() {
  const settings = await getAppSettings();
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Kontakt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{settings.foundationAddress}</p>
          <p>
            E-mail:{" "}
            <a href={`mailto:${settings.contactEmail}`} className="text-primary underline">
              {settings.contactEmail}
            </a>
          </p>
          <p>Telefon: {settings.contactPhone}</p>
        </CardContent>
      </Card>
    </div>
  );
}
