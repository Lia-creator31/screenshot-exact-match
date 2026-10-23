import fs from "fs";
import path from "path";

const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) {
  console.log("Pakai: node download-assets.mjs https://alamat-lovable-mu");
  process.exit(1);
}

const assetsDir = "src/assets";
const publicDir = "public/assets";
fs.mkdirSync(publicDir, { recursive: true });

for (const f of fs.readdirSync(assetsDir).filter(f => f.endsWith(".asset.json"))) {
  const jsonPath = path.join(assetsDir, f);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!json.url.startsWith("/__l5e/")) {
    console.log("Lewati (sudah lokal):", f);
    continue;
  }

  const name = f.replace(".asset.json", "");
  const res = await fetch(BASE + json.url);
  if (!res.ok) {
    console.log("GAGAL", res.status, BASE + json.url);
    continue;
  }

  fs.writeFileSync(path.join(publicDir, name), Buffer.from(await res.arrayBuffer()));
  json.original_url = json.url;
  json.url = "/assets/" + name;
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  console.log("OK:", name);
}