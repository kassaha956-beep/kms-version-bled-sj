// ========================================================
// IMATECHX - ELECTRON MAIN BOOTSTRAP LOADER (WITH BYTENODE)
// ========================================================
require('bytenode');
const fs = require('fs');
const path = require('path');

// When protected bytecode is compiled, run main.jsc
const bytecodePath = path.join(__dirname, 'main.jsc');
if (fs.existsSync(bytecodePath)) {
  require(bytecodePath);
} else {
  // Otherwise run development source
  require(path.join(__dirname, 'main.src.cjs'));
}
