import fs from "node:fs/promises";
import path from "node:path";

const PROD_URL = process.env.PRODUCTION_MENU_URL || "https://shivas-cafe-menu.vercel.app/api/menu";
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/shivassalal-svg/shivas-cafe-menu/main/data/menu-data.json";
const DATA_FILE = path.join(process.cwd(), "data", "menu-data.json");
const SOURCE_FILE = path.join(process.cwd(), "data", "source-menu.json");

async function syncProductionData() {
  console.log("Checking production data point for latest menu...");
  let menuData = null;

  // 1. Try fetching from live production deployment
  try {
    const res = await fetch(PROD_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        menuData = data;
        console.log(`Fetched ${data.length} categories from live production.`);
      }
    }
  } catch (err) {
    console.warn("Could not reach live production URL, trying GitHub fallback...", err.message);
  }

  // 2. Fallback to GitHub raw
  if (!menuData) {
    try {
      const res = await fetch(GITHUB_RAW_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          menuData = data;
          console.log(`Fetched ${data.length} categories from GitHub.`);
        }
      }
    } catch (err) {
      console.warn("Could not reach GitHub raw data:", err.message);
    }
  }

  // 3. Write latest production data to local files
  if (menuData) {
    const formatted = JSON.stringify(menuData, null, 2);
    await fs.writeFile(DATA_FILE, formatted, "utf-8");
    await fs.writeFile(SOURCE_FILE, formatted, "utf-8");
    console.log("Successfully synced local build files with production data point.");
  } else {
    console.log("Using existing local data files (production sync skipped or offline).");
  }
}

syncProductionData().catch(console.error);
