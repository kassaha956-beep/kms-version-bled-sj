const fs = require('fs');

// 1. Update main.src.cjs
const mainFile = 'c:/Users/Mehdi/Videos/soft/destrubition/electron/main.src.cjs';
let mainCode = fs.readFileSync(mainFile, 'utf8');

// --- A. Fix products:create catch block and empty sku handling ---
const prodCreateOld = `      if (!name || !sku) {
        return { success: false, message: 'Le nom et le SKU du produit sont obligatoires' };
      }

      // Check for duplicate SKU before attempting insert
      const existingSku = db.prepare('SELECT id FROM products WHERE TRIM(LOWER(sku)) = TRIM(LOWER(?))').get(sku.trim());
      if (existingSku) {
        return { success: false, message: \`Le SKU "\${sku.trim()}" est déjà utilisé par un autre produit. Veuillez choisir un SKU unique.\` };
      }`;

const prodCreateNew = `      let finalSku = (sku || '').trim();
      if (!name) {
        return { success: false, message: 'Le nom du produit est obligatoire' };
      }
      if (!finalSku) {
        // Auto-generate collision-proof SKU if not provided
        const lastRow = db.prepare("SELECT sku FROM products WHERE sku LIKE 'SKU-%' ORDER BY CAST(SUBSTR(sku,5) AS INTEGER) DESC LIMIT 1").get();
        let seq = 1000;
        if (lastRow) {
          const n = parseInt(lastRow.sku.replace('SKU-', '')) || 0;
          if (n >= seq) seq = n + 1;
        }
        finalSku = \`SKU-\${seq}\`;
        while (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(finalSku)) {
          seq++;
          finalSku = \`SKU-\${seq}\`;
        }
      }

      // Check for duplicate SKU before attempting insert
      const existingSku = db.prepare('SELECT id FROM products WHERE TRIM(LOWER(sku)) = TRIM(LOWER(?))').get(finalSku);
      if (existingSku) {
        return { success: false, message: \`Le code SKU "\${finalSku}" est déjà utilisé par un autre produit. Veuillez choisir un code SKU unique.\` };
      }`;

if (mainCode.includes(prodCreateOld)) {
  mainCode = mainCode.replace(prodCreateOld, prodCreateNew);
  console.log('A: products:create improved with auto-SKU');
} else {
  console.warn('A: prodCreateOld not found');
}

// In products:create catch block
const prodCreateCatchOld = `    } catch (err) {
      console.error('Error creating product:', err);
      return { success: false, message: err.message };
    }
  });

  // Update product with units and supplier comparisons`;

const prodCreateCatchNew = `    } catch (err) {
      console.error('Error creating product:', err);
      if (err.message && err.message.includes('UNIQUE constraint failed: products.sku')) {
        return { success: false, message: 'Ce code SKU est déjà utilisé par un autre produit. Veuillez utiliser un SKU unique.' };
      }
      return { success: false, message: err.message };
    }
  });

  // Update product with units and supplier comparisons`;

if (mainCode.includes(prodCreateCatchOld)) {
  mainCode = mainCode.replace(prodCreateCatchOld, prodCreateCatchNew);
  console.log('A2: products:create catch block guarded');
}

// --- B. Fix products:update duplicate SKU check & catch block ---
const prodUpdateOld = `      if (!id) return { success: false, message: 'ID produit manquant' };

      const updateTx = db.transaction(() => {`;

const prodUpdateNew = `      if (!id) return { success: false, message: 'ID produit manquant' };

      let cleanSku = (sku || '').trim();
      if (!cleanSku) {
        const cur = db.prepare('SELECT sku FROM products WHERE id = ?').get(id);
        cleanSku = cur ? cur.sku : ('SKU-' + Date.now());
      } else {
        const dupSku = db.prepare('SELECT id FROM products WHERE TRIM(LOWER(sku)) = TRIM(LOWER(?)) AND id != ?').get(cleanSku, id);
        if (dupSku) {
          return { success: false, message: \`Le code SKU "\${cleanSku}" est déjà utilisé par un autre produit. Veuillez choisir un SKU unique.\` };
        }
      }

      const updateTx = db.transaction(() => {`;

if (mainCode.includes(prodUpdateOld)) {
  mainCode = mainCode.replace(prodUpdateOld, prodUpdateNew);
  console.log('B: products:update duplicate check added');
} else {
  console.warn('B: prodUpdateOld not found');
}

// In products:update catch block
const prodUpdateCatchOld = `    } catch (err) {
      console.error('Error updating product:', err);
      return { success: false, message: err.message };
    }
  });

  // Toggle Product Favorite`;

const prodUpdateCatchNew = `    } catch (err) {
      console.error('Error updating product:', err);
      if (err.message && err.message.includes('UNIQUE constraint failed: products.sku')) {
        return { success: false, message: 'Ce code SKU est déjà utilisé par un autre produit. Veuillez utiliser un SKU unique.' };
      }
      return { success: false, message: err.message };
    }
  });

  // Toggle Product Favorite`;

if (mainCode.includes(prodUpdateCatchOld)) {
  mainCode = mainCode.replace(prodUpdateCatchOld, prodUpdateCatchNew);
  console.log('B2: products:update catch block guarded');
}

