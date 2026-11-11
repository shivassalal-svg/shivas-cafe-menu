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
const DATA_FILE = path.join(process.cwd(), "data", "menu-data.json");

// In-memory cache for serverless invocation lifetime
let memoryMenu: MenuCategory[] | null = null;

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
  if (memoryMenu) return memoryMenu;

  for (const filePath of [TMP_FILE, DATA_FILE]) {
    try {
      const data = await fs.readFile(/* turbopackIgnore: true */ filePath, "utf-8");
      const parsed = JSON.parse(data) as MenuCategory[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryMenu = parsed;
        return memoryMenu;
      }
    } catch {
      // file doesn't exist or unreadable, try next
    }
  }

  memoryMenu = getDefaultMenu();
  return memoryMenu;
}

async function saveMenuData(menu: MenuCategory[]): Promise<void> {
  memoryMenu = menu;
  const json = JSON.stringify(menu, null, 2);

  try {
    await fs.writeFile(TMP_FILE, json, "utf-8");
  } catch {
    // ignore
  }

  try {
    await fs.writeFile(DATA_FILE, json, "utf-8");
  } catch {
    // ignore
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
    const existing = menu.find((c) => c.id === input.id);
    if (existing) {
      existing.name = name;
    }
  } else {
    const id = `category-${crypto.randomUUID()}`;
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
  const filtered = menu.filter((c) => c.id !== id);
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
  const category = menu.find((c) => c.id === input.categoryId);
  if (!category) throw new Error("Category not found.");

  const values = {
    id: input.id || `item-${crypto.randomUUID()}`,
    name: input.name.trim().slice(0, 120),
    price: input.price.trim().slice(0, 32),
    description: input.description.trim().slice(0, 240),
    image: input.image.trim().slice(0, 500),
    outOfStock: Boolean(input.outOfStock),
  };
  if (!values.name) throw new Error("Item name is required.");

  if (input.id) {
    const itemIndex = category.items.findIndex((i) => i.id === input.id);
    if (itemIndex >= 0) {
      category.items[itemIndex] = {
        ...category.items[itemIndex],
        ...values,
      };
    } else {
      category.items.push({
        ...values,
        sortOrder: category.items.length,
      });
    }
  } else {
    const nextOrder =
      category.items.length > 0 ? Math.max(...category.items.map((i) => i.sortOrder)) + 1 : 0;
    category.items.push({
      ...values,
      sortOrder: nextOrder,
    });
  }

  await saveMenuData(menu);
}

export async function toggleStock(input: {
  id: string;
  categoryId: string;
  outOfStock: boolean;
}): Promise<void> {
  const menu = await loadMenu();
  const category = menu.find((c) => c.id === input.categoryId);
  if (category) {
    const item = category.items.find((i) => i.id === input.id);
    if (item) {
      item.outOfStock = input.outOfStock;
      await saveMenuData(menu);
    }
  }
}

export async function deleteItem(input: { id: string; categoryId: string }): Promise<void> {
  const menu = await loadMenu();
  const category = menu.find((c) => c.id === input.categoryId);
  if (category) {
    category.items = category.items.filter((i) => i.id !== input.id);
    await saveMenuData(menu);
  }
}
