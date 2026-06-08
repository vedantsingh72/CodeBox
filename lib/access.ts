import { UserRole } from "@prisma/client";
import { currentUserRole } from "@/modules/auth/actions";

export async function isAdminUser(): Promise<boolean> {
  const role = await currentUserRole();
  return role === UserRole.ADMIN;
}
