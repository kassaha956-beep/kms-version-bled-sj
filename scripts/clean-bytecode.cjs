const path = require('path');
const fs = require('fs');

const electronDir = path.join(__dirname, '..', 'electron');
const files = fs.readdirSync(electronDir);

let count = 0;
for (const file of files) {
  if (file.endsWith('.jsc')) {
    fs.unlinkSync(path.join(electronDir, file));
    console.log(`🗑️ Removed ${file}`);
    count++;
  }
}

if (count === 0) {
  console.log('✨ No bytecode files to clean.');
} else {
  console.log(`🧹 Cleaned ${count} bytecode files.`);
}

