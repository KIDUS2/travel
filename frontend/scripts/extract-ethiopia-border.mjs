// Extracts Ethiopia's national border from Natural Earth (world-atlas, public domain)
// into public/geo/ethiopia-border.geojson. Run: node scripts/extract-ethiopia-border.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'));
const all = feature(topo, topo.objects.countries).features;
const et = all.find((f) => String(f.id) === '231');
if (!et) throw new Error('Ethiopia not found');

// Round coordinates to ~100 m to keep the file small.
const round = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(round));
et.geometry.coordinates = round(et.geometry.coordinates);
et.properties = { name: 'Ethiopia', iso: 'ET', source: 'Natural Earth 1:10m via world-atlas' };
writeFileSync('public/geo/ethiopia-border.geojson', JSON.stringify(et));
console.log('wrote public/geo/ethiopia-border.geojson');
