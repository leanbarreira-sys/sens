const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const onbMatch = html.match(/<section class="portal-view" id="onboardingSection">([\s\S]*?)<\/section>/);
if (!onbMatch) {
    console.log('onboardingSection not found');
    process.exit(1);
}

const onbHtml = onbMatch[1];
const idRegex = /id="([^"]+)"/g;
let m;
const ids = [];
while ((m = idRegex.exec(onbHtml)) !== null) {
    ids.push(m[1]);
}

console.log('Total IDs in onboardingSection:', ids.length);
const usedInApp = ids.filter(id => app.includes(id));
console.log('IDs used in app.js (' + usedInApp.length + '):');
usedInApp.forEach(id => console.log(' - ' + id));
