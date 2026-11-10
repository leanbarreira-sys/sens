const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/Lean/SENS/template -  marketing/templates v2/stitch_sens_quiet_luxury_design_system';

function cleanUtf8(str) {
  if (!str) return '';
  return str
    .replace(/Som[\uFFFD\u00C7\u00E3\u00A7]tico/gi, 'Somático')
    .replace(/Bioqu[\uFFFD\u00ED]mico/gi, 'Bioquímico')
    .replace(/Cinem[\uFFFD\u00E3\u00A7]tica/gi, 'Cinemática')
    .replace(/Cinem[\uFFFD\u00E3\u00A7]ticos/gi, 'Cinemáticos')
    .replace(/Duraci[\uFFFD\u00F3]n/gi, 'Duración')
    .replace(/Sincronizaci[\uFFFD\u00F3]n/gi, 'Sincronización')
    .replace(/Percepci[\uFFFD\u00F3]n/gi, 'Percepción')
    .replace(/Adaptaci[\uFFFD\u00F3]n/gi, 'Adaptación')
    .replace(/Fr[\uFFFD\u00ED]o/gi, 'Frío')
    .replace(/Constricci[\uFFFD\u00F3]n/gi, 'Constricción')
    .replace(/Preservaci[\uFFFD\u00F3]n/gi, 'Preservación')
    .replace(/Cart[\uFFFD\u00ED]lago/gi, 'Cartílago')
    .replace(/Tensi[\uFFFD\u00F3]n/gi, 'Tensión')
    .replace(/M[\uFFFD\u00E9]tricas/gi, 'Métricas')
    .replace(/Esp[\uFFFD\u00E8\u00E9]cimen/gi, 'Espécimen')
    .replace(/Esp[\uFFFD\u00E8\u00E9]cimenes/gi, 'Especímenes')
    .replace(/Precisi[\uFFFD\u00F3]n/gi, 'Precisión')
    .replace(/Morfolog[\uFFFD\u00ED]as/gi, 'Morfologías')
    .replace(/Fisiol[\uFFFD\u00F3]gicas/gi, 'Fisiológicas')
    .replace(/Calibraci[\uFFFD\u00F3]n/gi, 'Calibración')
    .replace(/Modulaci[\uFFFD\u00F3]n/gi, 'Modulación')
    .replace(/Recuperaci[\uFFFD\u00F3]n/gi, 'Recuperación')
    .replace(/M[\uFFFD\u00E1]s/gi, 'Más')
    .replace(/Biometr[\uFFFD\u00ED]a/gi, 'Biometría')
    .replace(/D[\uFFFD\u00ED]as/gi, 'Días')
    .replace(/Cuadr[\uFFFD\u00ED]cula/gi, 'Cuadrícula')
    .replace(/L[\uFFFD\u00ED]mite/gi, 'Límite')
    .replace(/T[\uFFFD\u00ED]tulo/gi, 'Título')
    .replace(/\uFFFD/g, '');
}

function enhanceTemplateHtml(html) {
  let res = cleanUtf8(html);

  // 1. Soften overly dark overlay opacities down to 40%-60% range (e.g. 50%-55%)
  res = res
    .replace(/from-black\/9[0-5]/g, 'from-black/55')
    .replace(/from-black\/8[0-9]/g, 'from-black/50')
    .replace(/from-primary\/9[0-5]/g, 'from-primary/55')
    .replace(/from-primary\/8[0-9]/g, 'from-primary/50')
    .replace(/bg-black\/9[0-5]/g, 'bg-black/55')
    .replace(/bg-black\/8[0-9]/g, 'bg-black/50')
    .replace(/bg-primary\/9[0-5]/g, 'bg-primary/55')
    .replace(/bg-primary\/8[0-9]/g, 'bg-primary/50');

  // 2. Expand narrow lateral margins (px-1, px-2) to safe mobile margins (px-6 or px-7)
  res = res
    .replace(/\bpx-1\b/g, 'px-6')
    .replace(/\bpx-2\b/g, 'px-6');

  return res;
}

