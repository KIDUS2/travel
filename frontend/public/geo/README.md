# Map data

| File | What | Source |
|---|---|---|
| `ethiopia-border.geojson` | Ethiopia's national border (detailed) | Natural Earth 1:10m (public domain), via `world-atlas`. Regenerate with `node scripts/extract-ethiopia-border.mjs` |
| `ethiopia-adm1.geojson` | *Optional.* Ethiopia's regions | Not included. Add one and the Coverage map draws and colors the regions. |

## Adding Ethiopia's region borders

Save a GeoJSON `FeatureCollection` of Ethiopia's first-level regions as `ethiopia-adm1.geojson` in this folder.
Each feature needs its ISO 3166-2 code in one of these properties: `shapeISO`, `iso_3166_2`, `ISO_3166_2`, `iso` or `code`
(for example `ET-AM` for Amhara). These codes match the region you set on each memory.

A good open source is **geoBoundaries** (ETH, ADM1, "simplified"; CC BY 4.0, credit geoBoundaries).
Check that it includes the newer regions (Sidama, South West, Central and South Ethiopia); older datasets show the previous boundaries.
