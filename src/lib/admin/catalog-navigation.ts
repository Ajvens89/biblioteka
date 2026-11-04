/** Owner tools for the public game catalog. Historical circulation data stays in the database. */
export const CATALOG_ADMIN_NAVIGATION = [
  { label: "Katalog", links: [
    { href: "/admin", label: "Podsumowanie", icon: "dashboard", exact: true },
    { href: "/admin/gry", label: "Gry", icon: "games", exact: true },
    { href: "/admin/gry/nowa", label: "Dodaj grę", icon: "add", exact: true },
    { href: "/admin/import", label: "Import / eksport", icon: "import", exact: false },
    { href: "/admin/jakosc-danych", label: "Jakość danych", icon: "quality", exact: false },
    { href: "/admin/duplikaty", label: "Duplikaty", icon: "duplicates", exact: false },
  ] },
  { label: "Ustawienia", links: [
    { href: "/admin/ustawienia", label: "Kontakt", icon: "settings", exact: false },
    { href: "/admin/logi", label: "Historia zmian", icon: "logs", exact: false },
  ] },
] as const;

export const CATALOG_SETTINGS_KEYS = ["contactEmail", "contactPhone", "foundationAddress"] as const;
