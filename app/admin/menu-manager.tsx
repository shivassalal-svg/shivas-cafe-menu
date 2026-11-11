"use client";

import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  sortOrder: number;
};
type Category = { id: string; name: string; sortOrder: number; items: MenuItem[] };

async function requestMenu(action: Record<string, string>) {
  const response = await fetch("/api/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const body = (await response.json()) as { error?: string } | Category[];
  if (!response.ok) throw new Error((body as { error?: string })?.error || "Could not save changes.");
  return body as Category[];
}

export function MenuManager({ ownerName }: { ownerName: string }) {
  const [menu, setMenu] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("Loading menu…");
  const [busy, setBusy] = useState(false);
  const [menuUrl, setMenuUrl] = useState("");

  useEffect(() => {
    setMenuUrl(new URL("/", window.location.origin).toString());
    fetch("/api/menu", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load menu.");
        return (await response.json()) as Category[];
      })
      .then((data) => { setMenu(data); setMessage("All saved changes are live on the customer menu."); })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  const qrUrl = useMemo(() => menuUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=480x480&format=png&data=${encodeURIComponent(menuUrl)}`
    : "", [menuUrl]);

  async function save(action: Record<string, string>, success: string) {
    setBusy(true);
    setMessage("Saving menu…");
    try {
      const data = await requestMenu(action);
      setMenu(data);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  const visibleMenu = menu.map((category) => ({
    ...category,
    items: category.items.filter((item) =>
      `${item.name} ${category.name}`.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((category) => !query || category.items.length > 0 || category.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <a className="menu-brand" href="/">
          <span className="menu-mark">S</span>
          <span>Shiva’s Cafe<small>Independent Menu Studio</small></span>
        </a>
        <div className="studio-user">
          <span>Signed in as {ownerName}</span>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/auth", { method: "DELETE" });
              window.location.reload();
            }}
            className="text-link"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Sign out
          </button>
          <a href="/">Open customer menu ↗</a>
        </div>
      </header>

      <section className="studio-intro">
        <p className="eyebrow">Owner dashboard</p>
        <h1>Manage your menu.</h1>
        <p>Add, update, or remove menu options. The view-only customer menu and its QR code update together.</p>
      </section>

      <div className="studio-layout">
        <aside className="qr-panel panel">
          <p className="eyebrow">Always-current QR</p>
          <h2>Customer menu</h2>
          <p>Print this code once. Guests see the latest saved menu every time they scan.</p>
          {qrUrl ? <img className="qr-image" src={qrUrl} alt="QR code for the read-only Shiva’s Cafe menu" /> : <div className="qr-skeleton" />}
          <a className="solid-button full-button" href={qrUrl || "/"} target="_blank" rel="noreferrer">Open QR image ↗</a>
          <a className="text-link" href={menuUrl || "/"} target="_blank" rel="noreferrer">Open customer menu</a>
          <div className="qr-tip">Menu edits are saved to the shared database. The same printed QR keeps working.</div>
        </aside>

        <section className="catalog-panel panel">
          <div className="catalog-head">
            <div><p className="eyebrow">Menu catalog</p><h2>{menu.reduce((count, category) => count + category.items.length, 0)} options</h2></div>
            <input className="search-field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an item or category" aria-label="Search menu" />
          </div>

          <form className="new-category" onSubmit={async (event) => {
            event.preventDefault();
            if (!newCategory.trim()) return;
            await save({ action: "save-category", name: newCategory }, "Category added to the live menu.");
            setNewCategory("");
          }}>
            <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category name" aria-label="New category name" />
            <button className="button" disabled={busy}>＋ Add category</button>
          </form>

          <div className="category-stack">
            {visibleMenu.map((category) => (
              <details className="manage-category" key={category.id} open={query ? true : undefined}>
                <summary><span>{category.name}</span><span className="category-count">{category.items.length} items</span></summary>
                <div className="category-edit-row">
                  <input className="category-rename" aria-label={`Rename ${category.name}`} defaultValue={category.name} key={`${category.id}-${category.name}`} onBlur={async (event) => {
                    const name = event.currentTarget.value.trim();
                    if (name && name !== category.name) await save({ action: "save-category", id: category.id, name }, "Category name updated.");
                  }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
                  <button className="text-danger" disabled={busy} onClick={async () => {
                    if (window.confirm(`Remove “${category.name}” and all ${category.items.length} items from the menu?`)) {
                      await save({ action: "delete-category", id: category.id }, "Category removed from the live menu.");
                    }
                  }}>Remove category</button>
                </div>

                <div className="manage-item-list">
                  {category.items.map((item) => <ItemEditor key={item.id} item={item} categoryId={category.id} busy={busy} save={save} />)}
                </div>

                <form className="new-item-form" onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const name = String(data.get("name") || "").trim();
                  if (!name) return;
                  await save({ action: "save-item", categoryId: category.id, name, price: String(data.get("price") || ""), description: String(data.get("description") || ""), image: String(data.get("image") || "") }, "Item added to the live menu.");
                  form.reset();
                }}>
                  <input name="name" placeholder="New item name" aria-label={`New item in ${category.name}`} required />
                  <input name="price" placeholder="₹ price" aria-label="New item price" />
                  <input name="description" placeholder="Size or short detail" aria-label="New item details" />
                  <input name="image" placeholder="Image path (optional)" aria-label="New item image path" />
                  <button className="button" disabled={busy}>Add item</button>
                </form>
              </details>
            ))}
            {!visibleMenu.length && <div className="empty-state">No matching menu options.</div>}
          </div>
          <div className="save-status" aria-live="polite">{message}</div>
        </section>
      </div>
    </main>
  );
}

function ItemEditor({ item, categoryId, busy, save }: {
  item: MenuItem;
  categoryId: string;
  busy: boolean;
  save: (action: Record<string, string>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  const [description, setDescription] = useState(item.description);
  const [image, setImage] = useState(item.image);
  return (
    <form className="manage-item" onSubmit={async (event) => {
      event.preventDefault();
      await save({ action: "save-item", id: item.id, categoryId, name, price, description, image }, "Menu option updated and published.");
    }}>
      {item.image ? <img className="manage-thumb" src={item.image} alt="" loading="lazy" /> : <div className="manage-thumb image-placeholder">S</div>}
      <div className="manage-fields">
        <div className="manage-field-row">
          <input value={name} onChange={(event) => setName(event.target.value)} aria-label={`${item.name} name`} />
          <input value={price} onChange={(event) => setPrice(event.target.value)} aria-label={`${item.name} price`} />
          <input value={description} onChange={(event) => setDescription(event.target.value)} aria-label={`${item.name} details`} />
        </div>
        <div className="manage-field-row secondary-fields">
          <input value={image} onChange={(event) => setImage(event.target.value)} aria-label={`${item.name} image path`} />
          <button className="button small-button" disabled={busy}>Save</button>
          <button className="text-danger" type="button" disabled={busy} onClick={async () => {
            if (window.confirm(`Remove “${item.name}” from the menu?`)) {
              await save({ action: "delete-item", id: item.id, categoryId }, "Menu option removed.");
            }
          }}>Remove</button>
        </div>
      </div>
    </form>
  );
}
