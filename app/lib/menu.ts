import fs from "node:fs/promises";
import path from "node:path";
import sourceMenu from "../../data/source-menu.json";

export type MenuItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  sortOrder: number;
  outOfStock?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

type SourceCategory = { name: string; items: Omit<MenuItem, "sortOrder">[] };

const TMP_FILE = path.join("/tmp", "shivas-cafe-menu.json");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "shivassalal-svg/shivas-cafe-menu";
const MENU_FILE_PATH = "data/menu-data.json";

// In-memory cache for fast repeat requests
let memoryMenu: MenuCategory[] | null = null;
let lastMenuFetchTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds

function normalizeMenu(data: unknown): MenuCategory[] {
  if (!Array.isArray(data)) return getDefaultMenu();
  return (data as any[]).map((category: any, categoryIndex: number) => ({
    id: category.id || `category-${String(categoryIndex).padStart(2, "0")}`,
    name: category.name || "Untitled Category",
    sortOrder: typeof category.sortOrder === "number" ? category.sortOrder : categoryIndex,
    items: Array.isArray(category.items)
      ? category.items.map((item: any, itemIndex: number) => ({
          id: item.id || `item-${categoryIndex}-${itemIndex}`,
          name: item.name || "",
          price: item.price || "",
          description: item.description || "",
          image: item.image || "",
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : itemIndex,
          outOfStock: Boolean(item.outOfStock),
        }))
      : [],
  }));
}

function getDefaultMenu(): MenuCategory[] {
  return (sourceMenu as SourceCategory[]).map((category, categoryIndex) => ({
    id: `category-${String(categoryIndex).padStart(2, "0")}`,
    name: category.name,
    sortOrder: categoryIndex,
    items: category.items.map((item, itemIndex) => ({
      ...item,
      sortOrder: itemIndex,
      outOfStock: Boolean(item.outOfStock),
    })),
  }));
}

async function loadMenu(): Promise<MenuCategory[]> {
  const now = Date.now();
  if (memoryMenu && now - lastMenuFetchTime < CACHE_TTL_MS) {
    return memoryMenu;
  }

  // 1. Fetch from GitHub repository (authoritative shared store)
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${MENU_FILE_PATH}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { content?: string };
        if (data.content) {
          const decoded = Buffer.from(data.content, "base64").toString("utf-8");
          const parsed = JSON.parse(decoded);
          const normalized = normalizeMenu(parsed);
          if (normalized.length > 0) {
            memoryMenu = normalized;
            lastMenuFetchTime = now;
            return memoryMenu;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load menu from GitHub:", e);
    }
  }

  // 2. Fallback to /tmp
  try {
    const data = await fs.readFile(TMP_FILE, "utf-8");
    const parsed = JSON.parse(data);
    const normalized = normalizeMenu(parsed);
    if (normalized.length > 0) {
      memoryMenu = normalized;
      lastMenuFetchTime = now;
      return memoryMenu;
    }
  } catch {
    // ignore
  }

  // 3. Fallback to local data/menu-data.json
  try {
    const localData = await fs.readFile(
      path.join(process.cwd(), "data", "menu-data.json"),
      "utf-8"
    );
    const parsed = JSON.parse(localData);
    const normalized = normalizeMenu(parsed);
    if (normalized.length > 0) {
      memoryMenu = normalized;
      lastMenuFetchTime = now;
      return memoryMenu;
    }
  } catch {
    // ignore
  }

  // 4. Fallback to initial source menu
  memoryMenu = getDefaultMenu();
  lastMenuFetchTime = now;
  return memoryMenu;
}

async function saveMenuData(menu: MenuCategory[]): Promise<void> {
  const normalized = normalizeMenu(menu);
  memoryMenu = normalized;
  lastMenuFetchTime = Date.now();
  const jsonStr = JSON.stringify(normalized, null, 2);

  // 1. Save to /tmp
  try {
    await fs.writeFile(TMP_FILE, jsonStr, "utf-8");
  } catch {
    // ignore
  }

  // 2. Save locally if writable
  try {
    await fs.writeFile(path.join(process.cwd(), "data", "menu-data.json"), jsonStr, "utf-8");
  } catch {
    // ignore
  }

  // 3. Persist to GitHub repository
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      let sha: string | undefined;
      const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${MENU_FILE_PATH}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
          cache: "no-store",
        }
      );
      if (getRes.ok) {
        const curData = (await getRes.json()) as { sha?: string };
        sha = curData.sha;
      }

      await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${MENU_FILE_PATH}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: "Update menu data via Admin Studio",
            content: Buffer.from(jsonStr).toString("base64"),
            sha,
          }),
        }
      );
    } catch (err) {
      console.error("Failed to commit menu to GitHub:", err);
    }
  }
}

