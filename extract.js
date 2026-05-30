const fs = require('fs');
const text = fs.readFileSync('zaasDocs.html', 'utf8');
const regex = /https:\/\/[^\s"'<]*kyberswap[^\s"'<]*/g;
const matches = text.match(regex) || [];
console.log(Array.from(new Set(matches)).slice(0, 10).join('\n'));