// --- C. Fix caisses:create auto-code collision ---
const caisseCreateOld = `      const caisseCode = (code && code.trim()) || ('CS-' + Math.floor(1000 + Math.random() * 9000));
      const initBal = Number(initial_balance) || 0;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const checkCode = db.prepare('SELECT id FROM caisses WHERE code = ?').get(caisseCode);
      if (checkCode) return { success: false, message: \`Le code de caisse "\${caisseCode}" existe déjà.\` };`;

const caisseCreateNew = `      let caisseCode = (code && code.trim());
      if (!caisseCode) {
        let seq = 1;
        const lastC = db.prepare("SELECT code FROM caisses WHERE code LIKE 'CS-%' ORDER BY id DESC LIMIT 1").get();
        if (lastC) {
          const n = parseInt(lastC.code.replace('CS-', '')) || 0;
          seq = n + 1;
        }
        caisseCode = \`CS-\${String(seq).padStart(4, '0')}\`;
        while (db.prepare('SELECT 1 FROM caisses WHERE code = ?').get(caisseCode)) {
          seq++;
          caisseCode = \`CS-\${String(seq).padStart(4, '0')}\`;
        }
      } else {
        const checkCode = db.prepare('SELECT id FROM caisses WHERE code = ?').get(caisseCode);
        if (checkCode) return { success: false, message: \`Le code de caisse "\${caisseCode}" existe déjà.\` };
      }
      const initBal = Number(initial_balance) || 0;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);`;

if (mainCode.includes(caisseCreateOld)) {
  mainCode = mainCode.replace(caisseCreateOld, caisseCreateNew);
  console.log('C: caisses:create auto-code collision fixed');
} else {
  console.warn('C: caisseCreateOld not found');
}

// --- D. Fix caisses:update duplicate code check ---
const caisseUpdateOld = `      const { id, name, code, notes, assigned_user_id } = data;
      if (!id) return { success: false, message: 'ID de caisse manquant' };

      const stmt = db.prepare(\`
        UPDATE caisses 
        SET name = ?, code = ?, notes = ?, assigned_user_id = ?
        WHERE id = ?
      \`);`;

const caisseUpdateNew = `      const { id, name, code, notes, assigned_user_id } = data;
      if (!id) return { success: false, message: 'ID de caisse manquant' };

      const cleanCode = (code || '').trim();
      if (cleanCode) {
        const dup = db.prepare('SELECT id FROM caisses WHERE code = ? AND id != ?').get(cleanCode, id);
        if (dup) return { success: false, message: \`Le code de caisse "\${cleanCode}" est déjà attribué à une autre caisse.\` };
      }

      const stmt = db.prepare(\`
        UPDATE caisses 
        SET name = ?, code = ?, notes = ?, assigned_user_id = ?
        WHERE id = ?
      \`);`;

if (mainCode.includes(caisseUpdateOld)) {
  mainCode = mainCode.replace(caisseUpdateOld, caisseUpdateNew);
  console.log('D: caisses:update duplicate code check added');
} else {
  console.warn('D: caisseUpdateOld not found');
}

// --- E. Fix caisse_transaction_categories update duplicate name check ---
const catUpdateOld = `        // Custom: can rename and edit all fields
        db.prepare(\`
          UPDATE caisse_transaction_categories
          SET name = ?, type = ?, color = ?, icon = ?, description = ?
          WHERE id = ?
        \`).run(name.trim(), type, color, icon, description, id);`;

const catUpdateNew = `        // Custom: can rename and edit all fields
        const dupCat = db.prepare('SELECT id FROM caisse_transaction_categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), id);
        if (dupCat) return { success: false, message: 'Une catégorie avec ce nom existe déjà.' };
        db.prepare(\`
          UPDATE caisse_transaction_categories
          SET name = ?, type = ?, color = ?, icon = ?, description = ?
          WHERE id = ?
        \`).run(name.trim(), type, color, icon, description, id);`;

if (mainCode.includes(catUpdateOld)) {
  mainCode = mainCode.replace(catUpdateOld, catUpdateNew);
  console.log('E: caisse_transaction_categories update duplicate name check added');
} else {
  console.warn('E: catUpdateOld not found');
}

// --- F. Fix employees:create username uniqueness ---
const empCreateOld = `      const username = (data.username || data.full_name.toLowerCase().replace(/\\s+/g, '.') + '_' + Date.now()).trim();`;
const empCreateNew = `      let username = (data.username || data.full_name.toLowerCase().replace(/\\s+/g, '.')).trim();
      if (!username) username = 'emp_' + Date.now();
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
      if (existingUser) {
        username = \`\${username}_\${Date.now().toString().slice(-4)}\`;
      }`;

if (mainCode.includes(empCreateOld)) {
  mainCode = mainCode.replace(empCreateOld, empCreateNew);
  console.log('F: employees:create username collision prevented');
} else {
  console.warn('F: empCreateOld not found');
}

fs.writeFileSync(mainFile, mainCode, 'utf8');
console.log('main.src.cjs all updates written successfully');

