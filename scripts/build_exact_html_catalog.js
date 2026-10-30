const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\Lean\\SENS\\template -  marketing';

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

function processTemplateHtml(rawHtml, code, defaultBg) {
  let html = rawHtml;

  // 1. Tag the background container with class and id
  if (html.includes('style="background-image:')) {
    html = html.replace(/(style="background-image:[^"]*")/i, '$1 id="mktActiveBgSlot" class="mkt-template-bg-slot" data-mkt-media-slot="true"');
  } else if (html.includes('src=')) {
    html = html.replace(/(src="[^"]*")/i, '$1 id="mktActiveBgSlot" class="mkt-template-bg-slot" data-mkt-media-slot="true"');
  }

  // 2. Tag title element
  if (/<h[1-4][^>]*>/i.test(html)) {
    html = html.replace(/(<h[1-4][^>]*>)([\s\S]*?)(<\/h[1-4]>)/i, (match, open, text, close) => {
      // Remove any existing inner tags or wraps
      const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${open}<span data-mkt-field="title" contenteditable="true" spellcheck="false" class="mkt-live-editable-field">${clean}</span>${close}`;
    });
  }

  // 3. Tag bajada element
  if (/<p[^>]*>/i.test(html)) {
    html = html.replace(/(<p[^>]*>)([\s\S]*?)(<\/p>)/i, (match, open, text, close) => {
      const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${open}<span data-mkt-field="bajada" contenteditable="true" spellcheck="false" class="mkt-live-editable-field">${clean}</span>${close}`;
    });
  }

  // 4. Tag kicker/eyebrow if exists
  if (/font-label-sm[^>]*uppercase/i.test(html)) {
    html = html.replace(/(<span[^>]*font-label-sm[^>]*uppercase[^>]*>)([\s\S]*?)(<\/span>)/i, (match, open, text, close) => {
      if (text.includes('data-mkt-field')) return match;
      const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${open}<span data-mkt-field="tag" contenteditable="true" spellcheck="false" class="mkt-live-editable-field">${clean}</span>${close}`;
    });
  }

  return html;
}

// 1. 4:5 Block 1 (F01 - F20)
function get45Block1() {
  const p = path.join(base, 'sens_suite_4_5_templates_bloque_i_f01_al_f20_composici_n_bloques_flotantes', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<div class="specimen-card[^"]*" data-specimen="(F\d+)">([\s\S]*?)<\/div>\s*(?=<!--\s*F\d+|<\/div>\s*<\/section>)/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Plantilla ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Sincronización circadiana mediante luz matutina.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('F', ''), 10),
      format: '4:5',
      aspectRatio: '4/5',
      blockId: 'b1',
      block: 'Bloque I: Flotantes',
      name: title || `Flotante ${code}`,
      title: title || 'Equilibrio Bioquímico',
      bajada: bajada,
      tag: 'SENS PROTOCOL',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 65, bajada: 120 }
    });
  }
  return list;
}

// 2. 4:5 Block 2 (F21 - F40)
function get45Block2() {
  const p = path.join(base, 'sens_suite_4_5_templates_bloque_ii_f21_al_f40_editorial_tipograf_a_pura', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(F\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i) || raw.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-3-movilidad.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Editorial ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Entrenamiento consciente y rendimiento con dolor cero.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('F', ''), 10),
      format: '4:5',
      aspectRatio: '4/5',
      blockId: 'b2',
      block: 'Bloque II: Editorial & Tipografía',
      name: title || `Editorial ${code}`,
      title: title || 'Precisión Tipográfica',
      bajada: bajada,
      tag: 'EDITORIAL SENS',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 70, bajada: 130 }
    });
  }
  return list;
}

// 3. 4:5 Block 3 (F41 - F60)
function get45Block3() {
  const p = path.join(base, 'sens_suite_4_5_templates_bloque_iii_f41_al_f60_m_tricas_datos_comparativas', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(F\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Métrica ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Evolución neuromuscular medible en cada sesión.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('F', ''), 10),
      format: '4:5',
      aspectRatio: '4/5',
      blockId: 'b3',
      block: 'Bloque III: Métricas & Datos',
      name: title || `Métrica ${code}`,
      title: title || 'Biometría & Telemetría',
      bajada: bajada,
      tag: 'TELEMETRÍA SENS',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 65, bajada: 110 }
    });
  }
  return list;
}

// 4. 4:5 Block 4 (F61 - F80)
function get45Block4() {
  const p = path.join(base, 'sens_suite_4_5_templates_bloque_iv_f61_al_f80_micro_stories_quotes_di_logos', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(F\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-4-adherencia.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Quote ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Diálogo real de evolución postural y fuerza tranquila.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('F', ''), 10),
      format: '4:5',
      aspectRatio: '4/5',
      blockId: 'b4',
      block: 'Bloque IV: Micro-Stories & Diálogos',
      name: title || `Micro-Story ${code}`,
      title: title || 'Voz del Alumno',
      bajada: bajada,
      tag: 'TESTIMONIO SENS',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 75, bajada: 140 }
    });
  }
  return list;
}

// 5. 4:5 Block 5 (F81 - F100)
function get45Block5() {
  const p = path.join(base, 'sens_suite_4_5_templates_bloque_v_f81_al_f100_conversi_n_escasez_llamados_a_la', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*([0-9]+\s*[•\-–]\s*)?(F\d+)[^>]*-->([\s\S]*?)(?=<!--\s*[0-9]+\s*[•\-–]\s*F\d+|<\/div>\s*<\/section>)/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[2];
    const raw = m[3];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i) || raw.match(/src=['"]([^'"]+)['"]/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || raw.match(/<span class="[^"]*font-semibold[^"]*">([\s\S]*?)<\/span>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Conversión ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Cupos limitados mensuales para entrenamiento 1 a 1.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('F', ''), 10),
      format: '4:5',
      aspectRatio: '4/5',
      blockId: 'b5',
      block: 'Bloque V: Conversión & Escasez',
      name: title || `Conversión ${code}`,
      title: title || 'Pase de Membresía',
      bajada: bajada,
      tag: 'PASES & CUPOS',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 65, bajada: 110 }
    });
  }
  return list;
}

// 6. 9:16 Block 1 (T01 - T20)
function get916Block1() {
  const p = path.join(base, 'sens_suite_9_16_templates_bloque_i_01_al_20_limpio_sin_ojito', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*={4,}\s*(T\d+)\s*={4,}\s*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Story ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Aprender a desacelerar el tono vagal transforma la recuperación celular.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('T', ''), 10),
      format: '9:16',
      aspectRatio: '9/16',
      blockId: 'b1',
      block: 'Bloque I: Flotantes 9:16',
      name: title || `Story ${code}`,
      title: title || 'La longevidad no es resistencia, es modulación.',
      bajada: bajada,
      tag: 'SENS STORY',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 75, bajada: 130 }
    });
  }
  return list;
}

// 7. 9:16 Block 2 (T21 - T40)
function get916Block2() {
  const p = path.join(base, 'sens_suite_9_16_templates_bloque_ii_21_al_40_limpio_sin_ojito', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(T\d+)[^>]*-->([\s\S]*?)(?=<!--\s*T\d+|<\/div>\s*<\/section>)/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-3-movilidad.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Editorial ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Filosofía biomecánica aplicada a la salud diaria.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('T', ''), 10),
      format: '9:16',
      aspectRatio: '9/16',
      blockId: 'b2',
      block: 'Bloque II: Tipografía & Statements',
      name: title || `Editorial ${code}`,
      title: title || 'Declaración de Principios',
      bajada: bajada,
      tag: 'EDITORIAL STORY',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 80, bajada: 140 }
    });
  }
  return list;
}

// 8. 9:16 Block 3 (T41 - T60)
function get916Block3() {
  const p = path.join(base, 'sens_suite_9_16_templates_bloque_iii_41_al_60', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(T\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Métrica ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Frecuencia cardíaca en reposo y carga neuromuscular.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('T', ''), 10),
      format: '9:16',
      aspectRatio: '9/16',
      blockId: 'b3',
      block: 'Bloque III: Métricas & Datos',
      name: title || `Métrica ${code}`,
      title: title || 'Datos de Longevidad',
      bajada: bajada,
      tag: 'TELEMETRÍA 9:16',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 70, bajada: 120 }
    });
  }
  return list;
}

// 9. 9:16 Block 4 (T61 - T80)
function get916Block4() {
  const p = path.join(base, 'sens_suite_9_16_templates_bloque_iv_61_al_80_micro_stories_di_logos', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*CARD\s*(T\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const code = m[1];
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/pilar-4-adherencia.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Micro Story ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Transcripción de la evolución somática entre alumno y coach.';

    list.push({
      id: code,
      code: code,
      num: parseInt(code.replace('T', ''), 10),
      format: '9:16',
      aspectRatio: '9/16',
      blockId: 'b4',
      block: 'Bloque IV: Micro-Stories & Diálogos',
      name: title || `Micro Story ${code}`,
      title: title || 'Conversación Real',
      bajada: bajada,
      tag: 'DIÁLOGOS SENS',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 80, bajada: 140 }
    });
  }
  return list;
}

// 10. 9:16 Block 5 (T81 - T100)
function get916Block5() {
  const p = path.join(base, 'sens_suite_9_16_templates_bloque_v_81_100', 'code.html');
  const html = cleanUtf8(fs.readFileSync(p, 'utf8'));
  const regex = /<!--\s*(T\d+)[^>]*-->([\s\S]*?)<\/article>/gi;
  const list = [];
  let m;
  let idx = 81;
  while ((m = regex.exec(html)) !== null) {
    const code = `T${idx.toString().padStart(2, '0')}`;
    const raw = m[2];
    const bgMatch = raw.match(/url\(['"]([^'"]+)['"]\)/i);
    const bg = bgMatch ? bgMatch[1] : 'img/hero-bg-opt.jpg';
    const tMatch = raw.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = tMatch ? tMatch[1].replace(/<[^>]+>/g, '').trim() : `Conversión ${code}`;
    const bMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const bajada = bMatch ? bMatch[1].replace(/<[^>]+>/g, '').trim() : 'Iniciá tu evaluación somática y transformá tu movilidad.';

    list.push({
      id: code,
      code: code,
      num: idx,
      format: '9:16',
      aspectRatio: '9/16',
      blockId: 'b5',
      block: 'Bloque V: Conversión & Escasez',
      name: title || `Conversión ${code}`,
      title: title || 'Llamado a la Acción 9:16',
      bajada: bajada,
      tag: 'CONVERSIÓN 9:16',
      defaultBg: bg,
      htmlTemplate: processTemplateHtml(raw.trim(), code, bg),
      charLimits: { tag: 25, title: 75, bajada: 120 }
    });
    idx++;
  }
  return list;
}

const templates = [
  ...get45Block1(),
  ...get45Block2(),
  ...get45Block3(),
  ...get45Block4(),
  ...get45Block5(),
  ...get916Block1(),
  ...get916Block2(),
  ...get916Block3(),
  ...get916Block4(),
  ...get916Block5()
];

console.log(`Successfully built ${templates.length} templates with active edit fields.`);

const fileContent = `/* =============================================================================
   SENS QUIET VITALITY — SUITE MASTER DE 200 TEMPLATES EXACTOS (4:5 & 9:16)
   100 Templates en 4:5 (F01 a F100) | 100 Templates en 9:16 (T01 a T100)
   Estructuras HTML auténticas, Límite Estricto de Caracteres y Soporte UHD 4K
   ============================================================================= */

if (typeof window === 'undefined') {
    global.window = global;
}

window.SENS_MARKETING_CATALOG = ${JSON.stringify(templates, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SENS_MARKETING_CATALOG;
}
`;

fs.writeFileSync('marketing_templates_catalog.js', fileContent, 'utf8');
console.log('Saved updated marketing_templates_catalog.js.');
