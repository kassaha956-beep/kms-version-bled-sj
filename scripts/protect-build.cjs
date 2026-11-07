const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const bytenode = require('bytenode');

async function compileAllBytecode() {
  console.log('🔒 [BYTENODE] Starting bytecode protection before build...');
  const electronDir = path.join(__dirname, '..', 'electron');

  const filesToProtect = [
    'activation.cjs',
    'invoiceParser.cjs',
    'db.cjs',
    'main.src.cjs'
  ];

  for (const file of filesToProtect) {
    const srcPath = path.join(electronDir, file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️ File not found: ${file}, skipping.`);
      continue;
    }

    const outName = file.replace(/\.src\.cjs$/, '.jsc').replace(/\.cjs$/, '.jsc');
    const outPath = path.join(electronDir, outName);

    console.log(`🔨 Compiling ${file} -> ${outName}...`);
    await bytenode.compileFile({
      filename: srcPath,
      output: outPath,
      compileAsModule: true
    });

    const stat = fs.statSync(outPath);
    console.log(`✅ ${outName} generated (${(stat.size / 1024).toFixed(1)} KB binary V8 bytecode).`);
  }

  console.log('🛡️ [BYTENODE] All core Electron modules successfully encrypted to bytecode!');
}

compileAllBytecode().then(() => {
  if (app && typeof app.exit === 'function') {
    app.exit(0);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('❌ Bytecode compilation failed:', err);
  if (app && typeof app.exit === 'function') {
    app.exit(1);
  } else {
    process.exit(1);
  }
});

