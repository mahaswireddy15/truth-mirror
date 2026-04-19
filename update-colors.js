const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.css')) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content.replace(/#FF3333/g, '#E8363D').replace(/#11111A/g, '#12122A');
        if (content !== newContent) {
          fs.writeFileSync(file, newContent, 'utf8');
          console.log('Updated: ' + file);
        }
      }
    }
  });
  return results;
}

walk(path.join(__dirname, 'src'));
console.log('Colors successfully updated.');
