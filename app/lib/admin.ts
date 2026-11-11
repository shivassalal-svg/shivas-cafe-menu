import { getChatGPTUser } from "../chatgpt-auth";

const SITE_OWNER_EMAIL = "development@rysysthtechnologies.com";

export async function isSiteOwner() {
  const user = await getChatGPTUser();
  return user?.email.toLowerCase() === SITE_OWNER_EMAIL || isLocalPreviewUser(user?.email);
}

export async function siteOwnerOrNull() {
  const user = await getChatGPTUser();
  if (user?.email.toLowerCase() !== SITE_OWNER_EMAIL && !isLocalPreviewUser(user?.email)) return null;
  return user;
}

function isLocalPreviewUser(email?: string) {
  return process.env.NODE_ENV !== "production" && email?.toLowerCase() === "seedy@sites.test";
}
