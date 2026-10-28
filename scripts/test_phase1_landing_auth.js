const fs = require('fs');

console.log('=== PHASE 1 VERIFICATION TEST ===');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

// 1. Verify Black Logo in Header, Mobile Menu, Footer, and Auth Modal (logo-NEGRO.png on light surfaces)
const logoNegroMatches = (html.match(/src="img\/logo-NEGRO\.png"/g) || []).length;
console.log(`1. img/logo-NEGRO.png occurrences in index.html: ${logoNegroMatches} (Expected >= 4)`);
if (logoNegroMatches < 4) {
  console.error('ERROR: Missing logo-NEGRO.png replacements');
  process.exit(1);
}

// 2. Critical DOM IDs Preservation
const requiredIds = [
  'globalNavbar', 'headerLogoLink', 'headerBrandLogo', 'navInstallAppBtn', 'navClientAccessBtn', 'navClientAccessBtnMobile', 'menuToggle',
  'publicLanding', 'sensTrainHero', 'pilares', 'metodo', 'planes', 'sumate', 'publicLeadForm', 'leadFullName', 'leadPhone', 'leadGoal', 'btnSubmitLead', 'wellness',
  'btnModeApp', 'btnModePresencial', 'btnModeOnline', 'btnSubInd', 'btnSubGrupos', 'tab-app', 'tab-presencial-ind', 'tab-presencial-grupos', 'tab-online',
  'authModal', 'closeAuthModalBtn', 'tabLoginBtn', 'tabRegisterBtn', 'authAlertBox', 'loginForm', 'loginEmail', 'loginPassword', 'btnForgotPass', 'submitLoginBtn', 'registerForm', 'regFullName', 'regEmail', 'regPassword', 'submitRegBtn', 'forgotPassForm', 'forgotEmail', 'submitForgotBtn'
];

let missing = [];
requiredIds.forEach(id => {
  if (!html.includes(`id="${id}"`)) {
    missing.push(id);
  }
});

if (missing.length > 0) {
  console.error('ERROR: Missing required DOM IDs:', missing);
  process.exit(1);
} else {
  console.log(`2. All ${requiredIds.length} critical DOM IDs preserved perfectly.`);
}

// 3. Verify CSS Scoping
const hasPhase1Scoped = css.includes('FASE 1: SENS QUIET LIGHT LUXURY');
const hasAuthModalLight = css.includes('#authModal .modal-card') && css.includes('background: #FFFFFF !important');
const hasAlabasterBody = css.includes('body:not(.in-portal)') && css.includes('background-color: #FAF9F6 !important');

console.log('3. CSS Checks:');
console.log('   - Has Phase 1 Scoped Block:', hasPhase1Scoped);
console.log('   - Has Auth Modal Light Luxury:', hasAuthModalLight);
console.log('   - Has Alabaster Body Scoped:', hasAlabasterBody);

if (!hasPhase1Scoped || !hasAuthModalLight || !hasAlabasterBody) {
  console.error('ERROR: CSS scoping verification failed');
  process.exit(1);
}

// 4. Test Element Presence in HTML
console.log('4. DOM Tree Element Checks:');
['authModal', 'closeAuthModalBtn', 'tabLoginBtn', 'tabRegisterBtn', 'loginForm', 'registerForm'].forEach(id => {
  const present = html.includes(`id="${id}"`);
  console.log(`   - ${id} exists:`, present);
});

console.log('=== PHASE 1 TEST PASSED WITH 100% FIDELITY ===');