// 1. Master Suite (E01 - E20)
function getMasterSuite() {
  const p = path.join(baseDir, 'sens_master_suite_20_templates_9_16_ultra_variados_growth_marketing', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const articles = content.match(/<article[\s\S]*?<\/article>/gi) || [];
  return articles.map((art, idx) => {
    const code = `E${String(idx + 1).padStart(2, '0')}`;
    const tMatch = art.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Master Template ${idx + 1}`;
    const bgMatch = art.match(/url\(['"]([^'"]+)['"]\)/i) || art.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';

    return {
      id: code,
      code: code,
      num: idx + 1,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b1',
      block: 'Master Suite Growth',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(art)
    };
  });
}

// 2. Bloque II (E21 - E40)
function getBloqueII() {
  const p = path.join(baseDir, 'sens_suite_9_16_templates_bloque_ii_21_al_40_limpio_sin_ojito', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const parts = content.split(/<!--\s*T(\d+):[^>]+-->/i);
  const list = [];
  let idx = 21;
  for (let i = 1; i < parts.length; i += 2) {
    const code = `E${String(idx).padStart(2, '0')}`;
    const raw = parts[i+1];
    const cardMatch = raw.match(/<div class="relative w-full aspect-\[9\/16\][\s\S]*?<\/div>\s*<\/div>/i) || raw.match(/<div class="[^"]*aspect-\[9\/16\][^"]*"[\s\S]*?<\/div>/i);
    const htmlSnippet = cardMatch ? cardMatch[0] : raw;
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || raw.match(/<span class="[^"]*font-bold[^"]*">([\s\S]*?)<\/span>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Tipografía ${idx}`;
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i) || raw.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-3-movilidad.jpg';

    list.push({
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b2',
      block: 'Editorial & Statements',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(htmlSnippet)
    });
    idx++;
  }
  return list;
}

// 3. Bloque III (E41 - E60)
function getBloqueIII() {
  const p = path.join(baseDir, 'sens_suite_9_16_templates_bloque_iii_41_al_60', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const articles = content.match(/<article[\s\S]*?<\/article>/gi) || [];
  return articles.map((art, i) => {
    const idx = 41 + i;
    const code = `E${String(idx).padStart(2, '0')}`;
    const tMatch = art.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Telemetría & Métricas ${idx}`;
    const bgMatch = art.match(/url\(['"]([^'"]+)['"]\)/i) || art.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';

    const cardMatch = art.match(/<div class="relative w-full aspect-\[9\/16\][\s\S]*?<\/div>\s*(?=<div class="flex items-center|<\/article>)/i);
    const htmlSnippet = cardMatch ? cardMatch[0] : art;

    return {
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b3',
      block: 'Telemetría & Datos',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(htmlSnippet)
    };
  });
}

// 4. Bloque IV (E61 - E80)
function getBloqueIV() {
  const p = path.join(baseDir, 'sens_suite_9_16_templates_bloque_iv_61_al_80_micro_stories_di_logos', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const articles = content.match(/<article[\s\S]*?<\/article>/gi) || [];
  return articles.map((art, i) => {
    const idx = 61 + i;
    const code = `E${String(idx).padStart(2, '0')}`;
    const tMatch = art.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || art.match(/<p class="[^"]*font-semibold[^"]*">([\s\S]*?)<\/p>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Micro Story ${idx}`;
    const bgMatch = art.match(/url\(['"]([^'"]+)['"]\)/i) || art.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-4-adherencia.jpg';

    const cardMatch = art.match(/<div class="relative w-full aspect-\[9\/16\][\s\S]*?<\/div>\s*(?=<div class="flex items-center|<\/article>)/i);
    const htmlSnippet = cardMatch ? cardMatch[0] : art;

    return {
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b4',
      block: 'Micro-Stories & Diálogos',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(htmlSnippet)
    };
  });
}

// 5. Maestra Vertical 9:16 (E81 - E100)
function getMaestraVertical() {
  const p = path.join(baseDir, 'sens_suite_maestra_de_40_arquetipos_visuales_de_conversi_n_autoridad', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const vertical = content.match(/SECTION 1: 20 VERTICAL TEMPLATES 9:16([\s\S]*?)SECTION 2/i);
  if (!vertical) return [];
  const articles = vertical[1].match(/<article[\s\S]*?<\/article>/gi) || [];
  return articles.map((art, i) => {
    const idx = 81 + i;
    const code = `E${String(idx).padStart(2, '0')}`;
    const tMatch = art.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || art.match(/<span class="[^"]*font-semibold[^"]*">([\s\S]*?)<\/span>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Arquetipo Conversión ${idx}`;
    const bgMatch = art.match(/url\(['"]([^'"]+)['"]\)/i) || art.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';

    return {
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b5',
      block: 'Conversión & Autoridad',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(art)
    };
  });
}

// 6. Motion Hooks (M01 - M20)
function getMotionHooks() {
  const p = path.join(baseDir, 'sens_motion_design_studio_20_templates_9_16_cinematogr_ficos_growth_hooks', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const gridMatch = content.match(/<div[^>]*id="archetype-grid"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/i);
  if (!gridMatch) return [];
  const cards = gridMatch[1].split(/<!--\s*(T\d+:[^>]+)-->/i);
  const list = [];
  let idx = 1;
  for (let i = 1; i < cards.length; i += 2) {
    const label = cards[i].trim();
    const snippet = cards[i+1];
    const code = `M${String(idx).padStart(2, '0')}`;
    const tMatch = snippet.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || snippet.match(/<span class="[^"]*font-bold[^"]*">([\s\S]*?)<\/span>/i);
    const title = label.split(':')[1]?.trim() || (tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Motion Hook ${idx}`);
    const bgMatch = snippet.match(/url\(['"]([^'"]+)['"]\)/i) || snippet.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';

    const cardDivMatch = snippet.match(/<div class="relative w-full aspect-\[9\/16\][\s\S]*?<\/div>\s*<\/div>/i) || snippet.match(/<div class="[^"]*aspect-\[9\/16\][^"]*"[\s\S]*?<\/div>/i);
    const htmlSnippet = cardDivMatch ? cardDivMatch[0] : snippet;

    list.push({
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'motion',
      groupName: 'Con animación',
      blockId: 'm1',
      block: 'Growth Hooks Cinematográficos',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(htmlSnippet)
    });
    idx++;
  }
  return list;
}

// 7. Motion Vol 2 (M21 - M40)
function getMotionVol2() {
  const p = path.join(baseDir, 'sens_motion_design_studio_20_nuevas_coreograf_as_9_16_vol._2', 'code.html');
  const content = fs.readFileSync(p, 'utf8');
  const parts = content.split(/<!--\s*M(\d+)\s*-->/i);
  const list = [];
  let idx = 21;
  for (let i = 1; i < parts.length; i += 2) {
    const code = `M${String(idx).padStart(2, '0')}`;
    const raw = parts[i+1];
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || raw.match(/<span class="[^"]*font-bold[^"]*">([\s\S]*?)<\/span>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Coreografía M${idx}`;
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i) || raw.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-3-movilidad.jpg';

    const cardDivMatch = raw.match(/<div class="relative w-full aspect-\[9\/16\][\s\S]*?<\/div>\s*<\/div>/i) || raw.match(/<div class="[^"]*aspect-\[9\/16\][^"]*"[\s\S]*?<\/div>/i);
    const htmlSnippet = cardDivMatch ? cardDivMatch[0] : raw;

    list.push({
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      group: 'motion',
      groupName: 'Con animación',
      blockId: 'm2',
      block: 'Coreografías Algorítmicas',
      name: title,
      title: title,
      thumbBg: bg,
      defaultBg: bg,
      html: enhanceTemplateHtml(htmlSnippet)
    });
    idx++;
  }
  return list;
}

const allTemplates = [
  ...getMasterSuite(),
  ...getBloqueII(),
  ...getBloqueIII(),
  ...getBloqueIV(),
  ...getMaestraVertical(),
  ...getMotionHooks(),
  ...getMotionVol2()
];

console.log(`Extracted total: ${allTemplates.length} templates (All 9:16)`);

// 1. Write marketing-suites/templates-db-200.js
const dbContent = `// Auto-generated SENS Templates V2 Database (9:16 & Motion Only • 140 Templates)
// Estáticos (E01-E100) & Con Animación (M01-M40) • Quiet Luxury Standard
if (typeof window === 'undefined') {
  global.window = global;
}

window.SENS_TEMPLATES_DB_200 = ${JSON.stringify(allTemplates, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SENS_TEMPLATES_DB_200;
}
`;

fs.writeFileSync('marketing-suites/templates-db-200.js', dbContent, 'utf8');
console.log('Saved marketing-suites/templates-db-200.js successfully!');

// 2. Write marketing_templates_catalog.js
const catalogContent = `/* =============================================================================
   SENS QUIET VITALITY — SUITE DE MARKETING V2 (100% FORMATO 9:16)
   100 Templates Estáticos (E01 a E100) | 40 Templates Con Animación (M01 a M40)
   Opacidad default 40%-60%, márgenes laterales seguros para cualquier dispositivo
   ============================================================================= */

if (typeof window === 'undefined') {
    global.window = global;
}

window.SENS_MARKETING_CATALOG = ${JSON.stringify(allTemplates, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SENS_MARKETING_CATALOG;
}
`;

fs.writeFileSync('marketing_templates_catalog.js', catalogContent, 'utf8');
console.log('Saved marketing_templates_catalog.js successfully!');