export async function ensureMenuSeeded(): Promise<void> {
  await loadMenu();
}

export async function getMenu(): Promise<MenuCategory[]> {
  const menu = await loadMenu();
  return JSON.parse(JSON.stringify(menu));
}

export async function saveCategory(input: { id?: string; name: string }): Promise<void> {
  const menu = await loadMenu();
  const name = input.name.trim().slice(0, 90);
  if (!name) throw new Error("Category name is required.");

  if (input.id) {
    const existing = menu.find((c) => c.id === input.id || c.name === input.id);
    if (existing) {
      existing.name = name;
    }
  } else {
    const id = `category-${Date.now()}`;
    const nextOrder = menu.length > 0 ? Math.max(...menu.map((c) => c.sortOrder)) + 1 : 0;
    menu.push({
      id,
      name,
      sortOrder: nextOrder,
      items: [],
    });
  }

  await saveMenuData(menu);
}

export async function deleteCategory(id: string): Promise<void> {
  const menu = await loadMenu();
  const filtered = menu.filter((c) => c.id !== id && c.name !== id);
  await saveMenuData(filtered);
}

export async function saveItem(input: {
  id?: string;
  categoryId: string;
  name: string;
  price: string;
  description: string;
  image: string;
  outOfStock?: boolean;
}): Promise<void> {
  const menu = await loadMenu();
  let category = menu.find((c) => c.id === input.categoryId || c.name === input.categoryId);

  // Fallback: look for the item across all categories if editing existing item
  if (!category && input.id) {
    category = menu.find((c) => c.items.some((i) => i.id === input.id));
  }

  if (!category) {
    throw new Error(`Category not found.`);
  }

  const values: MenuItem = {
    id: input.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim().slice(0, 120),
    price: input.price.trim().slice(0, 32),
    description: input.description.trim().slice(0, 240),
    image: input.image.trim(),
    sortOrder: 0,
    outOfStock: Boolean(input.outOfStock),
  };
  if (!values.name) throw new Error("Item name is required.");

  if (input.id) {
    const itemIndex = category.items.findIndex((i) => i.id === input.id);
    if (itemIndex >= 0) {
      values.sortOrder = category.items[itemIndex].sortOrder;
      category.items[itemIndex] = values;
    } else {
      values.sortOrder = category.items.length;
      category.items.push(values);
    }
  } else {
    const nextOrder =
      category.items.length > 0 ? Math.max(...category.items.map((i) => i.sortOrder)) + 1 : 0;
    values.sortOrder = nextOrder;
    category.items.push(values);
  }

  await saveMenuData(menu);
}

export async function toggleStock(input: {
  id: string;
  categoryId: string;
  outOfStock: boolean;
}): Promise<void> {
  const menu = await loadMenu();
  let targetItem: MenuItem | null = null;

  const category = menu.find((c) => c.id === input.categoryId || c.name === input.categoryId);
  if (category) {
    targetItem = category.items.find((i) => i.id === input.id) || null;
  }

  if (!targetItem) {
    for (const cat of menu) {
      targetItem = cat.items.find((i) => i.id === input.id) || null;
      if (targetItem) break;
    }
  }

  if (targetItem) {
    targetItem.outOfStock = input.outOfStock;
    await saveMenuData(menu);
  }
}

export async function deleteItem(input: { id: string; categoryId: string }): Promise<void> {
  const menu = await loadMenu();
  const category = menu.find((c) => c.id === input.categoryId || c.name === input.categoryId);
  if (category) {
    category.items = category.items.filter((i) => i.id !== input.id);
  } else {
    for (const cat of menu) {
      cat.items = cat.items.filter((i) => i.id !== input.id);
    }
  }
  await saveMenuData(menu);
}
