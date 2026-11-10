const fs = require('fs');
const assert = require('assert');

console.log('--- Testing SENS Marketing Studio V2 (9:16 Only • Estáticos & Motion) ---');

// 1. Check templates-db-200.js
const db = require('../../../../../../Users/Lean/SENS/marketing-suites/templates-db-200.js');
assert.strictEqual(Array.isArray(db), true, 'DB should be an array');
assert.strictEqual(db.length, 140, 'DB must contain exactly 140 templates');

const staticList = db.filter(t => t.group === 'static');
const motionList = db.filter(t => t.group === 'motion');

assert.strictEqual(staticList.length, 100, 'Must have exactly 100 static templates');
assert.strictEqual(motionList.length, 40, 'Must have exactly 40 motion templates');

// Verify all formats are 9:16
db.forEach((t, i) => {
  assert.strictEqual(t.format, '9:16', `Template ${t.id} at index ${i} must be 9:16`);
  assert(t.html && t.html.length > 50, `Template ${t.id} must have non-empty HTML`);
  assert(t.name && t.name.length > 0, `Template ${t.id} must have a name`);
  
  // Verify no narrow unpadded margins (px-1, px-2)
  assert(!/\bpx-1\b/.test(t.html), `Template ${t.id} must not have raw px-1`);
  assert(!/\bpx-2\b/.test(t.html), `Template ${t.id} must not have raw px-2`);
});
console.log('✓ All 140 templates verified: 100 Estáticos, 40 Con animación, 100% 9:16, safe margins.');

// 2. Check marketing_templates_catalog.js
const catalog = require('../../../../../../Users/Lean/SENS/marketing_templates_catalog.js');
assert.strictEqual(catalog.length, 140, 'Catalog must contain 140 templates');
console.log('✓ marketing_templates_catalog.js verified (140 templates).');

// 3. Check studio-master.html
const masterHtml = fs.readFileSync('marketing-suites/studio-master.html', 'utf8');
assert(masterHtml.includes('motion-animations.css'), 'Must link motion-animations.css');
assert(masterHtml.includes('data-group-btn="static"'), 'Must have static group button');
assert(masterHtml.includes('data-group-btn="motion"'), 'Must have motion group button');
assert(!masterHtml.includes('4:5 Carrusel'), 'Must NOT have 4:5 Carrusel button');
assert(masterHtml.includes('data-scrim-btn="0.40"'), 'Must have 40% scrim button');
assert(masterHtml.includes('data-scrim-btn="0.50"'), 'Must have 50% scrim button');
assert(masterHtml.includes('data-scrim-btn="0.60"'), 'Must have 60% scrim button');
assert(masterHtml.includes('Catálogo 140'), 'Must display Catálogo 140');
console.log('✓ studio-master.html verified (2 groupings, 40%-60% scrim, 9:16 layout).');

// 4. Check index.html iframe and script tags
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('marketing-suites/studio-master.html?v=30.0'), 'index.html must point to studio-master.html?v=30.0');
assert(indexHtml.includes('marketing_templates_catalog.js?v=2.0'), 'index.html must point to catalog?v=2.0');
assert(indexHtml.includes('app.js?v=36.0'), 'index.html must point to app.js?v=36.0');
console.log('✓ index.html references verified.');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🚀');
