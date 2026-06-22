import { PageShell } from "@/components/ui/page-shell";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

/** Wspólna oprawa formularzy logowania / rejestracji / resetu hasła */
export function AuthPageShell({ title, description, children }: Props) {
  return (
    <div className="auth-page-bg min-h-[calc(100dvh-8rem)] py-10 md:py-14">
      <PageShell width="narrow">
        <div className="mx-auto max-w-md space-y-6">
          <header className="text-center">
            <p className="text-eyebrow">Biblioteka Zakątka Fantastyki</p>
            <h1 className="text-h2 mt-2">{title}</h1>
            {description && (
              <p className="text-body mt-2 text-muted-foreground">{description}</p>
            )}
          </header>
          {children}
        </div>
      </PageShell>
    </div>
  );
}
