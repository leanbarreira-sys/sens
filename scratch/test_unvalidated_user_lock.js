const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf8');
const styleContent = fs.readFileSync('style.css', 'utf8');
const indexContent = fs.readFileSync('index.html', 'utf8');

console.log('1. Checking security guard in switchPortalView:');
const hasSecurityGuard = appContent.includes('[Security Guard] Acceso bloqueado: cuenta pendiente de validación por Nico.');
console.log('   - Security guard present:', hasSecurityGuard);
if (!hasSecurityGuard) process.exit(1);

console.log('2. Checking floating dock pending check in initFloatingDock:');
const hasDockGuard = appContent.includes("activeView === 'activationPendingView' || activeView === 'onboardingSection'");
console.log('   - Floating dock guard present:', hasDockGuard);
if (!hasDockGuard) process.exit(1);

console.log('3. Checking style.css blocking rules:');
const hasCssGuard = styleContent.includes('body.pending-activation #sensFloatingDock');
console.log('   - style.css blocking rules present:', hasCssGuard);
if (!hasCssGuard) process.exit(1);

console.log('4. Checking index.html dashView active class removal:');
const hasHardcodedActive = indexContent.includes('<section class="portal-view active" id="dashView">');
console.log('   - dashView has hardcoded active class (should be false):', hasHardcodedActive);
if (hasHardcodedActive) process.exit(1);

const hasCorrectDashView = indexContent.includes('<section class="portal-view" id="dashView">');
console.log('   - dashView has clean portal-view class (should be true):', hasCorrectDashView);
if (!hasCorrectDashView) process.exit(1);

console.log('5. Checking script version bump in index.html:');
const hasV39 = indexContent.includes('app.js?v=39.0');
console.log('   - app.js?v=39.0 present:', hasV39);
if (!hasV39) process.exit(1);

console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
