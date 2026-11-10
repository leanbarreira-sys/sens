const fs = require('fs');
const path = require('path');

const baseDir = path.join(process.cwd(), 'template -  marketing', 'templates v2', 'stitch_sens_quiet_luxury_design_system');

function extractBalancedTag(html, startIndex) {
  const match = html.slice(startIndex).match(/^<([a-zA-Z0-9\-]+)/);
  if (!match) return null;
  const tagName = match[1].toLowerCase();
  
  let depth = 0;
  const tagRegex = new RegExp(`<(/?)${tagName}(\\s[^>]*)?>`, 'gi');
  tagRegex.lastIndex = startIndex;
  
  let tagMatch;
  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const isClosing = tagMatch[1] === '/';
    const isSelfClosing = tagMatch[0].endsWith('/>');
    
    if (isClosing) {
      depth--;
    } else if (!isSelfClosing) {
      depth++;
    }
    
    if (depth === 0) {
      return html.slice(startIndex, tagRegex.lastIndex);
    }
  }
  return null;
}

function cleanHtmlForStage(html) {
  let h = html.trim();
  // Ensure root tag has w-full h-full relative overflow-hidden
  h = h.replace(/^<div([^>]*)class="([^"]*)"/i, (m, pre, cls) => {
    let newCls = cls;
    if (!newCls.includes('w-full')) newCls += ' w-full';
    if (!newCls.includes('h-full')) newCls += ' h-full';
    if (!newCls.includes('relative')) newCls += ' relative';
    if (!newCls.includes('overflow-hidden')) newCls += ' overflow-hidden';
    newCls = newCls.replace(/\bmt-space-sm\b|\bmt-\d+\b/g, '');
    return `<div${pre}class="${newCls.trim().replace(/\s+/g, ' ')}"`;
  });
  
  // Safe margin normalization
  h = h.replace(/\bpx-1\b/g, 'px-4');
  h = h.replace(/\bpx-2\b(?!\.\d)/g, 'px-4');
  
  return h;
}

function extractBgUrl(html) {
  const m1 = html.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
  if (m1) return m1[1].replace(/&quot;/g, '').replace(/&amp;/g, '&');
  const m2 = html.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
  if (m2) return m2[1].replace(/&quot;/g, '').replace(/&amp;/g, '&');
  return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';
}

function extractTitle(html, defaultTitle) {
  const m = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (m) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 2) return text;
  }
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) {
    const text = p[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 2 && text.length < 80) return text;
  }
  return defaultTitle;
}

const templates = [];

// =========================================================================
// 1. MASTER SUITE (E01 - E20) — Senior Director UX Wellness Redesign
// =========================================================================
console.log('Processing 1. Master Suite (E01 - E20)...');
const { redesignedE01toE20 } = require('./redesign_e01_e20.js');

redesignedE01toE20.forEach((t) => {
  const html = cleanHtmlForStage(t.html);
  templates.push({
    id: t.id,
    code: t.id,
    num: t.num,
    format: '9:16',
    group: 'static',
    groupName: 'Estáticos',
    blockId: 'b1',
    block: 'Master Growth Engine',
    name: t.name,
    title: t.title,
    thumbBg: extractBgUrl(html),
    defaultBg: extractBgUrl(html),
    html
  });
});

