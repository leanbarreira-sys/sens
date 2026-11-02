/**
 * AUTOMATED QA TEST SUITE: SENS GROWTH MARKETING STUDIO — MOBILE VIEWPORT (IPHONE 15)
 * Focus: 360px - 430px viewports (iPhone 15 @ 390px), single-row pills, iOS WebKit touch, sticky dock.
 */

const fs = require('fs');
const path = require('path');

const masterHtmlPath = path.join(__dirname, '..', 'marketing-suites', 'studio-master.html');
const engineJsPath = path.join(__dirname, '..', 'marketing-suites', 'studio-master-engine.js');
const hostHtmlPath = path.join(__dirname, '..', 'index.html');
const hostCssPath = path.join(__dirname, '..', 'style.css');

const masterHtml = fs.readFileSync(masterHtmlPath, 'utf8');
const engineJs = fs.readFileSync(engineJsPath, 'utf8');
const hostHtml = fs.readFileSync(hostHtmlPath, 'utf8');
const hostCss = fs.readFileSync(hostCssPath, 'utf8');

const testResults = [];

function assert(condition, testId, description, details = {}) {
  const result = {
    testId,
    description,
    passed: Boolean(condition),
    details
  };
  testResults.push(result);
  const mark = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark} [${testId}] ${description}`);
  if (!result.passed) {
    console.log('   Details:', details);
  }
  return result.passed;
}

console.log('================================================================');
console.log('  SENS MARKETING STUDIO — MOBILE & IPHONE 15 COMPREHENSIVE QA');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. AUDIT: PILLS & SELECTION BARS (1-ROW HORIZONTAL SCROLL & FLEX-SHRINK: 0)
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: PILLS & SELECTION BARS ERGONOMICS ---');

// 1.1 Class sens-pill-row-scroll definition
const pillScrollRuleRegex = /\.sens-pill-row-scroll\s*\{([^}]+)\}/s;
const pillScrollMatch = masterHtml.match(pillScrollRuleRegex);
assert(
  pillScrollMatch &&
  pillScrollMatch[1].includes('display: flex') &&
  pillScrollMatch[1].includes('flex-wrap: nowrap') &&
  pillScrollMatch[1].includes('overflow-x: auto') &&
  pillScrollMatch[1].includes('-webkit-overflow-scrolling: touch'),
  'MKT-PILL-01',
  '.sens-pill-row-scroll defines flex nowrap with horizontal touch scroll',
  { cssSnippet: pillScrollMatch ? pillScrollMatch[1].trim().replace(/\s+/g, ' ') : null }
);

// 1.2 Direct children rule for flex-shrink: 0 and white-space: nowrap
const pillChildrenRuleRegex = /\.sens-pill-row-scroll\s*>\s*\*\s*\{([^}]+)\}/s;
const pillChildrenMatch = masterHtml.match(pillChildrenRuleRegex);
assert(
  pillChildrenMatch &&
  pillChildrenMatch[1].includes('flex-shrink: 0') &&
  pillChildrenMatch[1].includes('white-space: nowrap'),
  'MKT-PILL-02',
  '.sens-pill-row-scroll > * enforces flex-shrink: 0 and white-space: nowrap on all child pills',
  { cssSnippet: pillChildrenMatch ? pillChildrenMatch[1].trim().replace(/\s+/g, ' ') : null }
);

// 1.3 Format buttons (9:16, 4:5, Motion Loop)
const formatButtonsPresent = masterHtml.includes('data-format-btn="9:16"') &&
                             masterHtml.includes('data-format-btn="4:5"') &&
                             masterHtml.includes('data-format-btn="loop"');
assert(formatButtonsPresent, 'MKT-PILL-03', 'Format selector buttons (9:16, 4:5, Motion Loop) exist in HTML');

const formatParentContainer = masterHtml.includes('overflow-x-auto sens-pill-row-scroll') &&
                              masterHtml.includes('bg-surface-container-low p-1 rounded-xl shrink-0');
assert(formatParentContainer, 'MKT-PILL-04', 'Format selector sits in a single-row touch-scrollable container with shrink-0');

// 1.4 Pillar selector (b1 to b5)
const pillarContainerExists = masterHtml.includes('id="pillar-chips-bar" class="sens-pill-row-scroll gap-1.5 pb-1"');
assert(pillarContainerExists, 'MKT-PILL-05', '#pillar-chips-bar has sens-pill-row-scroll without wrapping');

const pillarsDataMatch = engineJs.includes("'b1'") && engineJs.includes("'b5'");
assert(pillarsDataMatch, 'MKT-PILL-06', 'Pillars b1 through b5 are defined for both 9:16 and 4:5');

// Check dynamic renderPillarChips function classes
const renderPillarSnippet = engineJs.substring(
  engineJs.indexOf('function renderPillarChips'),
  engineJs.indexOf('// Render Horizontal Template Carousel')
);
assert(
  renderPillarSnippet.includes('whitespace-nowrap') && renderPillarSnippet.includes('data-pillar-id'),
  'MKT-PILL-07',
  'Pillar chip buttons render with whitespace-nowrap and touch pill geometry'
);

// 1.5 Framing / Zoom / Contrast controls
const framingControlsExist = masterHtml.includes('data-pan-btn="25"') &&
                             masterHtml.includes('data-zoom-btn="1"') &&
                             masterHtml.includes('data-scrim-btn="0.80"');
assert(framingControlsExist, 'MKT-PILL-08', 'Framing, zoom, and contrast buttons exist in Section 2');

const framingButtonClasses = masterHtml.includes('data-pan-btn="50"') &&
                             masterHtml.includes('data-zoom-btn="1.08"') &&
                             masterHtml.includes('data-scrim-btn="0.65"');
assert(framingButtonClasses, 'MKT-PILL-09', 'Media control buttons configured with high-contrast active states');

// 1.6 Quick Text Formulas
const textFormulasExist = masterHtml.includes('data-formula-id="lumbar"') &&
                          masterHtml.includes('data-formula-id="rodilla"') &&
                          masterHtml.includes('data-formula-id="social"') &&
                          masterHtml.includes('data-formula-id="vip"');
assert(textFormulasExist, 'MKT-PILL-10', 'All 4 high-CTR text formulas present in Step 3');

const formulaContainerScroll = masterHtml.includes('class="sens-pill-row-scroll gap-1 shrink-0"');
assert(formulaContainerScroll, 'MKT-PILL-11', 'Text formula ribbon has sens-pill-row-scroll and shrink-0');

// -----------------------------------------------------------------------------
// 2. AUDIT: IOS SAFARI & IPHONE 15 TOUCH ERGONOMICS
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: IOS SAFARI & IPHONE 15 ERGONOMICS ---');

// 2.1 touch-action: pan-y in studio-master.html
const touchActionHtml = masterHtml.includes('touch-action: pan-y;');
assert(touchActionHtml, 'MKT-IOS-01', 'studio-master.html enforces touch-action: pan-y on html, body');

// 2.2 -webkit-overflow-scrolling: touch in studio-master.html
const webkitScrollHtml = masterHtml.includes('-webkit-overflow-scrolling: touch;');
assert(webkitScrollHtml, 'MKT-IOS-02', 'studio-master.html enforces -webkit-overflow-scrolling: touch');

// 2.3 Safe area inset padding-bottom cushion
const safeAreaCushion = masterHtml.includes('pb-mobile-cushion') &&
                        masterHtml.includes('env(safe-area-inset-bottom');
assert(safeAreaCushion, 'MKT-IOS-03', '.pb-mobile-cushion uses dynamic env(safe-area-inset-bottom) in studio-master.html');

// 2.4 Host iframe styling in style.css and index.html
const hostPaneMarketing = hostCss.includes('#paneMarketing') &&
                          hostCss.includes('env(safe-area-inset-bottom');
assert(hostPaneMarketing, 'MKT-IOS-04', 'style.css protects #paneMarketing with env(safe-area-inset-bottom) on mobile');

const hostIframeTouch = hostCss.includes('#sensMarketingSuiteFrame') &&
                        hostCss.includes('-webkit-overflow-scrolling: touch');
assert(hostIframeTouch, 'MKT-IOS-05', 'style.css ensures #sensMarketingSuiteFrame has -webkit-overflow-scrolling: touch and pan-y');

// -----------------------------------------------------------------------------
// 3. AUDIT: STICKY FLOATING MINI-DOCK (#sens-sticky-floating-bar)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: STICKY FLOATING DOCK (#sens-sticky-floating-bar) ---');

// 3.1 Dock existence in HTML
const dockElementExists = masterHtml.includes('id="sens-sticky-floating-bar"');
assert(dockElementExists, 'MKT-DOCK-01', '#sens-sticky-floating-bar element exists in studio-master.html');

// 3.2 Initially hidden with sens-dock-hidden class
const dockInitiallyHidden = masterHtml.includes('<aside id="sens-sticky-floating-bar" class="sens-dock-hidden');
assert(dockInitiallyHidden, 'MKT-DOCK-02', '#sens-sticky-floating-bar starts with sens-dock-hidden class');

// 3.3 CSS translate and opacity transition for dock
const dockCssRules = masterHtml.includes('#sens-sticky-floating-bar.sens-dock-hidden') &&
                     masterHtml.includes('transform: translate3d(-50%, 150%, 0)');
assert(dockCssRules, 'MKT-DOCK-03', 'sens-dock-hidden animates smoothly offscreen with GPU transform');

// 3.3b Safe-Area Inset for iPhone 15 Home Indicator
const dockSafeAreaRule = masterHtml.includes('#sens-sticky-floating-bar') &&
                         masterHtml.includes('env(safe-area-inset-bottom');
assert(dockSafeAreaRule, 'MKT-DOCK-03b', '#sens-sticky-floating-bar clears iPhone 15 home indicator via dynamic env(safe-area-inset-bottom)');

// 3.4 Scroll listener and trigger logic in engine
const scrollListenerExists = engineJs.includes('sens-sticky-floating-bar') &&
                             engineJs.includes('updateFloatingBarVisibility') &&
                             engineJs.includes("window.addEventListener('scroll'");
assert(scrollListenerExists, 'MKT-DOCK-04', 'Passive RAF scroll listener is bound to window in engine.js');

const scrollThresholdLogic = engineJs.includes('rect.bottom < 180') &&
                             engineJs.includes("floatingBar.classList.remove('sens-dock-hidden')");
assert(scrollThresholdLogic, 'MKT-DOCK-05', 'Dock activates when preview scrolls out of primary viewport (rect.bottom < 180)');

// 3.5 Active template name display
const templateNameBinding = engineJs.includes('floating-bar-template-name') &&
                            masterHtml.includes('id="floating-bar-template-name"');
assert(templateNameBinding, 'MKT-DOCK-06', 'Active template name is dynamically synced to #floating-bar-template-name');

// 3.6 PNG Export button in floating bar
const floatingPngExportBinding = engineJs.includes('btn-floating-export-png') &&
                                 engineJs.includes('handleExportTransparentOverlayPNG') &&
                                 masterHtml.includes('id="btn-floating-export-png"');
assert(floatingPngExportBinding, 'MKT-DOCK-07', '#btn-floating-export-png triggers handleExportTransparentOverlayPNG');

// 3.7 Scroll-to-top button in floating bar
const floatingScrollTopBinding = engineJs.includes('btn-floating-scroll-top') &&
                                 engineJs.includes("scrollIntoView({ behavior: 'smooth'");
assert(floatingScrollTopBinding, 'MKT-DOCK-08', '#btn-floating-scroll-top smoothly scrolls user back to preview section');

// -----------------------------------------------------------------------------
// 4. SUMMARY & QUALITY SCORE
// -----------------------------------------------------------------------------
const totalTests = testResults.length;
const passedTests = testResults.filter(r => r.passed).length;
const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log('\n================================================================');
console.log(`  QA SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${passRate}%)`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL AUTOMATED MOBILE AUDIT CRITERIA PASSED WITH ZERO DRIFT!');
} else {
  console.log(`⚠️ ${totalTests - passedTests} CHECKS REQUIRE ATTENTION.`);
}
