export const E2E_PREFIX = "e2e-";

/** Gra i egzemplarz do scenariuszy 1 i 3 (tworzone w global-setup). */
export const E2E_FLOW_GAME_TITLE = "E2E Gra przepływu";
export const E2E_FLOW_GAME_SLUG = `${E2E_PREFIX}gra-przeplywu`;
export const E2E_FLOW_COPY_INVENTORY = "E2E-FLOW-001";

export const CREDENTIALS = {
  user: { email: "user@example.com", password: "User123!" },
  librarian: { email: "bibliotekarz@example.com", password: "Bibliotekarz123!" },
  admin: { email: "admin@example.com", password: "Admin123!" },
} as const;

export const E2E_ADMIN_GAME_TITLE = "E2E Gra administracyjna";
export const E2E_ADMIN_GAME_SLUG = `${E2E_PREFIX}gra-administracyjna`;
export const E2E_ADMIN_COPY_INVENTORY = "E2E-ADMIN-001";

export const TOAST_SUCCESS_RESERVATION = "Rezerwacja została złożona";
export const STATUS_PENDING_LABEL = "Oczekuje";
export const STATUS_ACTIVE_LOAN_LABEL = "Aktywne";
export const STATUS_RETURNED_LABEL = "Zwrócone";
