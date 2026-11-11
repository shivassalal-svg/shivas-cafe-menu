import { isSiteOwner } from "../../lib/admin";
import {
  deleteCategory,
  deleteItem,
  getMenu,
  saveCategory,
  saveItem,
} from "../../lib/menu";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getMenu(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!(await isSiteOwner())) {
    return Response.json({ error: "Owner sign-in required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "save-category") {
      await saveCategory({
        id: typeof body.id === "string" ? body.id : undefined,
        name: typeof body.name === "string" ? body.name : "",
      });
    } else if (body.action === "delete-category") {
      if (typeof body.id !== "string") throw new Error("Category ID is required.");
      await deleteCategory(body.id);
    } else if (body.action === "save-item") {
      if (typeof body.categoryId !== "string") throw new Error("Category is required.");
      await saveItem({
        id: typeof body.id === "string" ? body.id : undefined,
        categoryId: body.categoryId,
        name: typeof body.name === "string" ? body.name : "",
        price: typeof body.price === "string" ? body.price : "",
        description: typeof body.description === "string" ? body.description : "",
        image: typeof body.image === "string" ? body.image : "",
      });
    } else if (body.action === "delete-item") {
      if (typeof body.id !== "string" || typeof body.categoryId !== "string") {
        throw new Error("Item ID and category are required.");
      }
      await deleteItem({ id: body.id, categoryId: body.categoryId });
    } else {
      return Response.json({ error: "Unknown menu action." }, { status: 400 });
    }
    return Response.json(await getMenu(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save menu changes." },
      { status: 400 },
    );
  }
}
