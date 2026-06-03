import { requireUser } from "@/lib/auth/guards";
import { ProfileForm } from "@/components/account/profile-form";
import { ROLE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata = { title: "Moje konto" };

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Mój profil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Rola: {ROLE_LABELS[profile.role]} · {profile.email}
          </p>
          <ProfileForm fullName={profile.fullName ?? ""} phone={profile.phone ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
