import { chatGPTSignInPath } from "../chatgpt-auth";
import { siteOwnerOrNull } from "../lib/admin";
import { MenuManager } from "./menu-manager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const owner = await siteOwnerOrNull();
  if (!owner) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <span className="menu-mark">S</span>
          <p className="eyebrow">Shiva’s Cafe · Menu Studio</p>
          <h1>Owner sign-in required</h1>
          <p>The menu manager is restricted to the café owner. The customer menu stays read-only.</p>
          <a className="solid-button" href={chatGPTSignInPath("/admin")} target="_top">Sign in to manage menu</a>
          <a className="text-link" href="/">Back to menu</a>
        </section>
      </main>
    );
  }

  return <MenuManager ownerName={owner.displayName} />;
}
