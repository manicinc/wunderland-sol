const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'app', 'globals.css');
let content = fs.readFileSync(cssPath, 'utf8');

if (content.includes('@keyframes gradient')) {
  console.log('Gradient keyframes already exist');
  process.exit(0);
}

const insertion = `
/* Gradient animation for text */
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient {
  animation: gradient 3s ease infinite;
}

`;

const idx = content.indexOf('@keyframes float');
if (idx > -1) {
  content = content.slice(0, idx) + insertion + content.slice(idx);
  fs.writeFileSync(cssPath, content);
  console.log('Added gradient keyframes');
} else {
  console.log('Could not find insertion point');
}






























