"use client";

import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  sortOrder: number;
  outOfStock?: boolean;
};
type Category = { id: string; name: string; sortOrder: number; items: MenuItem[] };

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 640;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", 0.82);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [filterOos, setFilterOos] = useState(false);
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
      .then((data) => {
        setMenu(data);
        setMessage("All saved changes are live on the customer menu.");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  const qrUrl = useMemo(
    () =>
      menuUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=480x480&format=png&data=${encodeURIComponent(menuUrl)}`
        : "",
    [menuUrl]
  );

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

  const totalItems = useMemo(
    () => menu.reduce((count, category) => count + category.items.length, 0),
    [menu]
  );

  const oosCount = useMemo(
    () =>
      menu.reduce(
        (count, category) => count + category.items.filter((item) => item.outOfStock).length,
        0
      ),
    [menu]
  );

  const visibleMenu = useMemo(
    () =>
      menu
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => {
            const matchesQuery =
              !query || `${item.name} ${category.name}`.toLowerCase().includes(query.toLowerCase());
            const matchesOos = !filterOos || Boolean(item.outOfStock);
            return matchesQuery && matchesOos;
          }),
        }))
        .filter(
          (category) =>
            category.items.length > 0 ||
            (!filterOos && (!query || category.name.toLowerCase().includes(query.toLowerCase())))
        ),
    [menu, query, filterOos]
  );

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <a className="menu-brand" href="/">
          <span className="menu-mark">S</span>
          <span>
            Shiva’s Cafe<small>Independent Menu Studio</small>
          </span>
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
        <p>
          Add, update, or remove menu options. Upload dish photos directly and toggle items out of stock during service.
        </p>
      </section>

      <div className="studio-layout">
        <aside className="qr-panel panel">
          <p className="eyebrow">Always-current QR</p>
          <h2>Customer menu</h2>
          <p>Print this code once. Guests see the latest saved menu and live stock status every time they scan.</p>
          {qrUrl ? (
            <img className="qr-image" src={qrUrl} alt="QR code for the read-only Shiva’s Cafe menu" />
          ) : (
            <div className="qr-skeleton" />
          )}
          <a className="solid-button full-button" href={qrUrl || "/"} target="_blank" rel="noreferrer">
            Open QR image ↗
          </a>
          <a className="text-link" href={menuUrl || "/"} target="_blank" rel="noreferrer">
            Open customer menu
          </a>
          <div className="qr-tip">
            Menu edits, photos, and stock toggles reflect instantly on the live QR menu.
          </div>
        </aside>

        <section className="catalog-panel panel">
          <div className="catalog-head">
            <div>
              <p className="eyebrow">Menu catalog</p>
              <h2>{totalItems} options</h2>
              <div className="stock-summary-bar">
                <button
                  type="button"
                  className={`filter-pill ${!filterOos ? "active" : ""}`}
                  onClick={() => setFilterOos(false)}
                >
                  All ({totalItems})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterOos ? "active-oos" : ""}`}
                  onClick={() => setFilterOos((prev) => !prev)}
                >
                  Out of stock ({oosCount})
                </button>
              </div>
            </div>
            <input
              className="search-field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find an item or category"
              aria-label="Search menu"
            />
          </div>

          <form
            className="new-category"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!newCategory.trim()) return;
              await save({ action: "save-category", name: newCategory }, "Category added to the live menu.");
              setNewCategory("");
            }}
          >
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="New category name"
              aria-label="New category name"
            />
            <button className="button" disabled={busy}>
              ＋ Add category
            </button>
          </form>

          <div className="category-stack">
            {visibleMenu.map((category) => (
              <details className="manage-category" key={category.id} open={query || filterOos ? true : undefined}>
                <summary>
                  <span>{category.name}</span>
                  <span className="category-count">{category.items.length} items</span>
                </summary>
                <div className="category-edit-row">
                  <input
                    className="category-rename"
                    aria-label={`Rename ${category.name}`}
                    defaultValue={category.name}
                    key={`${category.id}-${category.name}`}
                    onBlur={async (event) => {
                      const name = event.currentTarget.value.trim();
                      if (name && name !== category.name)
                        await save({ action: "save-category", id: category.id, name }, "Category name updated.");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <button
                    className="text-danger"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Remove “${category.name}” and all ${category.items.length} items from the menu?`
                        )
                      ) {
                        await save({ action: "delete-category", id: category.id }, "Category removed from the live menu.");
                      }
                    }}
                  >
                    Remove category
                  </button>
                </div>

                <div className="manage-item-list">
                  {category.items.map((item) => (
                    <ItemEditor key={item.id} item={item} categoryId={category.id} busy={busy} save={save} />
                  ))}
                </div>

                <NewItemForm
                  categoryId={category.id}
                  categoryName={category.name}
                  busy={busy}
                  save={save}
                />
              </details>
            ))}
            {!visibleMenu.length && <div className="empty-state">No matching menu options.</div>}
          </div>
          <div className="save-status" aria-live="polite">
            {message}
          </div>
        </section>
      </div>
    </main>
  );
}

function NewItemForm({
  categoryId,
  categoryName,
  busy,
  save,
}: {
  categoryId: string;
  categoryName: string;
  busy: boolean;
  save: (action: Record<string, string>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [outOfStock, setOutOfStock] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch (e) {
      console.error("Photo upload failed:", e);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await save(
      {
        action: "save-item",
        categoryId,
        name: name.trim(),
        price: price.trim(),
        description: description.trim(),
        image: image.trim(),
        outOfStock: outOfStock ? "true" : "false",
      },
      `“${name}” added to the live menu.`
    );
    setName("");
    setPrice("");
    setDescription("");
    setImage("");
    setOutOfStock(false);
  }

  return (
    <form className="new-item-form" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New item name"
        aria-label={`New item in ${categoryName}`}
        required
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="₹ price"
        aria-label="New item price"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Size or short detail"
        aria-label="New item details"
      />

      <div className="new-item-image-row">
        {image ? (
          <div className="preview-wrap">
            <img src={image} className="new-item-preview-thumb" alt="Preview" />
            <button
              type="button"
              className="text-danger small-link"
              onClick={() => setImage("")}
            >
              ✕
            </button>
          </div>
        ) : null}
        <label className="image-upload-button">
          <span>{uploading ? "Compressing…" : "📷 Upload photo"}</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={busy || uploading}
            onChange={handleFileSelect}
          />
        </label>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="or image URL"
          aria-label="New item image URL"
        />
      </div>

      <label className="new-item-stock-toggle">
        <input
          type="checkbox"
          checked={outOfStock}
          onChange={(e) => setOutOfStock(e.target.checked)}
        />
        <span>Out of stock</span>
      </label>

      <button className="button" disabled={busy || uploading}>
        Add item
      </button>
    </form>
  );
}

function ItemEditor({
  item,
  categoryId,
  busy,
  save,
}: {
  item: MenuItem;
  categoryId: string;
  busy: boolean;
  save: (action: Record<string, string>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  const [description, setDescription] = useState(item.description);
  const [image, setImage] = useState(item.image);
  const [outOfStock, setOutOfStock] = useState(Boolean(item.outOfStock));
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(item.name);
    setPrice(item.price);
    setDescription(item.description);
    setImage(item.image);
    setOutOfStock(Boolean(item.outOfStock));
  }, [item.name, item.price, item.description, item.image, item.outOfStock]);

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      setImage(compressed);
      await save(
        {
          action: "save-item",
          id: item.id,
          categoryId,
          name,
          price,
          description,
          image: compressed,
          outOfStock: outOfStock ? "true" : "false",
        },
        `Photo updated for “${name}”.`
      );
    } catch (e) {
      console.error("Failed to upload photo:", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className={`manage-item ${outOfStock ? "manage-item-oos" : ""}`}
      onSubmit={async (event) => {
        event.preventDefault();
        await save(
          {
            action: "save-item",
            id: item.id,
            categoryId,
            name,
            price,
            description,
            image,
            outOfStock: outOfStock ? "true" : "false",
          },
          `“${name}” updated and published.`
        );
      }}
    >
      <div className="thumb-wrap">
        {image ? (
          <img className="manage-thumb" src={image} alt="" loading="lazy" />
        ) : (
          <div className="manage-thumb image-placeholder">S</div>
        )}
        {outOfStock && <span className="mini-oos-badge">OOS</span>}
        <label className="thumb-upload-overlay" title="Upload new photo">
          <span>{uploading ? "…" : "📷"}</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={busy || uploading}
            onChange={handlePhotoUpload}
          />
        </label>
      </div>

      <div className="manage-fields">
        <div className="manage-field-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={`${item.name} name`}
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            aria-label={`${item.name} price`}
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-label={`${item.name} details`}
          />
        </div>
        <div className="manage-field-row secondary-fields">
          <div className="new-item-image-row">
            <label className="image-upload-button small-button">
              <span>{uploading ? "…" : "📷 Photo"}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={busy || uploading}
                onChange={handlePhotoUpload}
              />
            </label>
            <input
              value={image}
              onChange={(event) => setImage(event.target.value)}
              aria-label={`${item.name} image path`}
              placeholder="Photo URL or uploaded"
            />
          </div>

          <button
            type="button"
            className={`stock-pill-btn ${outOfStock ? "pill-oos" : "pill-instock"}`}
            disabled={busy}
            onClick={async () => {
              const newOos = !outOfStock;
              setOutOfStock(newOos);
              await save(
                {
                  action: "toggle-stock",
                  id: item.id,
                  categoryId,
                  outOfStock: newOos ? "true" : "false",
                },
                newOos ? `“${name}” is now marked Out of stock.` : `“${name}” is now marked In stock.`
              );
            }}
            title="Click to toggle stock status"
          >
            {outOfStock ? "🔴 Out of stock" : "🟢 In stock"}
          </button>
          <button className="button small-button" disabled={busy || uploading}>
            Save
          </button>
          <button
            className="text-danger"
            type="button"
            disabled={busy}
            onClick={async () => {
              if (window.confirm(`Remove “${item.name}” from the menu?`)) {
                await save({ action: "delete-item", id: item.id, categoryId }, "Menu option removed.");
              }
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </form>
  );
}
