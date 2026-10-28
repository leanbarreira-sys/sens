const fs = require('fs');

// 1. Parse real index.html to build element registry
const html = fs.readFileSync('index.html', 'utf8');

const idSet = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
    idSet.add(match[1]);
}
console.log('Total valid IDs in index.html:', idSet.size);

// 2. Setup mock browser environment that uses REAL index.html IDs
function createMockElement(id) {
    const styleObj = {
        setProperty(k, v) { this[k] = v; },
        removeProperty(k) { delete this[k]; }
    };
    return {
        id: id,
        style: styleObj,
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); },
            toggle(c, force) {
                if (force === undefined) {
                    if (this.classes.has(c)) this.classes.delete(c);
                    else this.classes.add(c);
                } else if (force) this.classes.add(c);
                else this.classes.delete(c);
            }
        },
        innerHTML: '',
        textContent: '',
        value: '',
        play() { return Promise.resolve(); },
        pause() {},
        load() {},
        appendChild(child) { return child; },
        removeChild(child) { return child; },
        setAttribute: () => {},
        getAttribute: () => null,
        removeAttribute: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        closest: () => null
    };
}

const elementsCache = {};
function getEl(id) {
    if (!idSet.has(id)) return null;
    if (!elementsCache[id]) {
        elementsCache[id] = createMockElement(id);
    }
    return elementsCache[id];
}

global.window = global;
global.window.addEventListener = (evt, cb) => {
    if (evt === 'DOMContentLoaded' || evt === 'load') {
        global._domCbs = global._domCbs || [];
        global._domCbs.push(cb);
    }
};
global.window.removeEventListener = () => {};
global.window.location = { href: 'http://localhost/', reload: () => {}, search: '', hash: '' };
global.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
global.window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.window.cancelAnimationFrame = (id) => clearTimeout(id);

global.document = {
    addEventListener: (evt, cb) => {
        if (evt === 'DOMContentLoaded' || evt === 'load') {
            global._domCbs = global._domCbs || [];
            global._domCbs.push(cb);
        }
    },
    removeEventListener: () => {},
    documentElement: createMockElement('html'),
    body: createMockElement('body'),
    getElementById: (id) => getEl(id),
    querySelector: (sel) => {
        if (sel.startsWith('#')) return getEl(sel.substring(1));
        return null;
    },
    querySelectorAll: (sel) => {
        if (sel.startsWith('#')) {
            const el = getEl(sel.substring(1));
            return el ? [el] : [];
        }
        return [];
    },
    createElement: (tag) => createMockElement(tag)
};

global.localStorage = {
    _data: {},
    getItem: (k) => global.localStorage._data[k] || null,
    setItem: (k, v) => { global.localStorage._data[k] = String(v); },
    removeItem: (k) => { delete global.localStorage._data[k]; }
};
global.navigator = { userAgent: 'node', serviceWorker: { register: () => Promise.resolve() } };

console.log('\n--- 1. Testing Script Loading ---');
require('../nutrition_db.js');
console.log('OK: nutrition_db.js');
require('../coach_nutrition_master.js');
console.log('OK: coach_nutrition_master.js');
require('../exercises_db.js');
console.log('OK: exercises_db.js');
require('../app.js');
console.log('OK: app.js loaded');

console.log('\n--- 2. Testing DOMContentLoaded Callbacks ---');
(global._domCbs || []).forEach((cb, idx) => {
    try {
        cb();
        console.log(`OK: Callback ${idx}`);
    } catch (e) {
        console.error(`FAIL: Callback ${idx}:`, e);
    }
});

console.log('\n--- 3. Testing Portal Views ---');
const views = ['dashView', 'workoutView', 'nutritionView', 'coachHubView'];
views.forEach(v => {
    try {
        if (typeof global.window.switchPortalView === 'function') {
            global.window.switchPortalView(v);
            console.log(`OK: switchPortalView('${v}')`);
        }
    } catch (e) {
        console.error(`FAIL: switchPortalView('${v}'):`, e);
    }
});

console.log('\n--- 4. Testing Nutrition Functions ---');
try {
    if (typeof global.window.renderMemberNutriPlan === 'function') {
        global.window.renderMemberNutriPlan();
        console.log('OK: renderMemberNutriPlan()');
    }
} catch (e) {
    console.error('FAIL: renderMemberNutriPlan():', e);
}

try {
    const testFood = global.window.getResolvedFood('NUT-001');
    console.log('OK: getResolvedFood(NUT-001):', testFood ? testFood.name : 'null');
} catch (e) {
    console.error('FAIL: getResolvedFood:', e);
}

console.log('\n--- ALL FLOW TESTS COMPLETED ---');