// =========================================================================
// 2. BLOQUE II (E21 - E40)
// =========================================================================
console.log('Processing 2. Bloque II (E21 - E40)...');
const b2File = path.join(baseDir, 'sens_suite_9_16_templates_bloque_ii_21_al_40_limpio_sin_ojito', 'code.html');
const b2Content = fs.readFileSync(b2File, 'utf8');
let b2Pos = 0;
let b2Count = 0;
while (true) {
  const idx = b2Content.indexOf('class="template-card', b2Pos);
  if (idx === -1) break;
  const divStart = b2Content.lastIndexOf('<div', idx);
  const cardHtml = extractBalancedTag(b2Content, divStart);
  if (cardHtml) {
    b2Pos = divStart + cardHtml.length;
    b2Count++;
    const num = 20 + b2Count;
    const id = `E${String(num).padStart(2, '0')}`;
    const nameAttr = (cardHtml.match(/data-name="([^"]+)"/) || [])[1];
    
    const aspectIdx = cardHtml.indexOf('aspect-[9/16]');
    let innerHtml = '';
    if (aspectIdx !== -1) {
      const aspectStart = cardHtml.lastIndexOf('<div', aspectIdx);
      innerHtml = extractBalancedTag(cardHtml, aspectStart);
    }
    const html = cleanHtmlForStage(innerHtml || cardHtml);
    const title = nameAttr || extractTitle(html, `Editorial Template ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b2',
      block: 'Editorial & Statements',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    b2Pos = idx + 20;
  }
}

// =========================================================================
// 3. BLOQUE III (E41 - E60)
// =========================================================================
console.log('Processing 3. Bloque III (E41 - E60)...');
const b3File = path.join(baseDir, 'sens_suite_9_16_templates_bloque_iii_41_al_60', 'code.html');
const b3Content = fs.readFileSync(b3File, 'utf8');
let b3Pos = 0;
let b3Count = 0;
while (true) {
  const idx = b3Content.indexOf('<article', b3Pos);
  if (idx === -1) break;
  const articleHtml = extractBalancedTag(b3Content, idx);
  if (articleHtml) {
    b3Pos = idx + articleHtml.length;
    b3Count++;
    const num = 40 + b3Count;
    const id = `E${String(num).padStart(2, '0')}`;
    
    const aspectIdx = articleHtml.indexOf('aspect-[9/16]');
    let innerHtml = '';
    if (aspectIdx !== -1) {
      const aspectStart = articleHtml.lastIndexOf('<div', aspectIdx);
      innerHtml = extractBalancedTag(articleHtml, aspectStart);
    }
    const html = cleanHtmlForStage(innerHtml || articleHtml);
    const title = extractTitle(html, `Métrica & Telemetría ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b3',
      block: 'Métricas & Telemetría',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    b3Pos = idx + 8;
  }
}

// =========================================================================
// 4. BLOQUE IV (E61 - E80)
// =========================================================================
console.log('Processing 4. Bloque IV (E61 - E80)...');
const b4File = path.join(baseDir, 'sens_suite_9_16_templates_bloque_iv_61_al_80_micro_stories_di_logos', 'code.html');
const b4Content = fs.readFileSync(b4File, 'utf8');
let b4Pos = 0;
let b4Count = 0;
while (true) {
  const idx = b4Content.indexOf('<article', b4Pos);
  if (idx === -1) break;
  const articleHtml = extractBalancedTag(b4Content, idx);
  if (articleHtml) {
    b4Pos = idx + articleHtml.length;
    b4Count++;
    const num = 60 + b4Count;
    const id = `E${String(num).padStart(2, '0')}`;
    
    const aspectIdx = articleHtml.indexOf('aspect-[9/16]');
    let innerHtml = '';
    if (aspectIdx !== -1) {
      const aspectStart = articleHtml.lastIndexOf('<div', aspectIdx);
      innerHtml = extractBalancedTag(articleHtml, aspectStart);
    }
    const html = cleanHtmlForStage(innerHtml || articleHtml);
    const title = extractTitle(html, `Micro-Story & Diálogo ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b4',
      block: 'Micro-Stories & Diálogos',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    b4Pos = idx + 8;
  }
}

// =========================================================================
// 5. MAESTRA VERTICAL (E81 - E100)
// =========================================================================
console.log('Processing 5. Maestra Vertical (E81 - E100)...');
const mFile = path.join(baseDir, 'sens_suite_maestra_de_40_arquetipos_visuales_de_conversi_n_autoridad', 'code.html');
const mContent = fs.readFileSync(mFile, 'utf8');
const vSecStart = mContent.indexOf('data-category="vertical"');
const vSec = extractBalancedTag(mContent, mContent.lastIndexOf('<section', vSecStart));

let mPos = 0;
let mCount = 0;
while (true) {
  const idx = vSec.indexOf('<article', mPos);
  if (idx === -1) break;
  const articleHtml = extractBalancedTag(vSec, idx);
  if (articleHtml) {
    mPos = idx + articleHtml.length;
    mCount++;
    const num = 80 + mCount;
    const id = `E${String(num).padStart(2, '0')}`;
    const html = cleanHtmlForStage(articleHtml);
    const title = extractTitle(html, `Arquetipo Conversión ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'static',
      groupName: 'Estáticos',
      blockId: 'b5',
      block: 'Conversión & Autoridad',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    mPos = idx + 8;
  }
}

// =========================================================================
// 6. MOTION HOOKS (M01 - M20)
// =========================================================================
console.log('Processing 6. Motion Hooks (M01 - M20)...');
const mhFile = path.join(baseDir, 'sens_motion_design_studio_20_templates_9_16_cinematogr_ficos_growth_hooks', 'code.html');
const mhContent = fs.readFileSync(mhFile, 'utf8');
let mhPos = 0;
let mhCount = 0;
while (true) {
  const idx = mhContent.indexOf('class="archetype-card', mhPos);
  if (idx === -1) break;
  const divStart = mhContent.lastIndexOf('<div', idx);
  const cardHtml = extractBalancedTag(mhContent, divStart);
  if (cardHtml) {
    mhPos = divStart + cardHtml.length;
    mhCount++;
    const num = mhCount;
    const id = `M${String(num).padStart(2, '0')}`;
    const nameAttr = (cardHtml.match(/data-name="([^"]+)"/) || [])[1];
    
    const ratioIdx = cardHtml.indexOf('ratio-9-16');
    let innerHtml = '';
    if (ratioIdx !== -1) {
      const ratioStart = cardHtml.lastIndexOf('<div', ratioIdx);
      innerHtml = extractBalancedTag(cardHtml, ratioStart);
    }
    const html = cleanHtmlForStage(innerHtml || cardHtml);
    const title = nameAttr || extractTitle(html, `Growth Hook Motion ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'motion',
      groupName: 'Con animación',
      blockId: 'm1',
      block: 'Growth Hooks Cinematográficos',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    mhPos = idx + 20;
  }
}

// =========================================================================
// 7. MOTION VOL 2 (M21 - M40)
// =========================================================================
console.log('Processing 7. Motion Vol 2 (M21 - M40)...');
const mv2File = path.join(baseDir, 'sens_motion_design_studio_20_nuevas_coreograf_as_9_16_vol._2', 'code.html');
const mv2Content = fs.readFileSync(mv2File, 'utf8');
let mv2Pos = 0;
let mv2Count = 0;
while (true) {
  const idx = mv2Content.indexOf('class="template-card', mv2Pos);
  if (idx === -1) break;
  const divStart = mv2Content.lastIndexOf('<div', idx);
  const cardHtml = extractBalancedTag(mv2Content, divStart);
  if (cardHtml) {
    mv2Pos = divStart + cardHtml.length;
    mv2Count++;
    const num = 20 + mv2Count;
    const id = `M${String(num).padStart(2, '0')}`;
    const nameAttr = (cardHtml.match(/data-name="([^"]+)"/) || [])[1];
    const hookAttr = (cardHtml.match(/data-hook="([^"]+)"/) || [])[1];
    
    const aspectIdx = cardHtml.indexOf('aspect-[9/16]');
    let innerHtml = '';
    if (aspectIdx !== -1) {
      const aspectStart = cardHtml.lastIndexOf('<div', aspectIdx);
      innerHtml = extractBalancedTag(cardHtml, aspectStart);
    }
    const html = cleanHtmlForStage(innerHtml || cardHtml);
    const title = hookAttr || nameAttr || extractTitle(html, `Algorithmic Motion ${num}`);
    templates.push({
      id,
      code: id,
      num,
      format: '9:16',
      group: 'motion',
      groupName: 'Con animación',
      blockId: 'm2',
      block: 'Coreografías Algorítmicas Vol. 2',
      name: title,
      title,
      thumbBg: extractBgUrl(html),
      defaultBg: extractBgUrl(html),
      html
    });
  } else {
    mv2Pos = idx + 20;
  }
}

console.log(`\nTOTAL TEMPLATES GENERATED: ${templates.length}`);
const statics = templates.filter(t => t.group === 'static');
const motions = templates.filter(t => t.group === 'motion');
console.log(`Static: ${statics.length} (E01-E${statics.length})`);
console.log(`Motion: ${motions.length} (M01-M${motions.length})`);

// Validation check on all 140 templates
let noTextCount = 0;
templates.forEach(t => {
  const hasTextTag = /<(h[1-6]|p|blockquote|span|div)[^>]*>[^<]+<\/(h[1-6]|p|blockquote|span|div)>/i.test(t.html);
  if (!hasTextTag) {
    noTextCount++;
    console.error(`WARNING: Template ${t.id} has NO inner text tags!`);
  }
});
console.log(`Templates with missing text: ${noTextCount}`);

// Write to templates-db-200.js
const dbContent = `// Auto-generated SENS Templates V2 Database (9:16 & Motion Only • 140 Authentic Templates)
// Estáticos (E01-E100) & Con Animación (M01-M40) • Quiet Luxury Standard
if (typeof window === 'undefined') {
  global.window = global;
}

window.SENS_TEMPLATES_DB_200 = ${JSON.stringify(templates, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SENS_TEMPLATES_DB_200;
}
`;

fs.writeFileSync('marketing-suites/templates-db-200.js', dbContent, 'utf8');
console.log('✓ marketing-suites/templates-db-200.js written successfully.');

// Write to marketing_templates_catalog.js
const catalogContent = `// SENS Marketing Templates Catalog — 140 Authentic Templates 9:16 & Motion
if (typeof window === 'undefined') {
  global.window = global;
}

window.SENS_MARKETING_CATALOG = ${JSON.stringify(templates, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SENS_MARKETING_CATALOG;
}
`;

fs.writeFileSync('marketing_templates_catalog.js', catalogContent, 'utf8');
console.log('✓ marketing_templates_catalog.js written successfully.');
