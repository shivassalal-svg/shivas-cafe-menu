import { cookies } from "next/headers";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

const SITE_OWNER_EMAIL = "development@rysysthtechnologies.com";

export async function isSiteOwner(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("shivas_admin_session");
  if (session?.value === "authenticated") {
    return true;
  }

  const user = await getChatGPTUser();
  if (user && (user.email.toLowerCase() === SITE_OWNER_EMAIL || isLocalPreviewUser(user.email))) {
    return true;
  }

  return false;
}

export async function siteOwnerOrNull(): Promise<ChatGPTUser | null> {
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

  const user = await getChatGPTUser();
  if (user && (user.email.toLowerCase() === SITE_OWNER_EMAIL || isLocalPreviewUser(user.email))) {
    return user;
  }

  return null;
}

function isLocalPreviewUser(email?: string) {
  return process.env.NODE_ENV !== "production" && email?.toLowerCase() === "seedy@sites.test";
}
