import { cookies } from "next/headers";

export type AdminUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const SITE_OWNER_EMAIL = "development@rysysthtechnologies.com";

export async function isSiteOwner(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("shivas_admin_session");
  return session?.value === "authenticated";
}

export async function siteOwnerOrNull(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("shivas_admin_session");
  if (session?.value === "authenticated") {
    return {
      userId: "owner",
      displayName: "Café Owner",
      email: SITE_OWNER_EMAIL,
      fullName: "Shiva’s Café Owner",
    };
  }

  return null;
}
