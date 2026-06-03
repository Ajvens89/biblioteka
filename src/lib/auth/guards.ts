import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getActorFromDb } from "@/lib/auth/actor";
import { isAdmin, isStaff } from "@/lib/auth/session";

export async function requireUser() {
  const user = await getActorFromDb();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/?error=brak-uprawnien");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/?error=brak-uprawnien");
  return user;
}

/** Rola zawsze z profiles (DB). */
export async function requireStaffFromDb() {
  return requireStaff();
}

export async function requireAdminFromDb() {
  return requireAdmin();
}

export async function requireRoleFromDb(minRole: UserRole) {
  const user = await requireUser();
  if (!hasMinRole(user.role, minRole)) redirect("/?error=brak-uprawnien");
  return user;
}

export function hasMinRole(userRole: UserRole, required: UserRole): boolean {
  const order: UserRole[] = ["GUEST", "USER", "LIBRARIAN", "ADMIN"];
  return order.indexOf(userRole) >= order.indexOf(required);
}
