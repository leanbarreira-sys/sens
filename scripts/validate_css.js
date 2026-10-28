const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

let depth = 0;
let inString = false;
let strChar = '';
let inComment = false;
let lineNum = 1;
let openStack = [];

for (let i = 0; i < css.length; i++) {
    const c = css[i];
    const next = css[i+1];
    
    if (c === '\n') lineNum++;
    
    if (inComment) {
        if (c === '*' && next === '/') {
            inComment = false;
            i++;
        }
        continue;
    }
    
    if (inString) {
        if (c === strChar && css[i-1] !== '\\') {
            inString = false;
        }
        continue;
    }
    
    if (c === '/' && next === '*') {
        inComment = true;
        i++;
        continue;
    }
    
    if (c === '"' || c === "'") {
        inString = true;
        strChar = c;
        continue;
    }
    
    if (c === '{') {
        depth++;
        openStack.push(lineNum);
    } else if (c === '}') {
        depth--;
        openStack.pop();
        if (depth < 0) {
            console.error('ERROR: Unmatched closing brace at line', lineNum);
            process.exit(1);
        }
    }
}

if (depth !== 0) {
    console.error('ERROR: Unclosed brace(s)! Remaining open depth:', depth);
    console.error('Unclosed braces opened at lines:', openStack);
    process.exit(1);
} else {
    console.log('SUCCESS: All', openStack.length, 'braces in style.css match with 100% precision.');
}
