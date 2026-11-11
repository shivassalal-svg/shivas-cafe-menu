import json
import re
import shutil
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return "".join(ch for ch in value.casefold() if ch.isalnum())


images = json.loads((ROOT / "assets/source-image-map.json").read_text())
image_by_name = {}
image_by_id = {}
for image in images:
    stem = re.sub(r"\.[^.]+$", "", image["name"])
    image_by_name[norm(stem)] = image
    image_by_id[image["id"]] = image

aliases = {
    "Café Latte": "Latte Coffee",
    "Hot Bourn Vita": "Hot Bournvita",
    "Kullad Tea": "Kullhad Tea",
    "Cold Coffee With Ice cream": "Cold Coffee with Icecream",
    "3 in One Coco": "3 in one Cold Coco",
    "H2O (Spicy) Grill 🌶️": "H2O (Spicy) Panini 🌶️",
    "Extra Bhaji (250gm)": "Pav-Bhaji",
    "Hot Lemon Tea": "Lemon Tea",
    "Pav-Bhaji (250gm)": "Pav-Bhaji",
    "Extra Pav (2 Pcs)": "Extra Pav",
    "Aloo Paratha (1pc)": "Aloo Paratha",
    "Cheese Aloo Paratha (1pc)": "Cheese Aloo Paratha",
    "Paneer Aloo Paratha (1pc)": "Paneer Aloo Paratha",
    "Cheese Paratha (1pc)": "Cheese Paratha",
    "Chana Kulcha (200gm)": "Chana Kulcha",
    "Extra Chana (200gm)": "Extra Chana",
    "Extra Kulcha (1 Pc)": "Extra Kulcha",
    "MAIN AKELA": "Aloo Tikki Burger",
    "HUM DO": "Peri Peri Grill",
    "SINGLE MINGLE": "Corn Cheese Panini",
    "YARRA": "Veg. Cheese Burger",
    "PARIVAR": "Fresh Veggi Pizza",
}

def image_for(name: str):
    candidate = aliases.get(name, name)
    return image_by_name.get(norm(candidate))


menu = []
current = None
for line in (ROOT / "source-menu.tsv").read_text().splitlines():
    if not line:
        continue
    if line.startswith("#"):
        current = {"name": line[1:], "items": []}
        menu.append(current)
        continue
    name, price, description = (line.split("\t", 2) + [""])[:3]
    image = image_for(name)
    current["items"].append({
        "id": f"{len(menu):02d}-{len(current['items']):03d}",
        "name": name,
        "price": price,
        "description": description,
        "image": f"/menu-images/{image['id']}.webp" if image else "",
    })

out = ROOT / "public/menu-images"
out.mkdir(parents=True, exist_ok=True)
for image in images:
    source = ROOT / image["path"]
    shutil.copyfile(source, out / f"{image['id']}.webp")

(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data/source-menu.json").write_text(json.dumps(menu, ensure_ascii=False, indent=2))
misses = [item["name"] for category in menu for item in category["items"] if not item["image"]]
print(json.dumps({
    "categories": len(menu),
    "items": sum(len(category["items"]) for category in menu),
    "matchedImages": sum(bool(item["image"]) for category in menu for item in category["items"]),
    "unmatchedImages": misses,
    "copiedImages": len(images),
}, ensure_ascii=False))
