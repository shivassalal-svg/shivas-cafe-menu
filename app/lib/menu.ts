import { env } from "cloudflare:workers";
import sourceMenu from "../../data/source-menu.json";

export type MenuItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  sortOrder: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

type SourceCategory = { name: string; items: Omit<MenuItem, "sortOrder">[] };
type CategoryRow = { id: string; name: string; sort_order: number };
type ItemRow = {
  id: string;
  category_id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  sort_order: number;
};

function database() {
  if (!env.DB) throw new Error("Menu database is not configured.");
  return env.DB;
}

export async function ensureMenuSeeded() {
  const db = database();
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM menu_categories")
    .first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0) return;

  const statements: D1PreparedStatement[] = [];
  (sourceMenu as SourceCategory[]).forEach((category, categoryIndex) => {
    const categoryId = `category-${String(categoryIndex).padStart(2, "0")}`;
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO menu_categories (id, name, sort_order) VALUES (?, ?, ?)")
        .bind(categoryId, category.name, categoryIndex),
    );
    category.items.forEach((item, itemIndex) => {
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO menu_items (id, category_id, name, price, description, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            item.id,
            categoryId,
            item.name,
            item.price,
            item.description,
            item.image,
            itemIndex,
          ),
      );
    });
  });
  for (let offset = 0; offset < statements.length; offset += 80) {
    await db.batch(statements.slice(offset, offset + 80));
  }
}

export async function getMenu(): Promise<MenuCategory[]> {
  await ensureMenuSeeded();
  const db = database();
  const [categories, items] = await Promise.all([
    db
      .prepare("SELECT id, name, sort_order FROM menu_categories ORDER BY sort_order, name")
      .all<CategoryRow>(),
    db
      .prepare(
        "SELECT id, category_id, name, price, description, image, sort_order FROM menu_items ORDER BY sort_order, name",
      )
      .all<ItemRow>(),
  ]);
  const menu = (categories.results ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sort_order,
    items: [] as MenuItem[],
  }));
  const byId = new Map(menu.map((category) => [category.id, category]));
  for (const item of items.results ?? []) {
    byId.get(item.category_id)?.items.push({
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      sortOrder: item.sort_order,
    });
  }
  return menu;
}

export async function saveCategory(input: { id?: string; name: string }) {
  const db = database();
  const name = input.name.trim().slice(0, 90);
  if (!name) throw new Error("Category name is required.");
  const id = input.id || `category-${crypto.randomUUID()}`;
  if (input.id) {
    await db.prepare("UPDATE menu_categories SET name = ? WHERE id = ?").bind(name, id).run();
  } else {
    const next = await db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM menu_categories")
      .first<{ next_order: number }>();
    await db
      .prepare("INSERT INTO menu_categories (id, name, sort_order) VALUES (?, ?, ?)")
      .bind(id, name, Number(next?.next_order ?? 0))
      .run();
  }
}

export async function deleteCategory(id: string) {
  const db = database();
  await db.batch([
    db.prepare("DELETE FROM menu_items WHERE category_id = ?").bind(id),
    db.prepare("DELETE FROM menu_categories WHERE id = ?").bind(id),
  ]);
}

export async function saveItem(input: {
  id?: string;
  categoryId: string;
  name: string;
  price: string;
  description: string;
  image: string;
}) {
  const db = database();
  const values = {
    id: input.id || `item-${crypto.randomUUID()}`,
    categoryId: input.categoryId,
    name: input.name.trim().slice(0, 120),
    price: input.price.trim().slice(0, 32),
    description: input.description.trim().slice(0, 240),
    image: input.image.trim().slice(0, 500),
  };
  if (!values.name) throw new Error("Item name is required.");
  if (input.id) {
    await db
      .prepare(
        "UPDATE menu_items SET name = ?, price = ?, description = ?, image = ? WHERE id = ? AND category_id = ?",
      )
      .bind(values.name, values.price, values.description, values.image, values.id, values.categoryId)
      .run();
  } else {
    const next = await db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM menu_items WHERE category_id = ?")
      .bind(values.categoryId)
      .first<{ next_order: number }>();
    await db
      .prepare(
        "INSERT INTO menu_items (id, category_id, name, price, description, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        values.id,
        values.categoryId,
        values.name,
        values.price,
        values.description,
        values.image,
        Number(next?.next_order ?? 0),
      )
      .run();
  }
}

export async function deleteItem(input: { id: string; categoryId: string }) {
  await database()
    .prepare("DELETE FROM menu_items WHERE id = ? AND category_id = ?")
    .bind(input.id, input.categoryId)
    .run();
}
