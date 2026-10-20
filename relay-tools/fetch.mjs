// Hourly data relay for the GitHub Pages site (runs in the public site repo's
// workflow; copied there as relay-tools/fetch.mjs by `npm run build:pages`).
//
// Copies public-domain sources that refuse requests from web pages (NOAA CPC,
// PSL, NHC, AWC; NASA Ozone Watch) to ./relay/ so the app can read them from
// its own site. Files are copied byte for byte, except the AWC station reports,
// which are compacted from the official CSV cache into the AWC JSON field
// names the app already parses. If a source is down, the previously published
// copy is kept, so a brief outage never blanks a section.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";

const cfg = JSON.parse(readFileSync(new URL("./sources.json", import.meta.url), "utf8"));
const UA = `SahraeWeather-relay/1.0 (+${cfg.siteUrl})`;
const status = { updatedAt: new Date().toISOString(), files: {} };

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(90_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
function save(file, buf) {
  mkdirSync(dirname(`relay/${file}`), { recursive: true });
  writeFileSync(`relay/${file}`, buf);
}
async function relay(file, load) {
  try {
    const buf = await load();
    if (!buf.length) throw new Error("empty response");
    save(file, buf);
    status.files[file] = { ok: true, bytes: buf.length, fetchedAt: new Date().toISOString() };
  } catch (e) {
    // Keep the last published copy rather than publishing a gap.
    try {
      save(file, await get(`${cfg.siteUrl}relay/${file}`));
      status.files[file] = { ok: false, keptPrevious: true, error: String(e.message ?? e) };
    } catch {
      status.files[file] = { ok: false, keptPrevious: false, error: String(e.message ?? e) };
    }
  }
}

// ---- byte-for-byte copies
for (const s of cfg.static) await relay(s.file, () => get(s.url));

// ---- NASA Ozone Watch: this year and last (the season spans the new year in January)
const year = new Date().getUTCFullYear();
for (const y of [year, year - 1])
  for (const k of cfg.ozoneKinds)
    await relay(`ozonewatch/${k}_${y}.txt`, () => get(`https://ozonewatch.gsfc.nasa.gov/meteorology/figures/ozone/${k}_${y}_toms+omi+omps.txt`));

// ---- AWC latest METAR per station → AWC JSON field names
function parseCsv(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") {
        cells.push(cur);
        cur = "";
      } else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}
await relay(cfg.metarFile, async () => {
  const csv = gunzipSync(await get("https://aviationweather.gov/data/cache/metars.cache.csv.gz")).toString("utf8");
  const stations = JSON.parse(gunzipSync(await get("https://aviationweather.gov/data/cache/stations.cache.json.gz")).toString("utf8"));
  const names = new Map(stations.map((s) => [s.icaoId, [s.site, s.state, s.country].filter(Boolean).join(", ")]));
  const rows = parseCsv(csv);
  const head = rows.findIndex((r) => r[0] === "raw_text");
  if (head < 0) throw new Error("unexpected AWC CSV layout");
  const h = rows[head];
  const col = (name) => h.indexOf(name); // first occurrence (sky_cover repeats)
  const C = Object.fromEntries(["raw_text", "station_id", "observation_time", "latitude", "longitude", "temp_c", "dewpoint_c", "wind_dir_degrees", "wind_speed_kt", "wind_gust_kt", "visibility_statute_mi", "altim_in_hg", "sea_level_pressure_mb", "sky_cover", "metar_type", "elevation_m"].map((k) => [k, col(k)]));
  const num = (v) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const out = [];
  for (const r of rows.slice(head + 1)) {
    const lat = num(r[C.latitude]);
    const lon = num(r[C.longitude]);
    const t = Date.parse(r[C.observation_time]);
    if (lat === null || lon === null || !Number.isFinite(t)) continue;
    const id = r[C.station_id];
    const wdir = r[C.wind_dir_degrees];
    const vis = r[C.visibility_statute_mi];
    const inHg = num(r[C.altim_in_hg]);
    out.push({
      icaoId: id,
      name: names.get(id) ?? id,
      lat,
      lon,
      elev: num(r[C.elevation_m]) ?? undefined,
      obsTime: Math.round(t / 1000),
      temp: num(r[C.temp_c]),
      dewp: num(r[C.dewpoint_c]),
      wdir: wdir === "VRB" ? "VRB" : num(wdir),
      wspd: num(r[C.wind_speed_kt]),
      wgst: num(r[C.wind_gust_kt]),
      visib: vis.endsWith("+") ? vis : num(vis),
      altim: inHg === null ? null : Math.round(inHg * 33.8639 * 10) / 10, // hPa, as in the AWC JSON API
      slp: num(r[C.sea_level_pressure_mb]),
      rawOb: r[C.raw_text],
      cover: r[C.sky_cover] || undefined,
      metarType: r[C.metar_type] || undefined,
    });
  }
  if (out.length < 1000) throw new Error(`only ${out.length} stations parsed`);
  return Buffer.from(JSON.stringify(out));
});

save("status.json", Buffer.from(JSON.stringify(status, null, 2)));
const failed = Object.entries(status.files).filter(([, v]) => !v.ok);
console.log(`relay: ${Object.keys(status.files).length - failed.length} fresh, ${failed.length} failed`, failed.length ? failed : "");
