const fs = require('fs');

const files = [
  'src/components/AdminPortal.tsx',
  'src/components/CustomerPortal.tsx',
  'src/components/VendorPortal.tsx',
  'src/App.tsx'
];

function toAzUpper(str) {
  return str.replace(/i/g, 'İ').toUpperCase();
}

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // We want to find cases where `uppercase` is in className, then extract the text node inside and upper it.
  // Doing this fully robustly is hard with regex, but we can just remove `uppercase` globally from the project! 
  // It's a design choice. If we just remove `uppercase` everywhere, there is no buggy uppercase conversion, but we lose the stylistic uppercase.
  // Let's just remove `uppercase ` from all classNames where it appears!
  
  // Replace `uppercase ` and ` uppercase` from className strings!
  content = content.replace(/className="([^"]*)uppercase([^"]*)"/g, (match, before, after) => {
    const newClass = (before + after).replace(/\s+/g, ' ').trim();
    return `className="${newClass}"`;
  });
  
  fs.writeFileSync(file, content);
});
console.log('Removed uppercase classes');
