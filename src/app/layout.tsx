import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { parseTheme, THEME_COOKIE, themeHtmlClasses } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={cn(inter.variable, poppins.variable, ...themeHtmlClasses(initialTheme))}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <Providers initialTheme={initialTheme}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
