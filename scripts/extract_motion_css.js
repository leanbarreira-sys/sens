const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/Lean/SENS/template -  marketing/templates v2/stitch_sens_quiet_luxury_design_system';

const p1 = path.join(baseDir, 'sens_motion_design_studio_20_templates_9_16_cinematogr_ficos_growth_hooks', 'code.html');
const html1 = fs.readFileSync(p1, 'utf8');

const p2 = path.join(baseDir, 'sens_motion_design_studio_20_nuevas_coreograf_as_9_16_vol._2', 'code.html');
const html2 = fs.readFileSync(p2, 'utf8');

function extractCss(html) {
  const styles = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  return styles.map(s => s.replace(/<style[^>]*>|<\/style>/gi, '')).join('\n');
}

const css1 = extractCss(html1);
const css2 = extractCss(html2);

const combinedMotionCss = `/* =============================================================================
   SENS MOTION DESIGN STUDIO — KEYFRAMES & COREOGRAFÍAS 9:16 (GROWTH HOOKS & VOL 2)
   ============================================================================= */
${css1}

${css2}
`;

fs.writeFileSync('marketing-suites/motion-animations.css', combinedMotionCss, 'utf8');
console.log('Saved motion-animations.css with size:', combinedMotionCss.length);
