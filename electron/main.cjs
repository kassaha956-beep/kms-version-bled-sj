const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, reconcileStats, recalculateInventorySummary } = require('./db.cjs');
const { appCache, TTL, cacheKey } = require('./cache.cjs');
const { 
  checkActivationStatus, 
  getDemoInfo, 
  checkProductLimit, 
  checkVenteLimit, 
  verifyDominosoftKey, 
  relaunchApp 
} = require('./activation.cjs');

let mainWindow = null;
let db = null;

function createWindow() {
  // Remove default top menu bar
  Menu.setApplicationMenu(null);

  const possibleIcons = [
    path.join(__dirname, '../public/app-logo.png'),
    path.join(__dirname, '../public/app.ico'),
    path.join(__dirname, '../dist/app-logo.png'),
    path.join(__dirname, '../dist/app.ico')
  ];
  const appIcon = possibleIcons.find(p => fs.existsSync(p)) || path.join(__dirname, '../public/app-logo.png');

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    title: 'imatechx',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenu(null);

  const devUrl = 'http://localhost:5173';
  const distHtml = path.join(__dirname, '../dist/index.html');

  // Load URL or local dist
  if (app.isPackaged) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(distHtml)) {
        console.log('[Electron] Dev server offline, loading dist/index.html');
        mainWindow.loadFile(distHtml);
      } else {
        console.log('[Electron] Retrying connection to dev server...');
        setTimeout(() => mainWindow.loadURL(devUrl), 1000);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  db = initDatabase(userDataPath);
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  ipcMain.handle('app:version', () => app.getVersion());

  // Dominosoft Software Activation & Mode Démo Status
  ipcMain.handle('activation:checkStatus', async () => {
    try {
      const act = checkActivationStatus();
      const demo = getDemoInfo();
      let productCount = 0;
      let venteCount = 0;
      try {
        productCount = db ? (db.prepare("SELECT COUNT(*) as c FROM products WHERE status != 'deleted'").get()?.c || 0) : 0;
      } catch (e) {
        console.error('[Activation] Error counting products:', e);
      }
      try {
        venteCount = db ? (db.prepare('SELECT COUNT(*) as c FROM ventes').get()?.c || 0) : 0;
      } catch (e) {
        console.error('[Activation] Error counting ventes:', e);
      }
      return {
        ...act,
        demo: {
          ...demo,
          productCount,
          venteCount
        }
      };
    } catch (err) {
      console.error('[Activation] Error in checkStatus:', err);
      return {
        activated: false,
        demo: {
          isActivated: false,
          isDemo: true,
          expired: false,
          durationDays: 3,
          daysLeft: 3,
          hoursLeft: 72,
          productCount: 0,
          venteCount: 0
        }
      };
    }
  });

  ipcMain.handle('activation:verify', async (event, key) => {
    return await verifyDominosoftKey(key);
  });

  ipcMain.handle('verify-key', async (event, key) => {
    return await verifyDominosoftKey(key);
  });

  ipcMain.handle('activation:relaunch', () => {
    relaunchApp();
  });

  // Auth: Login
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      const act = checkActivationStatus();
      if (!act.activated) {
        const demo = getDemoInfo();
        if (demo.expired) {
          return {
            success: false,
            message: 'La période d\'essai de 3 jours est terminée. L\'activation obligatoire du logiciel est requise pour continuer.'
          };
        }
      }
      const user = db.prepare('SELECT id, username, full_name, role, permissions, phone, department, position FROM users WHERE username = ? AND password = ?').get(username, password);
      if (user) {
        let permissions = [];
        try {
          permissions = user.permissions ? JSON.parse(user.permissions) : [];
        } catch {
          permissions = user.permissions ? [user.permissions] : [];
        }
        if (user.role === 'admin') {
          permissions = ['*'];
        }
        user.permissions = permissions;
        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(user.username, 'Connexion réussie');
        return { success: true, user };
      }
      return { success: false, message: 'Identifiant ou mot de passe incorrect' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: err.message };
    }
  });

  // Auth: Users List
  ipcMain.handle('auth:getUsers', async () => {
    try {
      const rows = db.prepare('SELECT id, username, full_name, role, permissions, phone, department, position, created_at FROM users ORDER BY id ASC').all();
      return rows.map(u => {
        let permissions = [];
        try {
          permissions = u.permissions ? JSON.parse(u.permissions) : [];
        } catch {
          permissions = u.permissions ? [u.permissions] : [];
        }
        if (u.role === 'admin') {
          permissions = ['*'];
        }
        return { ...u, permissions };
      });
    } catch (err) {
      console.error('getUsers error:', err);
      return [];
    }
  });

  // Auth: Create User with Permissions
  ipcMain.handle('auth:createUser', async (event, { username, password, full_name, role, permissions, phone, department, position }) => {
    try {
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
      if (existing) {
        return { success: false, message: `L'identifiant "${username}" est déjà utilisé.` };
      }
      const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []);
      const stmt = db.prepare(`
        INSERT INTO users (username, password, full_name, role, permissions, phone, department, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        username.trim(),
        password,
        full_name.trim(),
        role || 'worker',
        permsStr,
        phone || '',
        department || '',
        position || ''
      );
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Création utilisateur "${username}" (Rôle: ${role || 'worker'})`);
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      console.error('createUser error:', err);
      return { success: false, message: err.message };
    }
  });

  // Auth: Update User & Permissions
  ipcMain.handle('auth:updateUser', async (event, { id, username, full_name, role, permissions, password, phone, department, position }) => {
    try {
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!targetUser) return { success: false, message: 'Utilisateur introuvable' };

      const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []);

      if (password && password.trim()) {
        db.prepare(`
          UPDATE users 
          SET username = COALESCE(?, username),
              full_name = COALESCE(?, full_name),
              role = COALESCE(?, role),
              permissions = ?,
              password = ?,
              phone = COALESCE(?, phone),
              department = COALESCE(?, department),
              position = COALESCE(?, position)
          WHERE id = ?
        `).run(
          username?.trim() || null,
          full_name?.trim() || null,
          role || null,
          permsStr,
          password.trim(),
          phone || null,
          department || null,
          position || null,
          id
        );
      } else {
        db.prepare(`
          UPDATE users 
          SET username = COALESCE(?, username),
              full_name = COALESCE(?, full_name),
              role = COALESCE(?, role),
              permissions = ?,
              phone = COALESCE(?, phone),
              department = COALESCE(?, department),
              position = COALESCE(?, position)
          WHERE id = ?
        `).run(
          username?.trim() || null,
          full_name?.trim() || null,
          role || null,
          permsStr,
          phone || null,
          department || null,
          position || null,
          id
        );
      }

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Mise à jour permissions et profil utilisateur "${targetUser.username}" (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error('updateUser error:', err);
      return { success: false, message: err.message };
    }
  });

  // Auth: Delete User
  ipcMain.handle('auth:deleteUser', async (event, id) => {
    try {
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!targetUser) return { success: false, message: 'Utilisateur introuvable' };
      if (targetUser.username === 'admin') {
        return { success: false, message: 'Impossible de supprimer le compte administrateur racine.' };
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression de l'utilisateur "${targetUser.username}" (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error('deleteUser error:', err);
      return { success: false, message: err.message };
    }
  });

  // Settings: Get All
  ipcMain.handle('settings:getAll', async () => {
    try {
      const rows = db.prepare('SELECT key, value FROM app_settings').all();
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return { success: true, settings };
    } catch (err) {
      console.error('Error fetching settings:', err);
      return { success: false, message: err.message, settings: {} };
    }
  });

  // Settings: Save
  ipcMain.handle('settings:save', async (event, newSettings) => {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
      const saveTx = db.transaction((entries) => {
        for (const [k, v] of entries) {
          stmt.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        }
      });
      saveTx(Object.entries(newSettings));
      return { success: true };
    } catch (err) {
      console.error('Error saving settings:', err);
      return { success: false, message: err.message };
    }
  });

  // System: Printers List
  ipcMain.handle('system:getPrinters', async () => {
    try {
      if (mainWindow && mainWindow.webContents) {
        const printers = await mainWindow.webContents.getPrintersAsync();
        return { success: true, printers };
      }
      return { success: true, printers: [] };
    } catch (err) {
      console.error('Error getting printers:', err);
      return { success: false, message: err.message, printers: [] };
    }
  });

  // System: Print Test Page
  ipcMain.handle('system:printTest', async (event, { printerName, testType }) => {
    try {
      return { 
        success: true, 
        message: `Page de test "${testType || 'Reçu standard'}" envoyée à l'imprimante "${printerName || 'Par défaut'}" avec succès.` 
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Backup: Export Database (.db file)
  ipcMain.handle('backup:exportDb', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'distribution.db');
      
      const dateStr = new Date().toISOString().slice(0, 10);
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Exporter la sauvegarde de la base SQLite',
        defaultPath: `distribution-backup-${dateStr}.db`,
        filters: [
          { name: 'Base de données SQLite (*.db)', extensions: ['db', 'sqlite'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) return { success: false, canceled: true };

      fs.copyFileSync(dbPath, filePath);

      const now = new Date().toLocaleString();
      db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run('backup_last_date', now);
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', `Sauvegarde exportée vers ${path.basename(filePath)}`);

      return { success: true, filePath, date: now };
    } catch (err) {
      console.error('Export DB error:', err);
      return { success: false, message: err.message };
    }
  });

  // Backup: Import Database (.db file)
  ipcMain.handle('backup:importDb', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Sélectionner le fichier de sauvegarde SQLite à restaurer',
        filters: [
          { name: 'Fichiers SQLite (*.db, *.sqlite)', extensions: ['db', 'sqlite'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

      const sourcePath = filePaths[0];
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'distribution.db');

      if (!fs.existsSync(sourcePath)) {
        return { success: false, message: 'Fichier source introuvable' };
      }

      // Close database before overwriting file
      if (db) {
        try { db.close(); } catch (e) { console.error('Error closing db before restore:', e); }
      }

      // Copy backup over active database
      fs.copyFileSync(sourcePath, dbPath);

      // Re-initialize database connection
      db = initDatabase(userDataPath);
      appCache.flush();
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', `Base de données restaurée depuis ${path.basename(sourcePath)}`);

      return { success: true, filePath: sourcePath };
    } catch (err) {
      console.error('Import DB error:', err);
      return { success: false, message: err.message };
    }
  });

  // Backup: Get Full JSON Data
  ipcMain.handle('backup:getFullData', async () => {
    try {
      const users = db.prepare('SELECT id, username, full_name, role, created_at FROM users').all();
      const settings = db.prepare('SELECT * FROM app_settings').all();
      const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
      const fournisseurs = db.prepare('SELECT * FROM fournisseurs').all();
      const credits = db.prepare('SELECT * FROM fournisseur_credits').all();
      const clients = db.prepare('SELECT * FROM clients').all();
      const client_debts = db.prepare('SELECT * FROM client_debts').all();
      const client_payments = db.prepare('SELECT * FROM client_payments').all();

      return {
        success: true,
        data: {
          exportedAt: new Date().toISOString(),
          version: app.getVersion(),
          users,
          settings,
          logs,
          fournisseurs,
          credits,
          clients,
          client_debts,
          client_payments
        }
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Backup: Restore from JSON Data
  ipcMain.handle('backup:restoreFullData', async (event, data) => {
    try {
      if (!data) return { success: false, message: 'Données invalides' };

      const restoreTx = db.transaction(() => {
        if (Array.isArray(data.users) && data.users.length > 0) {
          db.prepare('DELETE FROM users').run();
          const ins = db.prepare('INSERT INTO users (id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?)');
          for (const u of data.users) {
            ins.run(u.id, u.username, u.password || 'admin', u.full_name, u.role || 'admin');
          }
        }
        if (Array.isArray(data.settings) && data.settings.length > 0) {
          const ins = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
          for (const st of data.settings) {
            ins.run(st.key, st.value);
          }
        }
        if (Array.isArray(data.fournisseurs) && data.fournisseurs.length > 0) {
          db.prepare('DELETE FROM fournisseur_credits').run();
          db.prepare('DELETE FROM fournisseurs').run();
          const insF = db.prepare(`
            INSERT INTO fournisseurs (id, name, contact_person, phone, email, address, city, ice, notes, initial_credit, current_credit, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const f of data.fournisseurs) {
            insF.run(f.id, f.name, f.contact_person, f.phone, f.email, f.address, f.city, f.ice, f.notes, f.initial_credit || 0, f.current_credit || 0, f.status || 'active', f.created_at || new Date().toISOString());
          }
        }
        if (Array.isArray(data.credits) && data.credits.length > 0) {
          const insC = db.prepare(`
            INSERT INTO fournisseur_credits (id, fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const c of data.credits) {
            insC.run(c.id, c.fournisseur_id, c.type, c.amount, c.payment_method, c.reference, c.notes, c.date, c.balance_after || 0, c.created_at || new Date().toISOString());
          }
        }
        if (Array.isArray(data.clients) && data.clients.length > 0) {
          db.prepare('DELETE FROM client_payments').run();
          db.prepare('DELETE FROM client_debts').run();
          db.prepare('DELETE FROM clients').run();
          const insCl = db.prepare(`
            INSERT INTO clients (id, name, phone, address, notes, current_debt, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const cl of data.clients) {
            insCl.run(cl.id, cl.name, cl.phone || '', cl.address || '', cl.notes || '', cl.current_debt || 0, cl.status || 'active', cl.created_at || new Date().toISOString(), cl.updated_at || new Date().toISOString());
          }
        }
        if (Array.isArray(data.client_debts) && data.client_debts.length > 0) {
          const insCd = db.prepare(`
            INSERT INTO client_debts (id, client_id, product_id, product_name, unit_name, quantity, conversion_factor, unit_price, total_amount, paid_amount, remaining_amount, date, caisse_id, caisse_transaction_id, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const cd of data.client_debts) {
            insCd.run(cd.id, cd.client_id, cd.product_id, cd.product_name, cd.unit_name || 'pièce', cd.quantity || 1, cd.conversion_factor || 1, cd.unit_price || 0, cd.total_amount || 0, cd.paid_amount || 0, cd.remaining_amount || 0, cd.date, cd.caisse_id || null, cd.caisse_transaction_id || null, cd.notes || '', cd.status || 'unpaid', cd.created_at || new Date().toISOString());
          }
        }
        if (Array.isArray(data.client_payments) && data.client_payments.length > 0) {
          const insCp = db.prepare(`
            INSERT INTO client_payments (id, client_id, debt_id, amount, payment_method, caisse_id, caisse_transaction_id, date, notes, balance_before, balance_after, user_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const cp of data.client_payments) {
            insCp.run(cp.id, cp.client_id, cp.debt_id || null, cp.amount || 0, cp.payment_method || 'especes', cp.caisse_id || null, cp.caisse_transaction_id || null, cp.date, cp.notes || '', cp.balance_before || 0, cp.balance_after || 0, cp.user_name || 'Admin', cp.created_at || new Date().toISOString());
          }
        }
      });

      restoreTx();
      appCache.flush();
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', 'Restauration complète JSON effectuée (Fournisseurs et Clients)');
      return { success: true };
    } catch (err) {
      console.error('Error restoring JSON data:', err);
      return { success: false, message: err.message };
    }
  });

  // Flush Cache IPC Handler
  ipcMain.handle('cache:flush', async () => {
    try {
      appCache.flush();
      return { success: true };
    } catch (err) {
      console.error('Error flushing cache:', err);
      return { success: false, message: err.message };
    }
  });

  // Auth: Update Account Profile & Password
  ipcMain.handle('auth:updateAccount', async (event, { userId, fullName, currentPassword, newPassword }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, message: 'Utilisateur non trouvé' };

      if (newPassword) {
        if (!currentPassword || user.password !== currentPassword) {
          return { success: false, message: 'Le mot de passe actuel est incorrect' };
        }
        db.prepare('UPDATE users SET full_name = ?, password = ? WHERE id = ?').run(fullName || user.full_name, newPassword, userId);
      } else {
        db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName || user.full_name, userId);
      }

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(user.username, 'Mise à jour du profil et sécurité');
      const updated = db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(userId);
      return { success: true, user: updated };
    } catch (err) {
      console.error('Error updating account:', err);
      return { success: false, message: err.message };
    }
  });

  // Audit Logs
  ipcMain.handle('audit:getLogs', async () => {
    try {
      return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return [];
    }
  });

  // ==========================================
  // FOURNISSEURS & HISTORIQUE DE CRÉDIT IPC
  // ==========================================

  // Get all fournisseurs with counts and calculated current balance
  ipcMain.handle('fournisseurs:getAll', async () => {
    const KEY = 'fournisseurs:all';
    const cached = appCache.get(KEY);
    if (cached) return cached;

    try {
      const fournisseurs = db.prepare(`
        SELECT f.*,
          COUNT(fc.id) as total_operations,
          COALESCE(MAX(fc.date), f.created_at) as last_activity
        FROM fournisseurs f
        LEFT JOIN fournisseur_credits fc ON f.id = fc.fournisseur_id
        GROUP BY f.id
        ORDER BY f.name ASC
      `).all();
      const result = { success: true, fournisseurs };
      appCache.set(KEY, result, TTL.FOURNISSEURS);
      return result;
    } catch (err) {
      console.error('Error fetching fournisseurs:', err);
      return { success: false, message: err.message, fournisseurs: [] };
    }
  });

  // Get single fournisseur with full credit history
  ipcMain.handle('fournisseurs:getById', async (event, id) => {
    try {
      const fournisseur = db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(id);
      if (!fournisseur) return { success: false, message: 'Fournisseur introuvable' };
      const credits = db.prepare(`
        SELECT * FROM fournisseur_credits 
        WHERE fournisseur_id = ? 
        ORDER BY date DESC, id DESC
      `).all(id);
      return { success: true, fournisseur, credits };
    } catch (err) {
      console.error('Error fetching fournisseur by id:', err);
      return { success: false, message: err.message };
    }
  });

  // Create new fournisseur (Admin)
  ipcMain.handle('fournisseurs:create', async (event, data) => {
    try {
      const initialCredit = parseFloat(data.initial_credit) || 0;
      let newId = null;

      const createTx = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO fournisseurs (name, contact_person, phone, email, address, city, ice, notes, initial_credit, current_credit, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const res = stmt.run(
          data.name.trim(),
          (data.contact_person || '').trim(),
          (data.phone || '').trim(),
          (data.email || '').trim(),
          (data.address || '').trim(),
          (data.city || '').trim(),
          (data.ice || '').trim(),
          (data.notes || '').trim(),
          initialCredit,
          initialCredit,
          data.status || 'active'
        );
        newId = res.lastInsertRowid;

        if (initialCredit > 0) {
          db.prepare(`
            INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
            VALUES (?, 'achat_credit', ?, 'autre', 'SOLDE-INITIAL', 'Solde débiteur initial', ?, ?)
          `).run(newId, initialCredit, new Date().toISOString().slice(0, 10), initialCredit);
        }
      });

      createTx();
      appCache.delByPrefix('fournisseurs:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Création du fournisseur "${data.name}"`);
      return { success: true, id: newId };
    } catch (err) {
      console.error('Error creating fournisseur:', err);
      return { success: false, message: err.message };
    }
  });

  // Update existing fournisseur (Admin)
  ipcMain.handle('fournisseurs:update', async (event, { id, ...data }) => {
    try {
      const stmt = db.prepare(`
        UPDATE fournisseurs 
        SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ?, ice = ?, notes = ?, status = ?
        WHERE id = ?
      `);
      stmt.run(
        data.name.trim(),
        (data.contact_person || '').trim(),
        (data.phone || '').trim(),
        (data.email || '').trim(),
        (data.address || '').trim(),
        (data.city || '').trim(),
        (data.ice || '').trim(),
        (data.notes || '').trim(),
        data.status || 'active',
        id
      );
      appCache.delByPrefix('fournisseurs:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Modification du fournisseur "${data.name}" (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error('Error updating fournisseur:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete fournisseur (Admin)
  ipcMain.handle('fournisseurs:delete', async (event, id) => {
    try {
      const existing = db.prepare('SELECT name FROM fournisseurs WHERE id = ?').get(id);
      if (!existing) return { success: false, message: 'Fournisseur introuvable' };

      const deleteTx = db.transaction(() => {
        db.prepare('DELETE FROM fournisseur_credits WHERE fournisseur_id = ?').run(id);
        db.prepare('DELETE FROM fournisseurs WHERE id = ?').run(id);
      });
      deleteTx();
      appCache.delByPrefix('fournisseurs:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression du fournisseur "${existing.name}" (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error('Error deleting fournisseur:', err);
      return { success: false, message: err.message };
    }
  });

  // Get credit transactions (historique de crédit)
  ipcMain.handle('fournisseurs:getCredits', async (event, params = {}) => {
    try {
      let query = `
        SELECT fc.*, f.name as fournisseur_name, f.phone as fournisseur_phone, f.city as fournisseur_city
        FROM fournisseur_credits fc
        JOIN fournisseurs f ON f.id = fc.fournisseur_id
      `;
      const queryParams = [];
      if (params.fournisseur_id) {
        query += ` WHERE fc.fournisseur_id = ?`;
        queryParams.push(params.fournisseur_id);
      }
      query += ` ORDER BY fc.date DESC, fc.id DESC`;

      const credits = db.prepare(query).all(...queryParams);
      return { success: true, credits };
    } catch (err) {
      console.error('Error fetching credits:', err);
      return { success: false, message: err.message, credits: [] };
    }
  });

  // Add credit or payment operation
  ipcMain.handle('fournisseurs:addCredit', async (event, data) => {
    try {
      const { fournisseur_id, type, amount, payment_method, reference, notes, date, userName = 'Admin' } = data;
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, message: 'Le montant doit être un nombre strictement positif' };
      }

      const fournisseur = db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(fournisseur_id);
      if (!fournisseur) {
        return { success: false, message: 'Fournisseur non trouvé' };
      }

      // Calculate balance_after for display purposes
      let currentBalance = parseFloat(fournisseur.current_credit) || 0;
      let newBalance = currentBalance;
      if (type === 'achat_credit') {
        newBalance += numAmount;
      } else if (type === 'paiement' || type === 'avoir') {
        newBalance -= numAmount;
      }

      // Insert credit record — trg_fournisseur_credits_ai auto-updates fournisseurs.current_credit!
      db.prepare(`
        INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fournisseur_id,
        type,
        numAmount,
        payment_method || null,
        reference || '',
        notes || '',
        date || new Date().toISOString().slice(0, 10),
        newBalance
      );

      const actionDesc = type === 'achat_credit' 
        ? `Nouvel achat à crédit (${numAmount.toFixed(2)}) auprès de ${fournisseur.name}`
        : type === 'paiement'
        ? `Règlement de dette (${numAmount.toFixed(2)}) à ${fournisseur.name}`
        : `Avoir/Retour marchandise (${numAmount.toFixed(2)}) de ${fournisseur.name}`;

      appCache.delByPrefix('fournisseurs:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(userName, actionDesc);
      return { success: true, newBalance };
    } catch (err) {
      console.error('Error adding credit transaction:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete credit transaction and recalculate provider balance
  ipcMain.handle('fournisseurs:deleteCredit', async (event, creditId) => {
    try {
      const credit = db.prepare('SELECT * FROM fournisseur_credits WHERE id = ?').get(creditId);
      if (!credit) return { success: false, message: 'Opération introuvable' };

      const fId = credit.fournisseur_id;

      const deleteCreditTx = db.transaction(() => {
        db.prepare('DELETE FROM fournisseur_credits WHERE id = ?').run(creditId);

        const f = db.prepare('SELECT initial_credit FROM fournisseurs WHERE id = ?').get(fId);
        const trans = db.prepare('SELECT type, amount FROM fournisseur_credits WHERE fournisseur_id = ? ORDER BY date ASC, id ASC').all(fId);
        
        let balance = parseFloat(f ? f.initial_credit : 0) || 0;
        for (const tr of trans) {
          if (tr.type === 'achat_credit') balance += parseFloat(tr.amount);
          else if (tr.type === 'paiement' || tr.type === 'avoir') balance -= parseFloat(tr.amount);
        }

        db.prepare('UPDATE fournisseurs SET current_credit = ? WHERE id = ?').run(balance, fId);
      });
      deleteCreditTx();
      appCache.delByPrefix('fournisseurs:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression de l'opération de crédit #${creditId}`);
      return { success: true };
    } catch (err) {
      console.error('Error deleting credit transaction:', err);
      return { success: false, message: err.message };
    }
  });

  // ==========================================
  // CLIENTS & DETTES CLIENTS IPC
  // ==========================================

  // Get all clients with outstanding debts, last product taken, and stats
  ipcMain.handle('clients:getAll', async (event, params = {}) => {
    const KEY = cacheKey('clients:list', params);
    const cached = appCache.get(KEY);
    if (cached) return cached;

    try {
      const { search = '', status = 'all' } = params;
      let query = `
        SELECT 
          c.*,
          COUNT(d.id) as total_debts_count,
          SUM(CASE WHEN d.status != 'paid' AND d.remaining_amount > 0 THEN 1 ELSE 0 END) as unpaid_debts_count,
          MAX(d.date) as last_debt_date,
          (
            SELECT d2.product_name 
            FROM client_debts d2 
            WHERE d2.client_id = c.id 
            ORDER BY d2.date DESC, d2.id DESC 
            LIMIT 1
          ) as last_product_name,
          (
            SELECT d2.quantity 
            FROM client_debts d2 
            WHERE d2.client_id = c.id 
            ORDER BY d2.date DESC, d2.id DESC 
            LIMIT 1
          ) as last_product_qty,
          (
            SELECT d2.unit_name 
            FROM client_debts d2 
            WHERE d2.client_id = c.id 
            ORDER BY d2.date DESC, d2.id DESC 
            LIMIT 1
          ) as last_product_unit,
          (
            SELECT d2.total_amount 
            FROM client_debts d2 
            WHERE d2.client_id = c.id 
            ORDER BY d2.date DESC, d2.id DESC 
            LIMIT 1
          ) as last_product_amount
        FROM clients c
        LEFT JOIN client_debts d ON c.id = d.client_id
      `;

      const conditions = [];
      const sqlParams = [];

      if (search && search.trim()) {
        conditions.push(`(c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.id IN (SELECT client_id FROM client_debts WHERE product_name LIKE ?))`);
        const s = `%${search.trim()}%`;
        sqlParams.push(s, s, s, s);
      }

      if (status === 'debt') {
        conditions.push(`c.current_debt > 0`);
      } else if (status === 'clear') {
        conditions.push(`(c.current_debt <= 0 OR c.current_debt IS NULL)`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      query += ` GROUP BY c.id ORDER BY c.current_debt DESC, c.name ASC`;

      const clients = db.prepare(query).all(...sqlParams);

      // Overall stats
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_clients,
          COALESCE(SUM(current_debt), 0) as total_debt,
          SUM(CASE WHEN current_debt > 0 THEN 1 ELSE 0 END) as blocked_clients_count,
          SUM(CASE WHEN current_debt <= 0 OR current_debt IS NULL THEN 1 ELSE 0 END) as clear_clients_count
        FROM clients
      `).get();

      const result = {
        success: true,
        clients,
        stats: {
          totalClients: stats.total_clients || 0,
          totalDebt: stats.total_debt || 0,
          blockedClientsCount: stats.blocked_clients_count || 0,
          clearClientsCount: stats.clear_clients_count || 0
        }
      };
      appCache.set(KEY, result, TTL.CLIENTS_LIST);
      return result;
    } catch (err) {
      console.error('Error in clients:getAll:', err);
      return { success: false, message: err.message, clients: [], stats: {} };
    }
  });

  // Get single client with full debts ledger & payment history
  ipcMain.handle('clients:getById', async (event, id) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) return { success: false, message: 'Client introuvable' };

      const debts = db.prepare(`
        SELECT d.*, p.sku as product_sku
        FROM client_debts d
        LEFT JOIN products p ON d.product_id = p.id
        WHERE d.client_id = ?
        ORDER BY d.date DESC, d.id DESC
      `).all(id);

      const payments = db.prepare(`
        SELECT p.*, c.name as caisse_name
        FROM client_payments p
        LEFT JOIN caisses c ON p.caisse_id = c.id
        WHERE p.client_id = ?
        ORDER BY p.date DESC, p.id DESC
      `).all(id);

      const lastUnpaidDebts = debts.filter(d => (parseFloat(d.remaining_amount) || 0) > 0);

      return {
        success: true,
        client,
        debts,
        payments,
        isBlocked: (parseFloat(client.current_debt) || 0) > 0,
        lastUnpaidDebts
      };
    } catch (err) {
      console.error('Error in clients:getById:', err);
      return { success: false, message: err.message };
    }
  });

  // Create new client
  ipcMain.handle('clients:create', async (event, data) => {
    try {
      if (!data.name || !data.name.trim()) {
        return { success: false, message: 'Le nom du client est obligatoire' };
      }
      const stmt = db.prepare(`
        INSERT INTO clients (name, phone, address, notes, current_debt, status)
        VALUES (?, ?, ?, ?, 0, ?)
      `);
      const res = stmt.run(
        data.name.trim(),
        (data.phone || '').trim(),
        (data.address || '').trim(),
        (data.notes || '').trim(),
        data.status || 'active'
      );

      appCache.delByPrefix('clients:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Création du client "${data.name.trim()}"`);
      return { success: true, id: res.lastInsertRowid, message: 'Client créé avec succès' };
    } catch (err) {
      console.error('Error in clients:create:', err);
      return { success: false, message: err.message };
    }
  });

  // Update client
  ipcMain.handle('clients:update', async (event, { id, ...data }) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) return { success: false, message: 'Client introuvable' };

      db.prepare(`
        UPDATE clients 
        SET name = ?, phone = ?, address = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        (data.name || client.name).trim(),
        (data.phone !== undefined ? data.phone : client.phone).trim(),
        (data.address !== undefined ? data.address : client.address).trim(),
        (data.notes !== undefined ? data.notes : client.notes).trim(),
        data.status || client.status,
        id
      );

      appCache.delByPrefix('clients:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Modification des informations du client #${id}`);
      return { success: true, message: 'Client mis à jour avec succès' };
    } catch (err) {
      console.error('Error in clients:update:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete client (protected if active debt exists)
  ipcMain.handle('clients:delete', async (event, id) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) return { success: false, message: 'Client introuvable' };

      if ((parseFloat(client.current_debt) || 0) > 0) {
        return { 
          success: false, 
          message: `Impossible de supprimer le client "${client.name}" car il a une dette en cours de ${parseFloat(client.current_debt).toFixed(2)} DA. Veuillez d'abord solder ou annuler sa dette.` 
        };
      }

      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      appCache.delByPrefix('clients:');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression du client "${client.name}" (#${id})`);
      return { success: true, message: 'Client supprimé avec succès' };
    } catch (err) {
      console.error('Error in clients:delete:', err);
      return { success: false, message: err.message };
    }
  });

  // Add Debt / Give Product to Client (Enforces strict blocking if client already has unpaid debt)
  ipcMain.handle('clients:addDebt', async (event, data) => {
    try {
      let {
        clientId,
        clientName,
        clientPhone,
        productId,
        productName,
        unitName = 'pièce',
        quantity = 1,
        conversionFactor = 1,
        unitPrice = 0,
        totalAmount = 0,
        paidAmount = 0,
        date,
        caisseId = null,
        affectCaisse = true,
        notes = '',
        userName = 'Admin'
      } = data;

      quantity = parseFloat(quantity) || 1;
      conversionFactor = parseFloat(conversionFactor) || 1;
      unitPrice = parseFloat(unitPrice) || 0;
      totalAmount = totalAmount ? parseFloat(totalAmount) : (quantity * unitPrice);
      paidAmount = Math.max(0, parseFloat(paidAmount) || 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const todayDate = date || new Date().toISOString().replace('T', ' ').substring(0, 19);

      // 1. Resolve or Create Client
      let client = null;
      if (clientId) {
        client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
      } else if (clientName && clientName.trim()) {
        if (clientPhone && clientPhone.trim()) {
          client = db.prepare('SELECT * FROM clients WHERE phone = ?').get(clientPhone.trim());
        }
        if (!client) {
          client = db.prepare('SELECT * FROM clients WHERE name = ?').get(clientName.trim());
        }
        if (!client) {
          const newC = db.prepare('INSERT INTO clients (name, phone, address, notes, current_debt, status) VALUES (?, ?, ?, ?, 0, ?)')
            .run(clientName.trim(), (clientPhone || '').trim(), '', '', 'active');
          client = db.prepare('SELECT * FROM clients WHERE id = ?').get(newC.lastInsertRowid);
        }
      }

      if (!client) {
        return { success: false, message: 'Client non spécifié ou introuvable' };
      }

      // Client is not blocked - owner has full discretion to give multiple products on debt
      // Stock will be deducted automatically by SQLite triggers
      if (!productName && productId) {
        const prod = db.prepare('SELECT name FROM products WHERE id = ?').get(productId);
        if (prod) productName = prod.name;
      }
      if (!productName) productName = 'Article divers';

      let newDebtId = null;

      const addDebtTx = db.transaction(() => {
        const debtStatus = remainingAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');
        let caisseTransactionId = null;

        // If client paid a downpayment and caisse selected, record in Caisse
        if (paidAmount > 0 && affectCaisse && caisseId) {
          const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(caisseId);
          if (caisse) {
            const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(caisseId);
            const sessId = activeSession ? activeSession.id : null;
            let cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Vente Comptoir'").get();
            const catId = cat ? cat.id : null;
            const refTrx = `ACMP-${Date.now().toString().slice(-6)}`;
            const desc = `Acompte vente crédit client ${client.name} - Produit: ${productName} (${quantity} ${unitName}) - Par: ${userName}`;
            const expectedBalance = (parseFloat(caisse.current_balance) || 0) + paidAmount;

            const txRes = db.prepare(`
              INSERT INTO caisse_transactions (
                caisse_id, session_id, type, amount, category_id, category_name,
                reference, description, payment_method, date, user_name, balance_after
              )
              VALUES (?, ?, 'in', ?, ?, 'Vente Comptoir', ?, ?, 'especes', ?, ?, ?)
            `).run(
              caisseId,
              sessId,
              paidAmount,
              catId,
              refTrx,
              desc,
              todayDate,
              userName,
              expectedBalance
            );
            caisseTransactionId = txRes.lastInsertRowid;
          }
        }

        // Insert client_debts
        // (trg_client_debts_ai trigger will auto-update clients.current_debt and decrease product stock!)
        const res = db.prepare(`
          INSERT INTO client_debts (
            client_id, product_id, product_name, unit_name, quantity, conversion_factor,
            unit_price, total_amount, paid_amount, remaining_amount, date, caisse_id,
            caisse_transaction_id, notes, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          client.id,
          productId || null,
          productName,
          unitName,
          quantity,
          conversionFactor,
          unitPrice,
          totalAmount,
          paidAmount,
          remainingAmount,
          todayDate,
          caisseId || null,
          caisseTransactionId,
          notes,
          debtStatus
        );
        newDebtId = res.lastInsertRowid;

        // If downpayment was made, record in client_payments
        if (paidAmount > 0) {
          db.prepare(`
            INSERT INTO client_payments (
              client_id, debt_id, amount, payment_method, caisse_id, caisse_transaction_id,
              date, notes, balance_before, balance_after, user_name
            )
            VALUES (?, ?, ?, 'especes', ?, ?, ?, 'Acompte initial sur produit en dette', ?, ?, ?)
          `).run(
            client.id,
            newDebtId,
            paidAmount,
            caisseId || null,
            caisseTransactionId,
            todayDate,
            totalAmount,
            remainingAmount,
            userName
          );
        }

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          userName, 
          `Dette client enregistrée: ${client.name} - Produit: ${quantity} ${unitName} de "${productName}" - Total: ${totalAmount} DA (Reste dû: ${remainingAmount} DA)`
        );
      });

      addDebtTx();
      appCache.delByPrefix('clients:');
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      if (affectCaisse && caisseId && paidAmount > 0) {
        appCache.delByPrefix('caisses:');
        appCache.delByPrefix('dashboard:');
      }

      const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id);

      return {
        success: true,
        debtId: newDebtId,
        client: updatedClient,
        message: `Produit "${productName}" remis à ${client.name}. Dette de ${remainingAmount.toFixed(2)} DA enregistrée.`
      };
    } catch (err) {
      console.error('Error in clients:addDebt:', err);
      return { success: false, message: err.message };
    }
  });

  // Pay / Settle Client Debt (Unblocks client when debt reaches 0)
  ipcMain.handle('clients:payDebt', async (event, data) => {
    try {
      let {
        clientId,
        debtId = null,
        amount,
        paymentMethod = 'especes',
        caisseId = null,
        affectCaisse = true,
        date,
        notes = '',
        userName = 'Admin'
      } = data;

      const payAmount = parseFloat(amount) || 0;
      if (payAmount <= 0) {
        return { success: false, message: 'Le montant du règlement doit être supérieur à 0' };
      }

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
      if (!client) {
        return { success: false, message: 'Client introuvable' };
      }

      const curDebt = parseFloat(client.current_debt) || 0;
      if (curDebt <= 0) {
        return { success: false, message: `Ce client n'a aucune dette en cours.` };
      }

      const actualPayment = Math.min(payAmount, curDebt);
      const balanceBefore = curDebt;
      const balanceAfter = Math.max(0, curDebt - actualPayment);
      const todayDate = date || new Date().toISOString().replace('T', ' ').substring(0, 19);

      let paymentId = null;

      const payTx = db.transaction(() => {
        let caisseTransactionId = null;

        // 1. Caisse transaction
        if (affectCaisse && caisseId && actualPayment > 0) {
          const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(caisseId);
          if (caisse) {
            const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(caisseId);
            const sessId = activeSession ? activeSession.id : null;
            let cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Règlement Dette Client'").get();
            if (!cat) cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Vente Comptoir'").get();
            const catId = cat ? cat.id : null;
            const refTrx = `RGL-${Date.now().toString().slice(-6)}`;
            const desc = `Règlement dette client: ${client.name} (${client.phone || ''}) - Montant: ${actualPayment.toFixed(2)} DA (Reste dû: ${balanceAfter.toFixed(2)} DA) - Par: ${userName}`;
            const expectedBalance = (parseFloat(caisse.current_balance) || 0) + actualPayment;

            const txRes = db.prepare(`
              INSERT INTO caisse_transactions (
                caisse_id, session_id, type, amount, category_id, category_name,
                reference, description, payment_method, date, user_name, balance_after
              )
              VALUES (?, ?, 'in', ?, ?, 'Règlement Dette Client', ?, ?, ?, ?, ?, ?)
            `).run(
              caisseId,
              sessId,
              actualPayment,
              catId,
              refTrx,
              desc,
              paymentMethod,
              todayDate,
              userName,
              expectedBalance
            );
            caisseTransactionId = txRes.lastInsertRowid;
          }
        }

        // 2. Insert into client_payments
        // (trg_client_payments_ai trigger will auto-update clients.current_debt!)
        const pRes = db.prepare(`
          INSERT INTO client_payments (
            client_id, debt_id, amount, payment_method, caisse_id, caisse_transaction_id,
            date, notes, balance_before, balance_after, user_name
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          client.id,
          debtId || null,
          actualPayment,
          paymentMethod,
          caisseId || null,
          caisseTransactionId,
          todayDate,
          notes || 'Règlement dette client',
          balanceBefore,
          balanceAfter,
          userName
        );
        paymentId = pRes.lastInsertRowid;

        // 3. Update status of unpaid debts (FIFO or specific debt)
        if (debtId) {
          const d = db.prepare('SELECT * FROM client_debts WHERE id = ? AND client_id = ?').get(debtId, client.id);
          if (d) {
            const newPaid = (parseFloat(d.paid_amount) || 0) + actualPayment;
            const newRem = Math.max(0, (parseFloat(d.total_amount) || 0) - newPaid);
            const newSt = newRem <= 0 ? 'paid' : 'partially_paid';
            db.prepare('UPDATE client_debts SET paid_amount = ?, remaining_amount = ?, status = ? WHERE id = ?')
              .run(newPaid, newRem, newSt, debtId);
          }
        } else {
          // FIFO update across unpaid client debts
          let remainingToDistribute = actualPayment;
          const unpaidDebts = db.prepare(`
            SELECT * FROM client_debts 
            WHERE client_id = ? AND status != 'paid' AND remaining_amount > 0 
            ORDER BY date ASC, id ASC
          `).all(client.id);

          for (const ud of unpaidDebts) {
            if (remainingToDistribute <= 0) break;
            const udRem = parseFloat(ud.remaining_amount) || 0;
            const deduction = Math.min(remainingToDistribute, udRem);
            const udPaid = (parseFloat(ud.paid_amount) || 0) + deduction;
            const udNewRem = udRem - deduction;
            const udNewStatus = udNewRem <= 0 ? 'paid' : 'partially_paid';

            db.prepare('UPDATE client_debts SET paid_amount = ?, remaining_amount = ?, status = ? WHERE id = ?')
              .run(udPaid, udNewRem, udNewStatus, ud.id);

            remainingToDistribute -= deduction;
          }
        }

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          userName, 
          `Règlement de dette: ${client.name} a versé ${actualPayment.toFixed(2)} DA (Reste dû: ${balanceAfter.toFixed(2)} DA)`
        );
      });

      payTx();
      appCache.delByPrefix('clients:');
      if (affectCaisse && caisseId && actualPayment > 0) {
        appCache.delByPrefix('caisses:');
        appCache.delByPrefix('dashboard:');
      }

      const updatedClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id);
      const isSettled = (parseFloat(updatedClient ? updatedClient.current_debt : 0) || 0) <= 0;

      return {
        success: true,
        paymentId,
        client: updatedClient,
        newDebt: updatedClient.current_debt,
        isSettled,
        message: isSettled 
          ? `🎉 Dette de ${client.name} entièrement soldée (0.00 DA).`
          : `Règlement de ${actualPayment.toFixed(2)} DA enregistré pour ${client.name}. Reste à payer : ${parseFloat(updatedClient.current_debt).toFixed(2)} DA.`
      };
    } catch (err) {
      console.error('Error in clients:payDebt:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete Debt Record (restores product stock and client debt balance)
  ipcMain.handle('clients:deleteDebt', async (event, debtId) => {
    try {
      const debt = db.prepare('SELECT * FROM client_debts WHERE id = ?').get(debtId);
      if (!debt) return { success: false, message: 'Dette introuvable' };

      // trg_client_debts_ad trigger will auto-reverse client debt and restore product stock!
      db.prepare('DELETE FROM client_debts WHERE id = ?').run(debtId);
      appCache.delByPrefix('clients:');
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      appCache.delByPrefix('dashboard:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression de la dette #${debtId} pour le client #${debt.client_id}`);
      return { success: true, message: 'Dette supprimée et stock restauré avec succès' };
    } catch (err) {
      console.error('Error in clients:deleteDebt:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete Payment Record (restores client debt balance)
  ipcMain.handle('clients:deletePayment', async (event, paymentId) => {
    try {
      const payment = db.prepare('SELECT * FROM client_payments WHERE id = ?').get(paymentId);
      if (!payment) return { success: false, message: 'Paiement introuvable' };

      // trg_client_payments_ad trigger will auto-restore client debt!
      db.prepare('DELETE FROM client_payments WHERE id = ?').run(paymentId);
      appCache.delByPrefix('clients:');
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression du paiement #${paymentId} pour le client #${payment.client_id}`);
      return { success: true, message: 'Paiement supprimé avec succès' };
    } catch (err) {
      console.error('Error in clients:deletePayment:', err);
      return { success: false, message: err.message };
    }
  });

  // Get Overall Clients Stats & Recent Debts
  ipcMain.handle('clients:getStats', async () => {
    const KEY = 'clients:stats';
    const cached = appCache.get(KEY);
    if (cached) return cached;

    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_clients,
          COALESCE(SUM(current_debt), 0) as total_debt,
          SUM(CASE WHEN current_debt > 0 THEN 1 ELSE 0 END) as blocked_clients_count,
          SUM(CASE WHEN current_debt <= 0 OR current_debt IS NULL THEN 1 ELSE 0 END) as clear_clients_count
        FROM clients
      `).get();

      const recentDebts = db.prepare(`
        SELECT d.*, c.name as client_name, c.phone as client_phone
        FROM client_debts d
        JOIN clients c ON d.client_id = c.id
        ORDER BY d.date DESC, d.id DESC
        LIMIT 10
      `).all();

      const result = {
        success: true,
        stats: {
          totalClients: stats.total_clients || 0,
          totalDebt: stats.total_debt || 0,
          blockedClientsCount: stats.blocked_clients_count || 0,
          clearClientsCount: stats.clear_clients_count || 0,
          recentDebts
        }
      };
      appCache.set(KEY, result, TTL.CLIENTS_STATS);
      return result;
    } catch (err) {
      console.error('Error in clients:getStats:', err);
      return { success: false, message: err.message, stats: {} };
    }
  });

  // ==========================================
  // PRODUCTS, UNITS & SUPPLIER COMPARISON IPC
  // ==========================================

  // ─── Dedicated POS endpoint: full catalogue, all units (real-time live fetch) ───────────────
  ipcMain.handle('products:getForPOS', async () => {
    try {
      const rows = db.prepare(`
        SELECT
          p.id, p.name, p.sku, p.barcode, p.base_unit,
          p.stock_quantity, p.min_stock_alert,
          p.selling_price, p.cost_price,
          p.category_id, p.is_favorite, p.status,
          c.name as category_name, c.color as category_color
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'active'
        ORDER BY p.is_favorite DESC, p.name ASC
      `).all();

      // Attach units for each product in one bulk query
      const allUnits = db.prepare(
        'SELECT * FROM product_units ORDER BY product_id, conversion_factor ASC'
      ).all();

      const unitsByProduct = {};
      for (const u of allUnits) {
        if (!unitsByProduct[u.product_id]) unitsByProduct[u.product_id] = [];
        unitsByProduct[u.product_id].push(u);
      }

      const products = rows.map(p => ({ ...p, units: unitsByProduct[p.id] || [] }));
      return { success: true, products, totalCount: products.length };
    } catch (err) {
      console.error('Error in products:getForPOS:', err);
      return { success: false, message: err.message, products: [] };
    }
  });

  // Get products with advanced backend filtering & pagination
  ipcMain.handle('products:getAll', async (event, filters = {}) => {
    try {
      const {
        search = '',
        categoryId = 'all',
        supplierId = 'all',
        caisseId = 'all',
        stockStatus = 'all',
        minPrice,
        maxPrice,
        sortBy = 'name_asc',
        page = 1,
        pageSize = 100
      } = filters;

      let whereClauses = [];
      let params = [];

      // Keyword search (name, sku, barcode, notes)
      if (search && search.trim() !== '') {
        const term = `%${search.trim()}%`;
        whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.notes LIKE ?)');
        params.push(term, term, term, term);
      }

      // Category filter
      if (categoryId && categoryId !== 'all') {
        whereClauses.push('p.category_id = ?');
        params.push(Number(categoryId));
      }

      // Supplier filter
      if (supplierId && supplierId !== 'all') {
        whereClauses.push('(p.primary_supplier_id = ? OR EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id AND ps.supplier_id = ?))');
        params.push(Number(supplierId), Number(supplierId));
      }

      // Caisse filter
      if (caisseId && caisseId !== 'all') {
        whereClauses.push('p.caisse_id = ?');
        params.push(Number(caisseId));
      }

      // Stock status filter
      if (stockStatus === 'in_stock') {
        whereClauses.push('p.stock_quantity > p.min_stock_alert');
      } else if (stockStatus === 'low_stock') {
        whereClauses.push('(p.stock_quantity > 0 AND p.stock_quantity <= p.min_stock_alert)');
      } else if (stockStatus === 'out_of_stock') {
        whereClauses.push('p.stock_quantity <= 0');
      }

      // Favorite filter
      if (filters.isFavorite === true || filters.isFavorite === 1 || filters.isFavorite === '1') {
        whereClauses.push('p.is_favorite = 1');
      }

      // Price filter
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        whereClauses.push('p.selling_price >= ?');
        params.push(Number(minPrice));
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        whereClauses.push('p.selling_price <= ?');
        params.push(Number(maxPrice));
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count total matches
      const countRow = db.prepare(`SELECT COUNT(*) as total FROM products p ${whereSql}`).get(...params);
      const totalCount = countRow ? countRow.total : 0;

      // Sorting
      let orderSql = 'ORDER BY p.name ASC';
      if (sortBy === 'name_desc') orderSql = 'ORDER BY p.name DESC';
      else if (sortBy === 'price_asc') orderSql = 'ORDER BY p.selling_price ASC';
      else if (sortBy === 'price_desc') orderSql = 'ORDER BY p.selling_price DESC';
      else if (sortBy === 'stock_asc') orderSql = 'ORDER BY p.stock_quantity ASC';
      else if (sortBy === 'stock_desc') orderSql = 'ORDER BY p.stock_quantity DESC';
      else if (sortBy === 'newest') orderSql = 'ORDER BY p.id DESC';

      // Pagination
      const offset = (Math.max(1, page) - 1) * pageSize;
      const querySql = `
        SELECT 
          p.*,
          c.name as category_name,
          c.color as category_color,
          f.name as supplier_name,
          f.phone as supplier_phone,
          cs.name as caisse_name,
          cs.code as caisse_code,
          (
            SELECT json_group_array(
              json_object(
                'id', pu.id,
                'unit_name', pu.unit_name,
                'conversion_factor', pu.conversion_factor,
                'selling_price', pu.selling_price,
                'cost_price', pu.cost_price,
                'barcode', pu.barcode,
                'is_default', pu.is_default
              )
            )
            FROM product_units pu
            WHERE pu.product_id = p.id
          ) as units_json,
          (
            SELECT json_group_array(
              json_object(
                'id', ps.id,
                'supplier_id', ps.supplier_id,
                'supplier_name', sf.name,
                'purchase_price', ps.purchase_price,
                'supplier_sku', ps.supplier_sku,
                'lead_time_days', ps.lead_time_days,
                'min_order_qty', ps.min_order_qty,
                'is_primary', ps.is_primary
              )
            )
            FROM product_suppliers ps
            JOIN fournisseurs sf ON sf.id = ps.supplier_id
            WHERE ps.product_id = p.id
          ) as supplier_prices_json
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN fournisseurs f ON f.id = p.primary_supplier_id
        LEFT JOIN caisses cs ON cs.id = p.caisse_id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `;

      const rows = db.prepare(querySql).all(...params, pageSize, offset);

      // Parse JSON sub-queries
      const products = rows.map(r => {
        let units = [];
        let supplier_prices = [];
        try { units = JSON.parse(r.units_json) || []; } catch(e) {}
        try { supplier_prices = JSON.parse(r.supplier_prices_json) || []; } catch(e) {}
        
        // Sort supplier prices cheapest first
        supplier_prices.sort((a, b) => a.purchase_price - b.purchase_price);

        return {
          ...r,
          units,
          supplier_prices,
          units_json: undefined,
          supplier_prices_json: undefined
        };
      });

      // Global Inventory KPIs
      const kpiRow = db.prepare(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_alert THEN 1 ELSE 0 END) as low_stock,
          SUM(stock_quantity * cost_price) as total_valuation
        FROM products
      `).get();

      const result = {
        success: true,
        products,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        kpis: {
          totalProducts: kpiRow?.total_products || 0,
          outOfStock: kpiRow?.out_of_stock || 0,
          lowStock: kpiRow?.low_stock || 0,
          totalValuation: kpiRow?.total_valuation || 0
        }
      };
      // Cache paginated result if no search term (safe to cache)
      if (!filters.search || filters.search.trim() === '') {
        appCache.set(cacheKey('products:page', filters), result, TTL.PRODUCTS_ALL);
      }
      return result;
    } catch (err) {
      console.error('Error fetching products:', err);
      return { success: false, message: err.message, products: [], totalCount: 0 };
    }
  });

  // Get single product with full units and supplier comparisons
  ipcMain.handle('products:getById', async (event, productId) => {
    try {
      const product = db.prepare(`
        SELECT p.*, c.name as category_name, f.name as supplier_name, cs.name as caisse_name, cs.code as caisse_code
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN fournisseurs f ON f.id = p.primary_supplier_id
        LEFT JOIN caisses cs ON cs.id = p.caisse_id
        WHERE p.id = ?
      `).get(productId);

      if (!product) return { success: false, message: 'Produit introuvable' };

      const units = db.prepare('SELECT * FROM product_units WHERE product_id = ? ORDER BY conversion_factor ASC').all(productId);
      const supplier_prices = db.prepare(`
        SELECT ps.*, f.name as supplier_name, f.phone as supplier_phone, f.city as supplier_city
        FROM product_suppliers ps
        JOIN fournisseurs f ON f.id = ps.supplier_id
        WHERE ps.product_id = ?
        ORDER BY ps.purchase_price ASC
      `).all(productId);

      return { success: true, product, units, supplier_prices };
    } catch (err) {
      console.error('Error fetching product by id:', err);
      return { success: false, message: err.message };
    }
  });

  // Create product with units and supplier comparisons
  ipcMain.handle('products:create', async (event, data) => {
    try {
      const limitCheck = checkProductLimit(db);
      if (!limitCheck.allowed) {
        return { success: false, message: limitCheck.error };
      }

      const {
        name,
        sku,
        barcode,
        category_id,
        primary_supplier_id,
        caisse_id,
        base_unit = 'pièce',
        stock_quantity = 0,
        min_stock_alert = 5,
        cost_price = 0,
        selling_price = 0,
        status = 'active',
        notes = '',
        units = [],
        supplier_prices = []
      } = data;

      if (!name || !sku) {
        return { success: false, message: 'Le nom et le SKU du produit sont obligatoires' };
      }

      let newProductId = null;

      const createTx = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO products (
            name, sku, barcode, category_id, primary_supplier_id, caisse_id,
            base_unit, stock_quantity, min_stock_alert, cost_price, selling_price,
            status, is_favorite, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const res = stmt.run(
          name.trim(),
          sku.trim(),
          (barcode || '').trim(),
          category_id ? Number(category_id) : null,
          primary_supplier_id ? Number(primary_supplier_id) : null,
          caisse_id ? Number(caisse_id) : null,
          base_unit.trim(),
          parseFloat(stock_quantity) || 0,
          parseFloat(min_stock_alert) || 5,
          parseFloat(cost_price) || 0,
          parseFloat(selling_price) || 0,
          status || 'active',
          data.is_favorite ? 1 : 0,
          (notes || '').trim()
        );
        newProductId = res.lastInsertRowid;

        // Insert units
        if (Array.isArray(units) && units.length > 0) {
          const unitStmt = db.prepare(`
            INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, cost_price, barcode, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const u of units) {
            unitStmt.run(
              newProductId,
              u.unit_name.trim(),
              parseFloat(u.conversion_factor) || 1,
              parseFloat(u.selling_price) || 0,
              parseFloat(u.cost_price) || 0,
              (u.barcode || '').trim(),
              u.is_default ? 1 : 0
            );
          }
        } else {
          // Default base unit
          db.prepare(`
            INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, cost_price, is_default)
            VALUES (?, ?, 1, ?, ?, 1)
          `).run(newProductId, base_unit, parseFloat(selling_price) || 0, parseFloat(cost_price) || 0);
        }

        // Insert supplier prices
        if (Array.isArray(supplier_prices) && supplier_prices.length > 0) {
          const suppStmt = db.prepare(`
            INSERT INTO product_suppliers (product_id, supplier_id, purchase_price, supplier_sku, lead_time_days, min_order_qty, is_primary, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const sp of supplier_prices) {
            suppStmt.run(
              newProductId,
              Number(sp.supplier_id),
              parseFloat(sp.purchase_price) || 0,
              (sp.supplier_sku || '').trim(),
              parseInt(sp.lead_time_days) || 1,
              parseFloat(sp.min_order_qty) || 1,
              sp.is_primary ? 1 : 0,
              (sp.notes || '').trim()
            );
          }
        }
      });

      createTx();
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Création du produit "${name}" (SKU: ${sku})`);
      return { success: true, id: newProductId };
    } catch (err) {
      console.error('Error creating product:', err);
      return { success: false, message: err.message };
    }
  });

  // Update product with units and supplier comparisons
  ipcMain.handle('products:update', async (event, data) => {
    try {
      const {
        id,
        name,
        sku,
        barcode,
        category_id,
        primary_supplier_id,
        caisse_id,
        base_unit = 'pièce',
        stock_quantity,
        min_stock_alert,
        cost_price,
        selling_price,
        status,
        is_favorite,
        notes,
        units,
        supplier_prices
      } = data;

      if (!id) return { success: false, message: 'ID produit manquant' };

      const updateTx = db.transaction(() => {
        db.prepare(`
          UPDATE products SET
            name = ?, sku = ?, barcode = ?, category_id = ?, primary_supplier_id = ?, caisse_id = ?,
            base_unit = ?, stock_quantity = ?, min_stock_alert = ?, cost_price = ?,
            selling_price = ?, status = ?, is_favorite = COALESCE(?, is_favorite), notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          name.trim(),
          sku.trim(),
          (barcode || '').trim(),
          category_id ? Number(category_id) : null,
          primary_supplier_id ? Number(primary_supplier_id) : null,
          caisse_id ? Number(caisse_id) : null,
          base_unit.trim(),
          parseFloat(stock_quantity) || 0,
          parseFloat(min_stock_alert) || 5,
          parseFloat(cost_price) || 0,
          parseFloat(selling_price) || 0,
          status || 'active',
          is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
          (notes || '').trim(),
          id
        );

        // Update units if provided
        if (Array.isArray(units)) {
          db.prepare('DELETE FROM product_units WHERE product_id = ?').run(id);
          const unitStmt = db.prepare(`
            INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, cost_price, barcode, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const u of units) {
            unitStmt.run(
              id,
              u.unit_name.trim(),
              parseFloat(u.conversion_factor) || 1,
              parseFloat(u.selling_price) || 0,
              parseFloat(u.cost_price) || 0,
              (u.barcode || '').trim(),
              u.is_default ? 1 : 0
            );
          }
        }

        // Update supplier prices if provided
        if (Array.isArray(supplier_prices)) {
          db.prepare('DELETE FROM product_suppliers WHERE product_id = ?').run(id);
          const suppStmt = db.prepare(`
            INSERT INTO product_suppliers (product_id, supplier_id, purchase_price, supplier_sku, lead_time_days, min_order_qty, is_primary, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const sp of supplier_prices) {
            suppStmt.run(
              id,
              Number(sp.supplier_id),
              parseFloat(sp.purchase_price) || 0,
              (sp.supplier_sku || '').trim(),
              parseInt(sp.lead_time_days) || 1,
              parseFloat(sp.min_order_qty) || 1,
              sp.is_primary ? 1 : 0,
              (sp.notes || '').trim()
            );
          }
        }
      });

      updateTx();
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Modification du produit "${name}" (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error('Error updating product:', err);
      return { success: false, message: err.message };
    }
  });

  // Toggle Product Favorite
  ipcMain.handle('products:toggleFavorite', async (event, productId) => {
    try {
      const prod = db.prepare('SELECT id, name, is_favorite FROM products WHERE id = ?').get(productId);
      if (!prod) return { success: false, message: 'Produit introuvable' };
      const newFav = prod.is_favorite ? 0 : 1;
      db.prepare('UPDATE products SET is_favorite = ? WHERE id = ?').run(newFav, productId);
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      return { success: true, is_favorite: newFav };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Delete product
  ipcMain.handle('products:delete', async (event, productId) => {
    try {
      const existing = db.prepare('SELECT name FROM products WHERE id = ?').get(productId);
      if (!existing) return { success: false, message: 'Produit introuvable' };

      const deleteTx = db.transaction(() => {
        db.prepare('DELETE FROM product_units WHERE product_id = ?').run(productId);
        db.prepare('DELETE FROM product_suppliers WHERE product_id = ?').run(productId);
        db.prepare('DELETE FROM products WHERE id = ?').run(productId);
      });
      deleteTx();
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression du produit "${existing.name}" (ID: ${productId})`);
      return { success: true };
    } catch (err) {
      console.error('Error deleting product:', err);
      return { success: false, message: err.message };
    }
  });

  // Update stock quantity directly (fast inline adjustment)
  ipcMain.handle('products:updateStock', async (event, { productId, newStock, reason }) => {
    try {
      db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        parseFloat(newStock) || 0,
        productId
      );
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
        'Admin', 
        `Mise à jour stock produit #${productId} -> ${newStock} (${reason || 'Ajustement inventaire'})`
      );
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Get Supplier Price Comparison for a product
  ipcMain.handle('products:getSupplierComparison', async (event, productId) => {
    try {
      const rows = db.prepare(`
        SELECT 
          ps.*,
          f.name as supplier_name,
          f.phone as supplier_phone,
          f.email as supplier_email,
          f.city as supplier_city,
          f.current_credit as supplier_debt
        FROM product_suppliers ps
        JOIN fournisseurs f ON f.id = ps.supplier_id
        WHERE ps.product_id = ?
        ORDER BY ps.purchase_price ASC
      `).all(productId);

      const minPrice = rows.length > 0 ? rows[0].purchase_price : 0;
      const comparison = rows.map((r, index) => ({
        ...r,
        is_cheapest: index === 0,
        price_difference: index === 0 ? 0 : r.purchase_price - minPrice,
        percentage_difference: minPrice > 0 ? (((r.purchase_price - minPrice) / minPrice) * 100).toFixed(1) : 0
      }));

      return { success: true, comparison, minPrice };
    } catch (err) {
      return { success: false, message: err.message, comparison: [] };
    }
  });

  // Categories IPC
  ipcMain.handle('categories:getAll', async () => {
    const KEY = 'categories:all';
    const cached = appCache.get(KEY);
    if (cached) return cached;

    try {
      const categories = db.prepare(`
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `).all();
      const result = { success: true, categories };
      appCache.set(KEY, result, TTL.CATEGORIES);
      return result;
    } catch (err) {
      return { success: false, message: err.message, categories: [] };
    }
  });

  ipcMain.handle('categories:create', async (event, { name, code, color = '#16a34a', icon = 'tag' }) => {
    try {
      if (!name || !name.trim()) {
        return { success: false, message: 'Le nom de la catégorie est obligatoire' };
      }
      const existing = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(name.trim());
      if (existing) {
        return { success: true, id: existing.id, message: 'Catégorie existante' };
      }
      const res = db.prepare('INSERT INTO categories (name, code, color, icon) VALUES (?, ?, ?, ?)').run(
        name.trim(),
        (code || name.trim().toUpperCase().slice(0, 8)),
        color,
        icon
      );
      appCache.del('categories:all');
      return { success: true, id: res.lastInsertRowid, message: 'Catégorie créée avec succès' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Cart: Process Quick Order / Purchase Checkout with Caisse & Transaction Integration
  ipcMain.handle('cart:createOrder', async (event, { 
    items, 
    supplierId = null, 
    caisseId = null,
    orderType = 'purchase', 
    paymentMethod = 'especes',
    affectCaisse = true,
    userName = 'Admin',
    notes = '',
    supplierVersements = null,
    versement = undefined
  }) => {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, message: 'Le panier est vide' };
      }

      let totalAmount = 0;
      let itemCount = 0;
      for (const item of items) {
        totalAmount += (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1);
        itemCount += parseFloat(item.quantity) || 1;
      }

      let orderId = null;
      let caisseTransactionId = null;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const todayDate = now.slice(0, 10);

      const orderTx = db.transaction(() => {
        // 1. Resolve selected caisse or fallback
        let targetCaisseId = caisseId ? Number(caisseId) : null;
        if (!targetCaisseId && affectCaisse && paymentMethod !== 'credit') {
          const productCaisse = items.find(it => it.caisseId)?.caisseId;
          if (productCaisse) {
            targetCaisseId = Number(productCaisse);
          } else {
            const defaultCaisse = db.prepare('SELECT id FROM caisses WHERE is_default = 1 LIMIT 1').get() ||
                                  db.prepare('SELECT id FROM caisses ORDER BY id ASC LIMIT 1').get();
            if (defaultCaisse) targetCaisseId = defaultCaisse.id;
          }
        }

        // Group items by supplier to calculate per-supplier amounts
        const supplierGroups = {};
        for (const it of items) {
          const sId = it.supplierId ? Number(it.supplierId) : (supplierId ? Number(supplierId) : null);
          const sKey = sId ? String(sId) : 'unassigned';
          if (!supplierGroups[sKey]) {
            supplierGroups[sKey] = {
              supplierId: sId,
              supplierName: it.supplierName || (sId ? db.prepare('SELECT name FROM fournisseurs WHERE id = ?').get(sId)?.name : 'Divers'),
              items: [],
              subtotal: 0
            };
          }
          const lineTotal = (parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 1);
          supplierGroups[sKey].items.push(it);
          supplierGroups[sKey].subtotal += lineTotal;
        }

        // Check for explicit supplierVersements passed from frontend: [{ supplierId, versement, caisseId }]
        const versementsMap = {};
        if (Array.isArray(supplierVersements)) {
          for (const sv of supplierVersements) {
            const k = sv.supplierId ? String(sv.supplierId) : 'unassigned';
            versementsMap[k] = {
              versement: Math.max(0, parseFloat(sv.versement) || 0),
              caisseId: sv.caisseId ? Number(sv.caisseId) : targetCaisseId
            };
          }
        }

        let totalPaid = 0;
        let totalCredit = 0;
        const processedVersements = [];

        for (const sKey of Object.keys(supplierGroups)) {
          const grp = supplierGroups[sKey];
          let vers = grp.subtotal; // default: 100% comptant
          let cId = targetCaisseId;

          if (versementsMap[sKey] !== undefined) {
            vers = Math.min(grp.subtotal, versementsMap[sKey].versement);
            cId = versementsMap[sKey].caisseId || targetCaisseId;
          } else if (versement !== undefined && Object.keys(supplierGroups).length === 1) {
            vers = Math.min(grp.subtotal, Math.max(0, parseFloat(versement) || 0));
          } else if (paymentMethod === 'credit') {
            vers = 0;
          }

          const remCredit = Math.max(0, grp.subtotal - vers);
          totalPaid += vers;
          totalCredit += remCredit;

          processedVersements.push({
            supplierId: grp.supplierId,
            supplierName: grp.supplierName,
            subtotal: grp.subtotal,
            versement: vers,
            remainingCredit: remCredit,
            caisseId: cId
          });
        }

        const finalMethod = totalCredit <= 0 ? paymentMethod : (totalPaid <= 0 ? 'credit' : 'mixte');

        // 2. Insert cart order record (with paid_amount, credit_amount, user_name)
        const primarySupplierId = supplierId ? Number(supplierId) : (processedVersements.find(p => p.supplierId)?.supplierId || null);
        const res = db.prepare(`
          INSERT INTO cart_orders (
            order_type, supplier_id, caisse_id, payment_method, 
            total_amount, paid_amount, credit_amount, 
            item_count, notes, user_name
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          orderType, 
          primarySupplierId, 
          targetCaisseId, 
          finalMethod, 
          totalAmount, 
          totalPaid, 
          totalCredit, 
          itemCount, 
          notes,
          userName
        );
        orderId = res.lastInsertRowid;

        // 3. Process Caisse Transactions and Supplier Credits for each supplier group
        for (const pv of processedVersements) {
          // A. Create Caisse Transaction if versement > 0 and affectCaisse
          if (orderType === 'purchase' && affectCaisse && pv.versement > 0 && pv.caisseId) {
            const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(pv.caisseId);
            if (caisse) {
              const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(pv.caisseId);
              const sessId = activeSession ? activeSession.id : null;
              let cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Achat Fournisseur'").get();
              const catId = cat ? cat.id : null;
              const refTrx = `ACH-${Date.now().toString().slice(-6)}`;
              const desc = `Achat Bon #${orderId} - Fournisseur: ${pv.supplierName} (Total: ${pv.subtotal.toFixed(2)} DA, Versé: ${pv.versement.toFixed(2)} DA, Reste crédit: ${pv.remainingCredit.toFixed(2)} DA) - Par: ${userName}`;

              const expectedBalance = (parseFloat(caisse.current_balance) || 0) - pv.versement;
              const txRes = db.prepare(`
                INSERT INTO caisse_transactions (
                  caisse_id, session_id, type, amount, category_id, category_name,
                  reference, description, payment_method, date, user_name, balance_after
                )
                VALUES (?, ?, 'out', ?, ?, 'Achat Fournisseur', ?, ?, ?, ?, ?, ?)
              `).run(
                pv.caisseId,
                sessId,
                pv.versement,
                catId,
                refTrx,
                desc,
                paymentMethod,
                now,
                userName,
                expectedBalance
              );

              if (!caisseTransactionId) {
                caisseTransactionId = txRes.lastInsertRowid;
                db.prepare('UPDATE cart_orders SET caisse_transaction_id = ? WHERE id = ?').run(caisseTransactionId, orderId);
              }
            }
          }

          // B. Record in fournisseur_credits (trg_fournisseur_credits_ai auto-updates current_credit on fournisseurs!)
          if (pv.supplierId && orderType === 'purchase') {
            const supp = db.prepare('SELECT name, current_credit FROM fournisseurs WHERE id = ?').get(pv.supplierId);
            if (supp) {
              if (pv.remainingCredit > 0) {
                if (pv.versement > 0) {
                  // Downpayment scenario: record purchase (+subtotal) and immediate payment (-versement)
                  db.prepare(`
                    INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                    VALUES (?, 'achat_credit', ?, ?, ?, ?, ?, ?)
                  `).run(
                    pv.supplierId,
                    pv.subtotal,
                    paymentMethod,
                    `COMMANDE-#${orderId}`,
                    `Facture Achat Bon #${orderId} (${itemCount} art.) - Par: ${userName}`,
                    todayDate,
                    (parseFloat(supp.current_credit) || 0) + pv.subtotal
                  );

                  db.prepare(`
                    INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                    VALUES (?, 'paiement', ?, ?, ?, ?, ?, ?)
                  `).run(
                    pv.supplierId,
                    pv.versement,
                    paymentMethod,
                    `VERS-#${orderId}`,
                    `Versement acompte sur Bon #${orderId} - Par: ${userName}`,
                    todayDate,
                    (parseFloat(supp.current_credit) || 0) + pv.subtotal - pv.versement
                  );
                } else {
                  // 100% à crédit
                  db.prepare(`
                    INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                    VALUES (?, 'achat_credit', ?, 'credit', ?, ?, ?, ?)
                  `).run(
                    pv.supplierId,
                    pv.subtotal,
                    paymentMethod,
                    `COMMANDE-#${orderId}`,
                    `Achat à crédit total Bon #${orderId} - Par: ${userName}`,
                    todayDate,
                    (parseFloat(supp.current_credit) || 0) + pv.subtotal
                  );
                }
              }
            }
          }
        }

        // 4. Insert order items (Stock is maintained via conversionFactor in DB triggers or direct update)
        const itemStmt = db.prepare(`
          INSERT INTO cart_order_items (order_id, product_id, product_name, unit_name, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const it of items) {
          const lineTotal = (parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 1);
          const conv = parseFloat(it.conversionFactor) || 1;
          const baseQty = (parseFloat(it.quantity) || 1) * conv;

          itemStmt.run(
            orderId,
            it.productId,
            it.productName,
            it.unitName || 'Unité',
            baseQty,
            parseFloat(it.price) || 0,
            lineTotal
          );
        }
      });

      orderTx();
      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      appCache.delByPrefix('fournisseurs:');
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
        userName, 
        `Validation bon de commande KMS #${orderId} (${orderType === 'purchase' ? 'Achat/Entrée stock' : 'Vente'}) - Montant: ${totalAmount.toFixed(2)} DA`
      );

      return { 
        success: true, 
        orderId, 
        totalAmount, 
        itemCount, 
        caisseTransactionId 
      };
    } catch (err) {
      console.error('Error creating cart order:', err);
      return { success: false, message: err.message };
    }
  });

  // Get all orders with paginated backend filters
  ipcMain.handle('cart:getOrders', async (event, filters = {}) => {
    try {
      const {
        page = 1,
        pageSize = 15,
        orderType = 'purchase',
        supplierId = 'all',
        caisseId = 'all',
        paymentMethod = 'all',
        startDate = '',
        endDate = '',
        search = ''
      } = filters;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(pageSize, 10) || 15);
      const offset = (pageNum - 1) * limitNum;

      const whereClauses = [];
      const params = [];

      if (orderType && orderType !== 'all') {
        whereClauses.push('o.order_type = ?');
        params.push(orderType);
      }

      if (supplierId && supplierId !== 'all') {
        whereClauses.push('o.supplier_id = ?');
        params.push(Number(supplierId));
      }

      if (caisseId && caisseId !== 'all') {
        whereClauses.push('o.caisse_id = ?');
        params.push(Number(caisseId));
      }

      if (paymentMethod && paymentMethod !== 'all') {
        whereClauses.push('o.payment_method = ?');
        params.push(paymentMethod);
      }

      if (startDate) {
        whereClauses.push('date(o.created_at) >= date(?)');
        params.push(startDate);
      }

      if (endDate) {
        whereClauses.push('date(o.created_at) <= date(?)');
        params.push(endDate);
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        whereClauses.push('(o.notes LIKE ? OR f.name LIKE ? OR c.name LIKE ? OR cast(o.id as text) LIKE ?)');
        params.push(s, s, s, s);
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const countSql = `
        SELECT COUNT(*) as total, COALESCE(SUM(o.total_amount), 0) as sum_total
        FROM cart_orders o
        LEFT JOIN fournisseurs f ON f.id = o.supplier_id
        LEFT JOIN caisses c ON c.id = o.caisse_id
        ${whereSql}
      `;
      const countRes = db.prepare(countSql).get(...params);
      const totalCount = countRes.total;
      const totalAmountSum = countRes.sum_total;
      const totalPages = Math.ceil(totalCount / limitNum) || 1;

      const querySql = `
        SELECT 
          o.*,
          f.name as supplier_name,
          f.phone as supplier_phone,
          c.name as caisse_name,
          c.code as caisse_code,
          o.user_name as created_by,
          (
            SELECT COUNT(*) 
            FROM cart_order_items oi 
            WHERE oi.order_id = o.id
          ) as distinct_items_count
        FROM cart_orders o
        LEFT JOIN fournisseurs f ON f.id = o.supplier_id
        LEFT JOIN caisses c ON c.id = o.caisse_id
        ${whereSql}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `;

      const orders = db.prepare(querySql).all(...params, limitNum, offset);

      return {
        success: true,
        orders,
        totalCount,
        totalPages,
        currentPage: pageNum,
        totalAmountSum,
        pageSize: limitNum
      };
    } catch (err) {
      console.error('Error in cart:getOrders:', err);
      return { success: false, message: err.message, orders: [], totalCount: 0, totalPages: 1 };
    }
  });

  // Get single order with its items
  ipcMain.handle('cart:getOrderById', async (event, orderId) => {
    try {
      const order = db.prepare(`
        SELECT 
          o.*,
          f.name as supplier_name,
          f.phone as supplier_phone,
          c.name as caisse_name,
          c.code as caisse_code,
          o.user_name as created_by,
          tx.reference as transaction_ref
        FROM cart_orders o
        LEFT JOIN fournisseurs f ON f.id = o.supplier_id
        LEFT JOIN caisses c ON c.id = o.caisse_id
        LEFT JOIN caisse_transactions tx ON tx.id = o.caisse_transaction_id
        WHERE o.id = ?
      `).get(orderId);

      if (!order) return { success: false, message: 'Commande introuvable' };

      const items = db.prepare(`
        SELECT oi.*, p.sku, p.barcode, p.stock_quantity as current_stock, p.cost_price as current_cost
        FROM cart_order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `).all(orderId);

      return { success: true, order, items };
    } catch (err) {
      console.error('Error fetching order by id:', err);
      return { success: false, message: err.message };
    }
  });

  // Delete / cancel an order atomically with stock and money rollback
  ipcMain.handle('cart:deleteOrder', async (event, orderId) => {
    try {
      const order = db.prepare('SELECT * FROM cart_orders WHERE id = ?').get(orderId);
      if (!order) return { success: false, message: 'Commande introuvable' };

      const deleteTx = db.transaction(() => {
        // 1. Rollback linked caisse transactions
        // Note: trg_caisse_transactions_ad will auto-reverse caisse balance on DELETE!
        if (order.caisse_transaction_id) {
          db.prepare('DELETE FROM caisse_transactions WHERE id = ?').run(order.caisse_transaction_id);
        }
        db.prepare("DELETE FROM caisse_transactions WHERE description LIKE ?").run(`%Bon #${orderId}%`);

        // 2. Rollback linked supplier credit operations (both invoice and downpayment)
        // trg_fournisseur_credits_ad automatically reverses current_credit on fournisseurs table!
        db.prepare('DELETE FROM fournisseur_credits WHERE reference = ? OR reference = ?').run(`COMMANDE-#${orderId}`, `VERS-#${orderId}`);

        // 3. Delete items (triggers trg_cart_order_items_stock_ad will automatically reverse product stock!)
        db.prepare('DELETE FROM cart_order_items WHERE order_id = ?').run(orderId);

        // 4. Delete order record
        db.prepare('DELETE FROM cart_orders WHERE id = ?').run(orderId);

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          order.user_name || 'Admin', 
          `Suppression/Annulation bon de commande #${orderId} (${order.order_type === 'purchase' ? 'Achat' : 'Vente'}) - Montant: ${order.total_amount.toFixed(2)} DA`
        );
      });

      deleteTx();
      return { success: true };
    } catch (err) {
      console.error('Error deleting order:', err);
      return { success: false, message: err.message };
    }
  });

  // Update order (adjust notes, payment method, caisse, or downpayment/credit amounts)
  ipcMain.handle('cart:updateOrder', async (event, { orderId, notes, paymentMethod, caisseId, paidAmount, creditAmount }) => {
    try {
      const order = db.prepare('SELECT * FROM cart_orders WHERE id = ?').get(orderId);
      if (!order) return { success: false, message: 'Commande introuvable' };

      const updateTx = db.transaction(() => {
        const totalAmount = parseFloat(order.total_amount) || 0;
        const now = new Date().toISOString();
        const todayDate = now.slice(0, 10);
        const userName = order.user_name || 'Admin';

        // 1. Determine target payment amounts
        let newPaid = paidAmount !== undefined ? Math.max(0, parseFloat(paidAmount) || 0) : (parseFloat(order.paid_amount) || 0);
        if (newPaid > totalAmount) newPaid = totalAmount;
        let newCredit = Math.max(0, totalAmount - newPaid);

        if (paymentMethod === 'credit') {
          newPaid = 0;
          newCredit = totalAmount;
        } else if (paymentMethod === 'especes' && paidAmount === undefined) {
          newPaid = totalAmount;
          newCredit = 0;
        }

        const finalMethod = newCredit <= 0 ? (paymentMethod && paymentMethod !== 'credit' ? paymentMethod : 'especes') : (newPaid <= 0 ? 'credit' : 'mixte');
        const targetCaisseId = caisseId !== undefined ? (caisseId ? Number(caisseId) : null) : order.caisse_id;

        // 2. Synchronize Caisse Transactions
        let newTxId = null;

        // Delete any existing transactions for this order (trg_caisse_transactions_ad automatically refunds the old caisse)
        if (order.caisse_transaction_id) {
          db.prepare('DELETE FROM caisse_transactions WHERE id = ?').run(order.caisse_transaction_id);
        }
        db.prepare("DELETE FROM caisse_transactions WHERE description LIKE ?").run(`%Bon #${orderId}%`);

        // If newPaid > 0 and a caisse is configured, create the revised caisse transaction (trg_caisse_transactions_ai automatically debits the target caisse)
        if (newPaid > 0 && targetCaisseId && order.order_type === 'purchase') {
          const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(targetCaisseId);
          if (caisse) {
            const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(targetCaisseId);
            const sessId = activeSession ? activeSession.id : null;
            let cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Achat Fournisseur'").get();
            const catId = cat ? cat.id : null;
            const refTrx = `ACH-${Date.now().toString().slice(-6)}`;
            const desc = `Achat Bon #${orderId} (Modifié) - Total: ${totalAmount.toFixed(2)} DA, Versé: ${newPaid.toFixed(2)} DA, Dette: ${newCredit.toFixed(2)} DA - Par: ${userName}`;

            const expectedBalance = (parseFloat(caisse.current_balance) || 0) - newPaid;
            const txRes = db.prepare(`
              INSERT INTO caisse_transactions (
                caisse_id, session_id, type, amount, category_id, category_name,
                reference, description, payment_method, date, user_name, balance_after
              )
              VALUES (?, ?, 'out', ?, ?, 'Achat Fournisseur', ?, ?, ?, ?, ?, ?)
            `).run(
              targetCaisseId,
              sessId,
              newPaid,
              catId,
              refTrx,
              desc,
              finalMethod,
              now,
              userName,
              expectedBalance
            );
            newTxId = txRes.lastInsertRowid;
          }
        }

        // 3. Synchronize Supplier Credit (Dette Fournisseur)
        if (order.supplier_id && order.order_type === 'purchase') {
          // Delete old credit records for this order (trg_fournisseur_credits_ad automatically reverses old debt)
          db.prepare('DELETE FROM fournisseur_credits WHERE reference = ? OR reference = ?').run(`COMMANDE-#${orderId}`, `VERS-#${orderId}`);

          // If debt remains, insert revised credit records (trg_fournisseur_credits_ai automatically applies new debt)
          if (newCredit > 0) {
            const supp = db.prepare('SELECT current_credit FROM fournisseurs WHERE id = ?').get(order.supplier_id);
            const currentDebt = supp ? (parseFloat(supp.current_credit) || 0) : 0;

            if (newPaid > 0) {
              // Purchase invoice full + downpayment
              db.prepare(`
                INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                VALUES (?, 'achat_credit', ?, ?, ?, ?, ?, ?)
              `).run(
                order.supplier_id,
                totalAmount,
                finalMethod,
                `COMMANDE-#${orderId}`,
                `Facture Achat Bon #${orderId} (Ajusté) - Par: ${userName}`,
                todayDate,
                currentDebt + totalAmount
              );

              db.prepare(`
                INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                VALUES (?, 'paiement', ?, ?, ?, ?, ?, ?)
              `).run(
                order.supplier_id,
                newPaid,
                finalMethod,
                `VERS-#${orderId}`,
                `Versement Bon #${orderId} (Ajusté) - Sortie Caisse`,
                todayDate,
                currentDebt + totalAmount - newPaid
              );
            } else {
              // 100% credit
              db.prepare(`
                INSERT INTO fournisseur_credits (fournisseur_id, type, amount, payment_method, reference, notes, date, balance_after)
                VALUES (?, 'achat_credit', ?, ?, ?, ?, ?, ?)
              `).run(
                order.supplier_id,
                totalAmount,
                'credit',
                `COMMANDE-#${orderId}`,
                `Facture Achat 100% Crédit Bon #${orderId} (Ajusté) - Par: ${userName}`,
                todayDate,
                currentDebt + totalAmount
              );
            }
          }
        }

        // 4. Update order record
        db.prepare(`
          UPDATE cart_orders 
          SET notes = ?, payment_method = ?, caisse_id = ?, caisse_transaction_id = ?, paid_amount = ?, credit_amount = ?
          WHERE id = ?
        `).run(
          notes !== undefined ? notes : (order.notes || ''),
          finalMethod,
          targetCaisseId,
          newTxId,
          newPaid,
          newCredit,
          orderId
        );

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          userName, 
          `Modification bon d'achat #${orderId} (Versé: ${newPaid.toFixed(2)} DA, Dette: ${newCredit.toFixed(2)} DA, Caisse: ${targetCaisseId || 'Aucune'})`
        );
      });

      updateTx();
      return { success: true };
    } catch (err) {
      console.error('Error updating order:', err);
      return { success: false, message: err.message };
    }
  });

  // ==========================================
  // EMPLOYEES MODULE IPC HANDLERS
  // ==========================================

  // Get employees (from users table) with pagination
  ipcMain.handle('employees:getAll', async (event, filters = {}) => {
    try {
      const { search = '', status = 'all', department = 'all', page = 1, pageSize = 10 } = filters;
      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(e.full_name LIKE ? OR e.username LIKE ? OR e.cin LIKE ? OR e.phone LIKE ? OR e.department LIKE ? OR e.position LIKE ?)');
        const s = `%${search}%`;
        params.push(s, s, s, s, s, s);
      }
      if (status && status !== 'all') {
        whereClauses.push('e.emp_status = ?');
        params.push(status);
      }
      if (department && department !== 'all') {
        whereClauses.push('e.department = ?');
        params.push(department);
      }

      const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const totalCount = db.prepare(`SELECT COUNT(*) as c FROM users e ${whereStr}`).get(...params).c;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const offset = (page - 1) * pageSize;

      const employees = db.prepare(`
        SELECT e.*,
          e.emp_status as status,
          COALESCE((SELECT SUM(a.amount) FROM employee_advances a WHERE a.employee_id = e.id), 0) as total_advances,
          COALESCE((SELECT SUM(p.net_paid) FROM employee_payments p WHERE p.employee_id = e.id), 0) as total_paid,
          COALESCE((SELECT SUM(d.remaining) FROM employee_debts d WHERE d.employee_id = e.id AND d.status = 'en_cours'), 0) as total_debt
        FROM users e
        ${whereStr}
        ORDER BY e.full_name ASC
        LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset);

      return { success: true, employees, totalCount, totalPages, page };
    } catch (err) {
      console.error('Error fetching employees:', err);
      return { success: false, message: err.message, employees: [], totalCount: 0, totalPages: 1, page: 1 };
    }
  });

  // Get single user/employee with full payroll history
  ipcMain.handle('employees:getById', async (event, id) => {
    try {
      const employee = db.prepare('SELECT *, emp_status as status FROM users WHERE id = ?').get(id);
      if (!employee) return { success: false, message: 'Employé introuvable' };
      const advances = db.prepare('SELECT * FROM employee_advances WHERE employee_id = ? ORDER BY date DESC').all(id);
      const payments = db.prepare('SELECT * FROM employee_payments WHERE employee_id = ? ORDER BY year DESC, month DESC').all(id);
      const debts = db.prepare('SELECT * FROM employee_debts WHERE employee_id = ? ORDER BY date DESC').all(id);
      return { success: true, employee, advances, payments, debts };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Create user account (also used as employee creation)
  ipcMain.handle('employees:create', async (event, data) => {
    try {
      // Generate a username from full_name if not provided
      const username = (data.username || data.full_name.toLowerCase().replace(/\s+/g, '.') + '_' + Date.now()).trim();
      const password = data.password || 'password123';
      const res = db.prepare(`
        INSERT INTO users (username, password, full_name, role, phone, address, department, position, base_salary, hire_date, emp_status, cin, notes)
        VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        username, password, data.full_name.trim(),
        data.phone || '', data.address || '', data.department || '', data.position || '',
        parseFloat(data.base_salary) || 0, data.hire_date || null,
        data.status || 'actif', data.cin || '', data.notes || ''
      );
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Création employé "${data.full_name}"`);
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Update user/employee payroll info
  ipcMain.handle('employees:update', async (event, data) => {
    try {
      db.prepare(`
        UPDATE users SET full_name=?, cin=?, phone=?, email=?, address=?, department=?, position=?, base_salary=?, hire_date=?, emp_status=?, notes=? WHERE id=?
      `).run(
        data.full_name.trim(), data.cin || '', data.phone || '', data.email || '',
        data.address || '', data.department || '', data.position || '',
        parseFloat(data.base_salary) || 0, data.hire_date || null,
        data.status || 'actif', data.notes || '', data.id
      );
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Modification employé "${data.full_name}" (ID:${data.id})`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Delete user/employee (also deletes all their payroll records via CASCADE)
  ipcMain.handle('employees:delete', async (event, id) => {
    try {
      const emp = db.prepare('SELECT full_name FROM users WHERE id = ?').get(id);
      if (!emp) return { success: false, message: 'Employé introuvable' };
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Suppression employé "${emp.full_name}" (ID:${id})`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Add advance (references users table)
  ipcMain.handle('employees:addAdvance', async (event, data) => {
    try {
      const { employee_id, amount, date, reason, payment_method, reference, notes } = data;
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) return { success: false, message: 'Montant invalide' };
      const emp = db.prepare('SELECT full_name FROM users WHERE id = ?').get(employee_id);
      if (!emp) return { success: false, message: 'Employé introuvable' };
      const res = db.prepare(`
        INSERT INTO employee_advances (employee_id, amount, date, reason, payment_method, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(employee_id, num, date || new Date().toISOString().slice(0, 10), reason || '', payment_method || 'especes', reference || '', notes || '');
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Avance de ${num} accordée à ${emp.full_name}`);
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Delete advance
  ipcMain.handle('employees:deleteAdvance', async (event, id) => {
    try {
      db.prepare('DELETE FROM employee_advances WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Pay salary (references users table)
  ipcMain.handle('employees:paySalary', async (event, data) => {
    try {
      const { employee_id, month, year, base_salary, bonuses, deductions, advance_deducted, net_paid, payment_method, payment_date, notes } = data;
      const emp = db.prepare('SELECT full_name FROM users WHERE id = ?').get(employee_id);
      if (!emp) return { success: false, message: 'Employé introuvable' };
      const res = db.prepare(`
        INSERT INTO employee_payments (employee_id, month, year, base_salary, bonuses, deductions, advance_deducted, net_paid, payment_method, payment_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paye', ?)
      `).run(
        employee_id, month, parseInt(year), parseFloat(base_salary) || 0,
        parseFloat(bonuses) || 0, parseFloat(deductions) || 0,
        parseFloat(advance_deducted) || 0, parseFloat(net_paid) || 0,
        payment_method || 'especes', payment_date || new Date().toISOString().slice(0, 10), notes || ''
      );
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('Admin', `Salaire payé à ${emp.full_name}: ${parseFloat(net_paid).toFixed(2)} (${month}/${year})`);
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Delete payment
  ipcMain.handle('employees:deletePayment', async (event, id) => {
    try {
      db.prepare('DELETE FROM employee_payments WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Add debt
  ipcMain.handle('employees:addDebt', async (event, data) => {
    try {
      const { employee_id, amount, date, description } = data;
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) return { success: false, message: 'Montant invalide' };
      const res = db.prepare(`
        INSERT INTO employee_debts (employee_id, amount, remaining, date, description, status)
        VALUES (?, ?, ?, ?, ?, 'en_cours')
      `).run(employee_id, num, num, date || new Date().toISOString().slice(0, 10), description || '');
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Delete debt
  ipcMain.handle('employees:deleteDebt', async (event, id) => {
    try {
      db.prepare('DELETE FROM employee_debts WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Get employee KPI dashboard (from users table)
  ipcMain.handle('employees:getKpis', async (event, filters = {}) => {
    try {
      const now = new Date();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = now.getFullYear();
      const { month = currentMonth, year = currentYear } = filters;

      const totalEmployees = db.prepare("SELECT COUNT(*) as c FROM users WHERE emp_status = 'actif'").get().c;
      const masseSalariale = db.prepare("SELECT COALESCE(SUM(base_salary),0) as total FROM users WHERE emp_status = 'actif'").get().total;
      const totalPaid = db.prepare(`SELECT COALESCE(SUM(net_paid),0) as total FROM employee_payments WHERE month = ? AND year = ?`).get(month, year).total;
      const totalAdvances = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM employee_advances`).get().total;
      const totalDebts = db.prepare(`SELECT COALESCE(SUM(remaining),0) as total FROM employee_debts WHERE status = 'en_cours'`).get().total;

      return {
        success: true,
        kpis: {
          totalEmployees,
          masseSalariale,
          totalPaid,
          salaireRestant: Math.max(0, masseSalariale - totalPaid),
          totalAdvances,
          totalDebts,
          totalDepenses: totalPaid + totalAdvances
        }
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Get departments list (from users table)
  ipcMain.handle('employees:getDepartments', async () => {
    try {
      const rows = db.prepare("SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department ASC").all();
      return { success: true, departments: rows.map(r => r.department) };
    } catch (err) {
      return { success: false, departments: [] };
    }
  });

  // ==========================================
  // MULTI-CAISSE & TRANSACTIONS IPC HANDLERS
  // ==========================================

  // 1. Get all caisses with real-time stats (no cache)
  ipcMain.handle('caisses:getAll', async () => {
    try {
      const caisses = db.prepare(`
        SELECT c.*, u.full_name as assigned_user_name
        FROM caisses c
        LEFT JOIN users u ON c.assigned_user_id = u.id
        ORDER BY c.is_default DESC, c.id ASC
      `).all();

      const today = new Date().toISOString().slice(0, 10);

      // Enhance each caisse with active session and movements
      const enriched = caisses.map(c => {
        const activeSession = db.prepare(`
          SELECT * FROM caisse_sessions 
          WHERE caisse_id = ? AND status = 'open' 
          ORDER BY id DESC LIMIT 1
        `).get(c.id);

        let sessionIn = 0;
        let sessionOut = 0;
        let drawerExpected = c.current_balance;

        if (activeSession) {
          const inRow = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM caisse_transactions 
            WHERE (session_id = ? OR (caisse_id = ? AND date >= ?))
              AND type IN ('in', 'transfer_in')
          `).get(activeSession.id, c.id, activeSession.opened_at);
          sessionIn = inRow ? inRow.total : 0;

          const outRow = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM caisse_transactions 
            WHERE (session_id = ? OR (caisse_id = ? AND date >= ?))
              AND type IN ('out', 'transfer_out')
          `).get(activeSession.id, c.id, activeSession.opened_at);
          sessionOut = outRow ? outRow.total : 0;

          drawerExpected = (parseFloat(activeSession.opening_balance) || 0) + sessionIn - sessionOut;
        }

        const todayIn = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM caisse_transactions 
          WHERE (caisse_id = ? AND type = 'in') OR (destination_caisse_id = ? AND type = 'transfer_in')
          AND date(date) = date(?)
        `).get(c.id, c.id, today).total;

        const todayOut = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM caisse_transactions 
          WHERE caisse_id = ? AND type IN ('out', 'transfer_out')
          AND date(date) = date(?)
        `).get(c.id, today).total;

        const totalTransactions = db.prepare(`
          SELECT COUNT(*) as count 
          FROM caisse_transactions 
          WHERE caisse_id = ? OR destination_caisse_id = ?
        `).get(c.id, c.id).count;

        return {
          ...c,
          active_session: activeSession ? {
            ...activeSession,
            session_in: sessionIn,
            session_out: sessionOut,
            drawer_expected: drawerExpected
          } : null,
          today_in: todayIn,
          today_out: todayOut,
          total_transactions: totalTransactions
        };
      });

      return { success: true, caisses: enriched };
    } catch (err) {
      console.error('Error in caisses:getAll:', err);
      return { success: false, message: err.message, caisses: [] };
    }
  });

  // 2. Get single caisse by ID
  ipcMain.handle('caisses:getById', async (event, id) => {
    try {
      const caisse = db.prepare(`
        SELECT c.*, u.full_name as assigned_user_name
        FROM caisses c
        LEFT JOIN users u ON c.assigned_user_id = u.id
        WHERE c.id = ?
      `).get(id);

      if (!caisse) return { success: false, message: 'Caisse introuvable' };

      const activeSession = db.prepare(`
        SELECT * FROM caisse_sessions 
        WHERE caisse_id = ? AND status = 'open' 
        ORDER BY id DESC LIMIT 1
      `).get(id);

      return { success: true, caisse, activeSession };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 3. Create a new caisse
  ipcMain.handle('caisses:create', async (event, data) => {
    try {
      const { name, code, initial_balance = 0, notes = '', assigned_user_id = null } = data;
      if (!name || !name.trim()) return { success: false, message: 'Le nom de la caisse est obligatoire' };

      const caisseCode = (code && code.trim()) || ('CS-' + Math.floor(1000 + Math.random() * 9000));
      const initBal = Number(initial_balance) || 0;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const checkCode = db.prepare('SELECT id FROM caisses WHERE code = ?').get(caisseCode);
      if (checkCode) return { success: false, message: `Le code de caisse "${caisseCode}" existe déjà.` };

      const insertTx = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO caisses (name, code, status, current_balance, assigned_user_id, notes, last_opened_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const res = stmt.run(name.trim(), caisseCode, initBal > 0 ? 'open' : 'closed', initBal, assigned_user_id || null, notes, initBal > 0 ? now : null);
        const caisseId = res.lastInsertRowid;

        if (initBal > 0) {
          // Create initial session
          const sessStmt = db.prepare(`
            INSERT INTO caisse_sessions (caisse_id, user_name, opened_at, opening_balance, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          const sessRes = sessStmt.run(caisseId, 'Administrateur', now, initBal, 'open', 'Ouverture initiale');

          // Find fond de caisse category
          let fondCat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Fond de Caisse'").get();
          const catId = fondCat ? fondCat.id : null;

          // Record opening transaction
          const txStmt = db.prepare(`
            INSERT INTO caisse_transactions (caisse_id, session_id, type, amount, category_id, category_name, reference, description, payment_method, date, user_name, balance_after)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          txStmt.run(caisseId, sessRes.lastInsertRowid, 'in', initBal, catId, 'Fond de Caisse', 'INIT-' + caisseId, 'Fond de caisse initial', 'especes', now, 'Administrateur', initBal);
        }

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', `Création caisse: ${name} (${caisseCode})`);
        return caisseId;
      });

      const newId = insertTx();
      return { success: true, id: newId };
    } catch (err) {
      console.error('Error creating caisse:', err);
      return { success: false, message: err.message };
    }
  });

  // 4. Update caisse
  ipcMain.handle('caisses:update', async (event, data) => {
    try {
      const { id, name, code, notes, assigned_user_id } = data;
      if (!id) return { success: false, message: 'ID de caisse manquant' };

      const stmt = db.prepare(`
        UPDATE caisses 
        SET name = ?, code = ?, notes = ?, assigned_user_id = ?
        WHERE id = ?
      `);
      stmt.run(name.trim(), code.trim(), notes || '', assigned_user_id || null, id);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 5. Delete caisse
  ipcMain.handle('caisses:delete', async (event, id) => {
    try {
      const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(id);
      if (!caisse) return { success: false, message: 'Caisse introuvable' };
      if (caisse.is_default === 1) return { success: false, message: 'La caisse principale par défaut ne peut pas être supprimée.' };

      const txCount = db.prepare('SELECT COUNT(*) as c FROM caisse_transactions WHERE caisse_id = ? OR destination_caisse_id = ?').get(id, id).c;
      if (txCount > 0) {
        return { 
          success: false, 
          message: `Impossible de supprimer cette caisse car elle contient ${txCount} transaction(s). Veuillez d'abord la clôturer ou archiver ses opérations.` 
        };
      }

      db.prepare('DELETE FROM caisses WHERE id = ?').run(id);
      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', `Suppression caisse #${id} (${caisse.name})`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 6. Open session (can open at any time with initial cash float)
  ipcMain.handle('caisses:openSession', async (event, data) => {
    try {
      const { caisse_id, opening_balance = 0, user_name = 'Caissier', notes = '' } = data;
      const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(caisse_id);
      if (!caisse) return { success: false, message: 'Caisse introuvable' };

      const active = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open'").get(caisse_id);
      if (active) return { success: false, message: 'Cette caisse a déjà une session ouverte.' };

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const openAmount = Number(opening_balance) || 0;

      const openTx = db.transaction(() => {
        const sessRes = db.prepare(`
          INSERT INTO caisse_sessions (caisse_id, user_name, opened_at, opening_balance, status, notes)
          VALUES (?, ?, ?, ?, 'open', ?)
        `).run(caisse_id, user_name, now, openAmount, notes);

        // Keep current caisse balance unchanged: opening float is placed into the drawer
        db.prepare(`
          UPDATE caisses 
          SET status = 'open', last_opened_at = ? 
          WHERE id = ?
        `).run(now, caisse_id);

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          user_name, 
          `Ouverture session caisse: ${caisse.name} (Fond de caisse initial: ${openAmount.toFixed(2)} DA)`
        );
        return sessRes.lastInsertRowid;
      });

      const sessId = openTx();
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');
      return { success: true, sessionId: sessId };
    } catch (err) {
      console.error('Error opening session:', err);
      return { success: false, message: err.message };
    }
  });

  // 7. Close session (can close at any time, see what is now in drawer, adjust/correct figure, update caisse balance)
  ipcMain.handle('caisses:closeSession', async (event, data) => {
    try {
      const { 
        caisse_id, 
        session_id, 
        closing_balance_actual, 
        actual_balance, 
        notes = '', 
        user_name = 'Caissier' 
      } = data;
      const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(caisse_id);
      if (!caisse) return { success: false, message: 'Caisse introuvable' };

      // Find active session
      let session = null;
      if (session_id) {
        session = db.prepare('SELECT * FROM caisse_sessions WHERE id = ?').get(session_id);
      }
      if (!session) {
        session = db.prepare("SELECT * FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(caisse_id);
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Compute theoretical drawer amount during this session
      let sessionIn = 0;
      let sessionOut = 0;
      let openingBal = 0;

      if (session) {
        openingBal = parseFloat(session.opening_balance) || 0;
        const inRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM caisse_transactions 
          WHERE (session_id = ? OR (caisse_id = ? AND date >= ?))
            AND type IN ('in', 'transfer_in')
        `).get(session.id, caisse_id, session.opened_at);
        sessionIn = inRow ? inRow.total : 0;

        const outRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM caisse_transactions 
          WHERE (session_id = ? OR (caisse_id = ? AND date >= ?))
            AND type IN ('out', 'transfer_out')
        `).get(session.id, caisse_id, session.opened_at);
        sessionOut = outRow ? outRow.total : 0;
      }

      // Theoretical cash in the till right now = starting float + all cash in - all cash out
      const expected = openingBal + sessionIn - sessionOut;
      const actualInput = closing_balance_actual !== undefined ? closing_balance_actual : actual_balance;
      const actual = (actualInput !== undefined && actualInput !== '' && !isNaN(Number(actualInput))) 
        ? Number(actualInput) 
        : expected;
      const diff = Math.round((actual - expected) * 100) / 100;

      const closeTx = db.transaction(() => {
        const sessId = session ? session.id : null;

        if (sessId) {
          // Close session
          db.prepare(`
            UPDATE caisse_sessions 
            SET closed_at = ?, closing_balance_expected = ?, closing_balance_actual = ?, difference = ?, status = 'closed', notes = COALESCE(notes || '', '') || ' ' || ?
            WHERE id = ?
          `).run(now, expected, actual, diff, notes, sessId);
        }

        // If there is an ecart (discrepancy / correction), insert an adjustment transaction.
        // The SQLite trigger 'trg_caisse_transactions_ai' will automatically update caisses.current_balance!
        if (diff !== 0) {
          let adjCat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Ajustement Écart de Caisse'").get();
          if (!adjCat) {
            const insCat = db.prepare("INSERT INTO caisse_transaction_categories (name, type, color, icon, description, is_system) VALUES ('Ajustement Écart de Caisse', 'both', '#f59e0b', 'alert-triangle', 'Ajustement lors de la clôture', 1)").run();
            adjCat = { id: insCat.lastInsertRowid };
          }
          const adjType = diff > 0 ? 'in' : 'out';
          const adjAmount = Math.abs(diff);

          db.prepare(`
            INSERT INTO caisse_transactions (caisse_id, session_id, type, amount, category_id, category_name, reference, description, payment_method, date, user_name)
            VALUES (?, ?, ?, ?, ?, 'Ajustement Écart de Caisse', ?, ?, 'especes', ?, ?)
          `).run(
            caisse_id, 
            sessId, 
            adjType, 
            adjAmount, 
            adjCat ? adjCat.id : null, 
            'CLOT-' + (sessId || Date.now()), 
            `Écart de caisse clôture (${diff > 0 ? '+' : ''}${diff.toFixed(2)} DA) - ${notes || 'Ajustement comptage'}`, 
            now, 
            user_name
          );
        }

        // Update caisse status to closed
        db.prepare(`
          UPDATE caisses 
          SET status = 'closed', last_closed_at = ?
          WHERE id = ?
        `).run(now, caisse_id);

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          user_name, 
          `Clôture session caisse: ${caisse.name} (Attendu: ${expected.toFixed(2)} DA, Réel: ${actual.toFixed(2)} DA, Écart: ${diff.toFixed(2)} DA)`
        );
      });

      closeTx();
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');

      return { 
        success: true, 
        difference: diff, 
        discrepancy: diff, 
        actual, 
        expected,
        session_in: sessionIn,
        session_out: sessionOut,
        opening_balance: openingBal
      };
    } catch (err) {
      console.error('Error closing session:', err);
      return { success: false, message: err.message };
    }
  });

  // 8. Get sessions history
  ipcMain.handle('caisses:getSessions', async (event, { caisse_id = 'all', limit = 20 } = {}) => {
    try {
      let query = `
        SELECT s.*, c.name as caisse_name, c.code as caisse_code
        FROM caisse_sessions s
        JOIN caisses c ON s.caisse_id = c.id
      `;
      const params = [];
      if (caisse_id !== 'all') {
        query += ' WHERE s.caisse_id = ? ';
        params.push(caisse_id);
      }
      query += ' ORDER BY s.id DESC LIMIT ? ';
      params.push(Number(limit) || 20);

      const sessions = db.prepare(query).all(...params);
      return { success: true, sessions };
    } catch (err) {
      return { success: false, message: err.message, sessions: [] };
    }
  });

  // 9. Get transactions with backend pagination and comprehensive filters
  ipcMain.handle('caisses:getTransactions', async (event, filters = {}) => {
    try {
      const {
        page = 1,
        limit = 15,
        caisse_id = 'all',
        type = 'all',
        category_id = 'all',
        datePreset = 'all',
        startDate = '',
        endDate = '',
        search = '',
        sortBy = 'date',
        sortOrder = 'DESC'
      } = filters;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 15);
      const offset = (pageNum - 1) * limitNum;

      const whereClauses = [];
      const params = [];

      // Caisse filter (specific caisse or all global caisses)
      if (caisse_id && caisse_id !== 'all') {
        whereClauses.push('(t.caisse_id = ? OR t.destination_caisse_id = ?)');
        params.push(Number(caisse_id), Number(caisse_id));
      }

      // Type filter
      if (type && type !== 'all') {
        if (type === 'in') {
          whereClauses.push("t.type IN ('in', 'transfer_in')");
        } else if (type === 'out') {
          whereClauses.push("t.type IN ('out', 'transfer_out')");
        } else if (type === 'transfer') {
          whereClauses.push("t.type IN ('transfer_in', 'transfer_out')");
        } else {
          whereClauses.push('t.type = ?');
          params.push(type);
        }
      }

      // Category filter
      if (category_id && category_id !== 'all') {
        whereClauses.push('t.category_id = ?');
        params.push(Number(category_id));
      }

      // Date range filters
      if (datePreset === 'today') {
        whereClauses.push("date(t.date) = date('now')");
      } else if (datePreset === 'yesterday') {
        whereClauses.push("date(t.date) = date('now', '-1 day')");
      } else if (datePreset === 'this_week') {
        whereClauses.push("date(t.date) >= date('now', 'weekday 0', '-7 days')");
      } else if (datePreset === 'this_month') {
        whereClauses.push("strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')");
      } else {
        if (startDate) {
          whereClauses.push('date(t.date) >= date(?)');
          params.push(startDate);
        }
        if (endDate) {
          whereClauses.push('date(t.date) <= date(?)');
          params.push(endDate);
        }
      }

      // Search filter
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        whereClauses.push('(t.description LIKE ? OR t.reference LIKE ? OR t.user_name LIKE ? OR c.name LIKE ?)');
        params.push(s, s, s, s);
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Count total matching transactions
      const countSql = `
        SELECT COUNT(*) as total 
        FROM caisse_transactions t
        LEFT JOIN caisses c ON t.caisse_id = c.id
        ${whereSql}
      `;
      const totalCount = db.prepare(countSql).get(...params).total;
      const totalPages = Math.ceil(totalCount / limitNum) || 1;

      // Safe column sorting
      const allowedSort = ['date', 'amount', 'id'];
      const actualSort = allowedSort.includes(sortBy) ? `t.${sortBy}` : 't.date';
      const actualOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Fetch paginated page
      const dataSql = `
        SELECT 
          t.*,
          c.name as caisse_name,
          c.code as caisse_code,
          dest.name as dest_caisse_name,
          cat.name as cat_name,
          cat.color as cat_color,
          cat.icon as cat_icon
        FROM caisse_transactions t
        LEFT JOIN caisses c ON t.caisse_id = c.id
        LEFT JOIN caisses dest ON t.destination_caisse_id = dest.id
        LEFT JOIN caisse_transaction_categories cat ON t.category_id = cat.id
        ${whereSql}
        ORDER BY ${actualSort} ${actualOrder}, t.id DESC
        LIMIT ? OFFSET ?
      `;

      const transactions = db.prepare(dataSql).all(...params, limitNum, offset);

      return {
        success: true,
        transactions,
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum
      };
    } catch (err) {
      console.error('Error in caisses:getTransactions:', err);
      return {
        success: false,
        message: err.message,
        transactions: [],
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 15
      };
    }
  });

  // 10. Create new transaction (In or Out)
  ipcMain.handle('caisses:createTransaction', async (event, data) => {
    try {
      const {
        caisse_id,
        type, // 'in' | 'out'
        amount,
        category_id = null,
        description,
        reference = '',
        payment_method = 'especes',
        user_name = 'Caissier',
        date = null
      } = data;

      const numAmount = Number(amount);
      if (!caisse_id) return { success: false, message: 'Veuillez sélectionner une caisse.' };
      if (isNaN(numAmount) || numAmount <= 0) return { success: false, message: 'Le montant doit être supérieur à zéro.' };
      if (!description || !description.trim()) return { success: false, message: 'Veuillez saisir une description.' };
      if (!['in', 'out'].includes(type)) return { success: false, message: 'Type de transaction invalide.' };

      const caisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(caisse_id);
      if (!caisse) return { success: false, message: 'Caisse introuvable.' };

      const now = date ? date : new Date().toISOString().replace('T', ' ').substring(0, 19);
      const ref = reference ? reference.trim() : ('TRX-' + Math.floor(10000 + Math.random() * 90000));

      let catName = 'Général';
      if (category_id) {
        const cat = db.prepare('SELECT name FROM caisse_transaction_categories WHERE id = ?').get(category_id);
        if (cat) catName = cat.name;
      }

      const txExec = db.transaction(() => {
        const newBalance = type === 'in' 
          ? caisse.current_balance + numAmount 
          : caisse.current_balance - numAmount;

        // Fetch active session if any
        const activeSess = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(caisse_id);
        const sessId = activeSess ? activeSess.id : null;

        // Insert transaction
        const res = db.prepare(`
          INSERT INTO caisse_transactions (
            caisse_id, session_id, type, amount, category_id, category_name, 
            reference, description, payment_method, date, user_name, balance_after
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          caisse_id, sessId, type, numAmount, category_id || null, catName,
          ref, description.trim(), payment_method, now, user_name, newBalance
        );

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          user_name, 
          `${type === 'in' ? 'Entrée' : 'Sortie'} de caisse #${caisse_id}: ${numAmount.toFixed(2)} (${description.trim()})`
        );

        return { id: res.lastInsertRowid, newBalance };
      });

      const result = txExec();
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');
      return { success: true, id: result.id, newBalance: result.newBalance };
    } catch (err) {
      console.error('Error creating transaction:', err);
      return { success: false, message: err.message };
    }
  });

  // 11. Inter-caisse cash transfer
  ipcMain.handle('caisses:transfer', async (event, data) => {
    try {
      const {
        from_caisse_id,
        to_caisse_id,
        amount,
        description = 'Transfert inter-caisse',
        reference = '',
        user_name = 'Responsable'
      } = data;

      const numAmount = Number(amount);
      if (!from_caisse_id || !to_caisse_id) return { success: false, message: 'Veuillez spécifier la caisse source et de destination.' };
      if (from_caisse_id === to_caisse_id) return { success: false, message: 'La caisse source et de destination doivent être différentes.' };
      if (isNaN(numAmount) || numAmount <= 0) return { success: false, message: 'Le montant du transfert doit être supérieur à zéro.' };

      const fromCaisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(from_caisse_id);
      const toCaisse = db.prepare('SELECT * FROM caisses WHERE id = ?').get(to_caisse_id);
      if (!fromCaisse || !toCaisse) return { success: false, message: 'L’une des caisses est introuvable.' };

      if (fromCaisse.current_balance < numAmount) {
        return { 
          success: false, 
          message: `Solde insuffisant dans "${fromCaisse.name}" (${fromCaisse.current_balance.toFixed(2)} DA disponibles, demandé: ${numAmount.toFixed(2)} DA).` 
        };
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const ref = reference ? reference.trim() : ('TRF-' + Math.floor(1000 + Math.random() * 9000));
      const transferCat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Transfert Inter-Caisse'").get();
      const catId = transferCat ? transferCat.id : null;

      const transferTx = db.transaction(() => {
        const fromBal = fromCaisse.current_balance - numAmount;
        const toBal = toCaisse.current_balance + numAmount;

        // Record debit on source caisse (SQLite trigger trg_caisse_transactions_ai auto-deducts)
        db.prepare(`
          INSERT INTO caisse_transactions (
            caisse_id, destination_caisse_id, type, amount, category_id, category_name, 
            reference, description, payment_method, date, user_name, balance_after
          )
          VALUES (?, ?, 'transfer_out', ?, ?, 'Transfert Inter-Caisse', ?, ?, 'especes', ?, ?, ?)
        `).run(
          from_caisse_id, to_caisse_id, numAmount, catId,
          ref, `Transfert vers ${toCaisse.name} - ${description}`, now, user_name, fromBal
        );

        // Record credit on destination caisse
        db.prepare(`
          INSERT INTO caisse_transactions (
            caisse_id, destination_caisse_id, type, amount, category_id, category_name, 
            reference, description, payment_method, date, user_name, balance_after
          )
          VALUES (?, ?, 'transfer_in', ?, ?, 'Transfert Inter-Caisse', ?, ?, 'especes', ?, ?, ?)
        `).run(
          to_caisse_id, from_caisse_id, numAmount, catId,
          ref, `Transfert depuis ${fromCaisse.name} - ${description}`, now, user_name, toBal
        );

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          user_name, 
          `Transfert de ${numAmount.toFixed(2)} DA de "${fromCaisse.name}" vers "${toCaisse.name}"`
        );
      });

      transferTx();
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');
      return { success: true };
    } catch (err) {
      console.error('Error in caisses:transfer:', err);
      return { success: false, message: err.message };
    }
  });

  // 12. Delete / cancel transaction
  ipcMain.handle('caisses:deleteTransaction', async (event, id) => {
    try {
      const tx = db.prepare('SELECT * FROM caisse_transactions WHERE id = ?').get(id);
      if (!tx) return { success: false, message: 'Transaction introuvable' };

      const deleteTx = db.transaction(() => {
        // SQLite trigger trg_caisse_transactions_ad automatically reverses caisses.current_balance!
        db.prepare('DELETE FROM caisse_transactions WHERE id = ?').run(id);
        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run('System', `Annulation transaction #${id} (${tx.type}: ${tx.amount} DA)`);
      });

      deleteTx();
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 13. Get all transaction categories
  ipcMain.handle('caisses:getCategories', async () => {
    try {
      const categories = db.prepare(`
        SELECT c.*, COUNT(t.id) as transaction_count
        FROM caisse_transaction_categories c
        LEFT JOIN caisse_transactions t ON c.id = t.category_id
        GROUP BY c.id
        ORDER BY c.is_system DESC, c.name ASC
      `).all();
      return { success: true, categories };
    } catch (err) {
      return { success: false, message: err.message, categories: [] };
    }
  });

  // 14. Create custom category
  ipcMain.handle('caisses:createCategory', async (event, data) => {
    try {
      const { name, type = 'both', color = '#16a34a', icon = 'tag', description = '' } = data;
      if (!name || !name.trim()) return { success: false, message: 'Le nom de la catégorie est obligatoire' };

      const check = db.prepare('SELECT id FROM caisse_transaction_categories WHERE LOWER(name) = LOWER(?)').get(name.trim());
      if (check) return { success: false, message: 'Une catégorie avec ce nom existe déjà.' };

      const stmt = db.prepare(`
        INSERT INTO caisse_transaction_categories (name, type, color, icon, is_system, description)
        VALUES (?, ?, ?, ?, 0, ?)
      `);
      const res = stmt.run(name.trim(), type, color, icon, description);
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 15. Update category (protected for system categories)
  ipcMain.handle('caisses:updateCategory', async (event, data) => {
    try {
      const { id, name, type, color, icon, description } = data;
      if (!id) return { success: false, message: 'ID manquant' };

      const existing = db.prepare('SELECT * FROM caisse_transaction_categories WHERE id = ?').get(id);
      if (!existing) return { success: false, message: 'Catégorie introuvable' };

      if (existing.is_system === 1) {
        // Protected: only color, icon, and description can be customized
        db.prepare(`
          UPDATE caisse_transaction_categories
          SET color = ?, icon = ?, description = ?
          WHERE id = ?
        `).run(color || existing.color, icon || existing.icon, description || existing.description, id);
      } else {
        // Custom: can rename and edit all fields
        db.prepare(`
          UPDATE caisse_transaction_categories
          SET name = ?, type = ?, color = ?, icon = ?, description = ?
          WHERE id = ?
        `).run(name.trim(), type, color, icon, description, id);
      }

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 16. Delete custom category
  ipcMain.handle('caisses:deleteCategory', async (event, id) => {
    try {
      const existing = db.prepare('SELECT * FROM caisse_transaction_categories WHERE id = ?').get(id);
      if (!existing) return { success: false, message: 'Catégorie introuvable' };

      if (existing.is_system === 1) {
        return { success: false, message: 'Cette catégorie système est protégée et ne peut pas être supprimée.' };
      }

      const txExec = db.transaction(() => {
        db.prepare('UPDATE caisse_transactions SET category_id = NULL WHERE category_id = ?').run(id);
        db.prepare('DELETE FROM caisse_transaction_categories WHERE id = ?').run(id);
      });

      txExec();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // 17. Direct SQL KPI & Statistics Dashboard (real-time live fetch, no cache)
  ipcMain.handle('caisses:getStats', async (event, filters = {}) => {
    try {
      const { caisse_id = 'all', datePreset = 'all', startDate = '', endDate = '' } = filters;

      // 1. Total Solde (all caisses or single caisse)
      let soldeSql = 'SELECT COALESCE(SUM(current_balance), 0) as total FROM caisses';
      let soldeParams = [];
      if (caisse_id && caisse_id !== 'all') {
        soldeSql = 'SELECT COALESCE(current_balance, 0) as total FROM caisses WHERE id = ?';
        soldeParams.push(caisse_id);
      }
      const totalSolde = db.prepare(soldeSql).get(...soldeParams).total;

      // 2. Build where filter for transactions
      const whereClauses = [];
      const params = [];

      if (caisse_id && caisse_id !== 'all') {
        whereClauses.push('(caisse_id = ? OR destination_caisse_id = ?)');
        params.push(Number(caisse_id), Number(caisse_id));
      }

      if (datePreset === 'today') {
        whereClauses.push("date(date) = date('now')");
      } else if (datePreset === 'yesterday') {
        whereClauses.push("date(date) = date('now', '-1 day')");
      } else if (datePreset === 'this_week') {
        whereClauses.push("date(date) >= date('now', 'weekday 0', '-7 days')");
      } else if (datePreset === 'this_month') {
        whereClauses.push("strftime('%Y-%m', date) = strftime('%Y-%m', 'now')");
      } else {
        if (startDate) {
          whereClauses.push('date(date) >= date(?)');
          params.push(startDate);
        }
        if (endDate) {
          whereClauses.push('date(date) <= date(?)');
          params.push(endDate);
        }
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Entrées
      const entreesSql = `
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
        FROM caisse_transactions 
        ${whereSql ? whereSql + " AND type IN ('in', 'transfer_in')" : "WHERE type IN ('in', 'transfer_in')"}
      `;
      const entreesData = db.prepare(entreesSql).get(...params);

      // Sorties
      const sortiesSql = `
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
        FROM caisse_transactions 
        ${whereSql ? whereSql + " AND type IN ('out', 'transfer_out')" : "WHERE type IN ('out', 'transfer_out')"}
      `;
      const sortiesData = db.prepare(sortiesSql).get(...params);

      // Total count
      const countSql = `SELECT COUNT(*) as count FROM caisse_transactions ${whereSql}`;
      const totalTxCount = db.prepare(countSql).get(...params).count;

      // Caisses open count
      const activeCaissesCount = db.prepare("SELECT COUNT(*) as c FROM caisses WHERE status = 'open'").get().c;
      const totalCaissesCount = db.prepare("SELECT COUNT(*) as c FROM caisses").get().c;

      // Today's summary (unconditional)
      const todayIn = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions 
        WHERE type IN ('in', 'transfer_in') AND date(date) = date('now')
        ${caisse_id && caisse_id !== 'all' ? 'AND (caisse_id = ' + Number(caisse_id) + ' OR destination_caisse_id = ' + Number(caisse_id) + ')' : ''}
      `).get().total;

      const todayOut = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM caisse_transactions 
        WHERE type IN ('out', 'transfer_out') AND date(date) = date('now')
        ${caisse_id && caisse_id !== 'all' ? 'AND (caisse_id = ' + Number(caisse_id) + ' OR destination_caisse_id = ' + Number(caisse_id) + ')' : ''}
      `).get().total;

      // Category breakdown
      const catBreakdownSql = `
        SELECT 
          cat.id, cat.name, cat.color, cat.type,
          COALESCE(SUM(t.amount), 0) as total_amount,
          COUNT(t.id) as count
        FROM caisse_transaction_categories cat
        LEFT JOIN caisse_transactions t ON cat.id = t.category_id ${whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ') : ''}
        GROUP BY cat.id
        HAVING total_amount > 0
        ORDER BY total_amount DESC
        LIMIT 8
      `;
      const categoryBreakdown = db.prepare(catBreakdownSql).all(...params);

      return {
        success: true,
        stats: {
          totalSolde,
          totalEntrees: entreesData.total,
          totalSorties: sortiesData.total,
          netCashFlow: entreesData.total - sortiesData.total,
          entreesCount: entreesData.count,
          sortiesCount: sortiesData.count,
          totalTransactions: totalTxCount,
          activeCaissesCount,
          totalCaissesCount,
          todayIn,
          todayOut,
          todayNet: todayIn - todayOut,
          categoryBreakdown
        }
      };
    } catch (err) {
      console.error('Error in caisses:getStats:', err);
      return { success: false, message: err.message, stats: {} };
    }
  });



  // ==========================================
  // VENTES (POS SALES) IPC HANDLERS
  // ==========================================

  // Create a complete sale atomically
  ipcMain.handle('ventes:create', async (event, data) => {
    try {
      const limitCheck = checkVenteLimit(db);
      if (!limitCheck.allowed) {
        return { success: false, message: limitCheck.error };
      }

      const {
        items,          // [{product_id, product_name, unit_name, quantity, cost_price, selling_price, discount_percent}]
        client_id,
        client_name,
        user_id,
        user_name,
        caisse_id,
        cash_received,
        notes
      } = data;

      if (!items || items.length === 0) return { success: false, message: 'Panier vide' };
      if (!user_id) return { success: false, message: 'Utilisateur non identifié' };

      // Validate stock availability first
      for (const item of items) {
        if (item.product_id) {
          const p = db.prepare('SELECT stock_quantity, name FROM products WHERE id = ?').get(item.product_id);
          const factor = parseFloat(item.conversion_factor) || 1;
          const reqQty = (parseFloat(item.quantity) || 0) * factor;
          if (p && p.stock_quantity < reqQty) {
            return { success: false, message: `Stock insuffisant pour ${p.name}: disponible ${p.stock_quantity}` };
          }
        }
      }

      // Generate sale number: V-YYYYMMDD-XXXX
      const datePart = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const countToday = db.prepare("SELECT COUNT(*) as c FROM ventes WHERE date(created_at) = date('now')").get().c;
      const saleNumber = `V-${datePart}-${String(countToday + 1).padStart(4,'0')}`;

      // Calculate totals
      let subtotal = 0, totalCost = 0, discountAmount = 0;
      const lines = items.map(item => {
        const sp = parseFloat(item.selling_price) || 0;
        const cp = parseFloat(item.cost_price) || 0;
        const qty = parseFloat(item.quantity) || 0;
        const disc = parseFloat(item.discount_percent) || 0;
        const factor = parseFloat(item.conversion_factor) || 1;
        const lineSubtotal = sp * qty;
        const lineDiscount = lineSubtotal * (disc / 100);
        const lineTotal = lineSubtotal - lineDiscount;
        const lineProfit = (sp - cp) * qty - lineDiscount;
        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        totalCost += cp * qty;
        return { ...item, sp, cp, qty, disc, factor, lineTotal, lineProfit };
      });

      const totalAmount = subtotal - discountAmount;
      const grossProfit = totalAmount - totalCost;
      const cashRcv = parseFloat(cash_received) || 0;
      const creditAmount = Math.max(0, totalAmount - cashRcv);
      const changeReturned = Math.max(0, cashRcv - totalAmount);
      const paymentStatus = creditAmount <= 0 ? 'paye' : cashRcv > 0 ? 'partiel' : 'credit';

      // Ensure a registered client for credit sales
      let resolvedClientId = client_id || null;
      let resolvedClientName = client_name || 'Client Anonyme';
      if (creditAmount > 0 && !resolvedClientId) {
        return { success: false, message: 'Un client enregistré est requis pour une vente à crédit' };
      }

      // 1. Resolve caisse for each line based on product/service type caisse config
      const defaultCaisse = db.prepare('SELECT id FROM caisses WHERE is_default = 1 LIMIT 1').get() || db.prepare('SELECT id FROM caisses LIMIT 1').get();
      const defaultCaisseId = defaultCaisse ? defaultCaisse.id : null;

      // Load service caisse assignments (flexy & photocopie)
      const serviceCaissesRow = db.prepare("SELECT value FROM app_settings WHERE key = 'service_caisses'").get();
      const serviceCaisses = serviceCaissesRow ? (() => { try { return JSON.parse(serviceCaissesRow.value); } catch { return {}; } })() : {};
      const flexyCaisseId = serviceCaisses.flexy_caisse_id ? Number(serviceCaisses.flexy_caisse_id) : null;
      const photocopieCaisseId = serviceCaisses.photocopie_caisse_id ? Number(serviceCaisses.photocopie_caisse_id) : null;

      // Group line totals by caisse_id — each line routes to its designated caisse
      const caisseTotals = {}; // caisse_id -> lineTotal sum
      for (const line of lines) {
        let lineCaisseId = null;
        // Service lines: flexy => flexy caisse, photocopie => photocopie caisse
        if (line.service_type === 'flexy' || line.operator ||
            (line.product_name && line.product_name.toLowerCase().startsWith('flexy'))) {
          lineCaisseId = flexyCaisseId;
        } else if (line.service_type === 'photocopie' ||
                   (line.product_name && /(photocopie|impression|scan|plastification)/i.test(line.product_name))) {
          lineCaisseId = photocopieCaisseId;
        } else if (line.product_id) {
          // Regular product: use its own configured caisse
          const p = db.prepare('SELECT caisse_id FROM products WHERE id = ?').get(line.product_id);
          if (p && p.caisse_id) lineCaisseId = p.caisse_id;
        }
        if (!lineCaisseId) lineCaisseId = defaultCaisseId;
        line.caisse_id = lineCaisseId;
        if (lineCaisseId) {
          caisseTotals[lineCaisseId] = (caisseTotals[lineCaisseId] || 0) + line.lineTotal;
        }
      }

      // Primary caisse for the sale header: passed caisse_id, or the caisse with highest share, or default
      let resolvedCaisseId = caisse_id ? Number(caisse_id) : null;
      if (!resolvedCaisseId) {
        const sorted = Object.keys(caisseTotals).sort((a, b) => caisseTotals[b] - caisseTotals[a]);
        resolvedCaisseId = sorted.length > 0 ? Number(sorted[0]) : defaultCaisseId;
      }

      // Atomic transaction
      const result = db.transaction(() => {
        // Insert vente
        const vRes = db.prepare(`
          INSERT INTO ventes (sale_number, client_id, client_name, user_id, user_name, caisse_id,
            subtotal, discount_amount, total_amount, total_cost, gross_profit,
            cash_received, change_returned, credit_amount, payment_status, sale_status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
        `).run(saleNumber, resolvedClientId, resolvedClientName, user_id, user_name, resolvedCaisseId,
          subtotal, discountAmount, totalAmount, totalCost, grossProfit,
          cashRcv, changeReturned, creditAmount, paymentStatus, notes || '');

        const venteId = vRes.lastInsertRowid;

        // Insert sale lines + update stock
        for (const line of lines) {
          db.prepare(`
            INSERT INTO vente_lignes (vente_id, product_id, product_name, unit_name, quantity, conversion_factor,
              cost_price_snapshot, selling_price_snapshot, discount_percent, line_total, line_profit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(venteId, line.product_id || null, line.product_name, line.unit_name || 'piece',
            line.qty, line.factor, line.cp, line.sp, line.disc, line.lineTotal, line.lineProfit);

          // Decrease stock in base unit
          if (line.product_id) {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?')
              .run(line.qty * line.factor, line.product_id);
          }

          // Flexy transaction logging & balance tracking for POS sale items
          if (line.service_type === 'flexy' || line.operator || (line.product_name && line.product_name.toLowerCase().startsWith('flexy'))) {
            try {
              const operator = (line.operator || (line.product_name.toLowerCase().includes('djezzy') ? 'djezzy' : line.product_name.toLowerCase().includes('ooredoo') ? 'ooredoo' : line.product_name.toLowerCase().includes('idoom') ? 'idoom' : 'mobilis')).toLowerCase();
              const phone = line.phone_number || '';
              const amount = parseFloat(line.amount || line.lineTotal || (line.sp * line.qty) || 0);
              const commission = parseFloat(line.commission || 0);
              const sellingPrice = parseFloat(line.selling_price || line.sp || amount);
              // Use the line's resolved caisse_id (already set to flexyCaisseId or default above)
              const flexyLineCaisseId = line.caisse_id || resolvedCaisseId;
              
              db.prepare(`
                INSERT INTO flexy_transactions (
                  operator, phone_number, amount, commission, selling_price, status,
                  transaction_ref, vente_id, caisse_id, user_id, user_name, notes
                ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)
              `).run(
                operator,
                phone,
                amount,
                commission,
                sellingPrice,
                `POS-${saleNumber}`,
                venteId,
                flexyLineCaisseId,
                user_id,
                user_name,
                `Vente POS #${saleNumber}`
              );

              // Auto-deduct from operator SIM balance
              const balancesRow = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_sim_balances'").get();
              if (balancesRow && balancesRow.value) {
                try {
                  const balances = JSON.parse(balancesRow.value);
                  const opKey = operator.toLowerCase();
                  if (typeof balances[opKey] === 'number') {
                    balances[opKey] = Math.max(0, balances[opKey] - amount);
                    db.prepare("UPDATE app_settings SET value = ? WHERE key = 'flexy_sim_balances'").run(JSON.stringify(balances));
                  }
                } catch {}
              }
            } catch (errFlexy) {
              console.warn('[Vente] Error logging flexy transaction:', errFlexy.message);
            }
          }
        }

        // Multi-Caisse Cash Distribution:
        // Each product in the cart credits its own specific caisse!
        if (cashRcv > 0 && totalAmount > 0) {
          const caisseEntries = Object.entries(caisseTotals);
          let distributedCash = 0;

          caisseEntries.forEach(([cIdStr, caisseAmount], index) => {
            const cId = Number(cIdStr);
            let caisseCashShare = 0;
            if (index === caisseEntries.length - 1) {
              caisseCashShare = Math.round((cashRcv - distributedCash) * 100) / 100;
            } else {
              caisseCashShare = Math.round(((caisseAmount / totalAmount) * cashRcv) * 100) / 100;
              distributedCash += caisseCashShare;
            }

            if (caisseCashShare > 0) {
              const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(cId);
              const sessId = activeSession ? activeSession.id : null;
              const cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Vente Comptoir'").get();
              const catId = cat ? cat.id : null;

              // Insert into caisse_transactions:
              // The SQLite trigger 'trg_caisse_transactions_ai' will automatically update caisses.current_balance!
              db.prepare(`
                INSERT INTO caisse_transactions (
                  caisse_id, session_id, type, amount, category_id, category_name,
                  reference, description, payment_method, date, user_id, user_name
                )
                VALUES (?, ?, 'in', ?, ?, 'Vente Comptoir', ?, ?, 'especes', date('now'), ?, ?)
              `).run(
                cId,
                sessId,
                caisseCashShare,
                catId,
                `VT-${saleNumber}`,
                `Vente ${saleNumber} (${caisseAmount.toFixed(2)} DA)`,
                user_id,
                user_name
              );
            }
          });
        }

        // Client Debt:
        // Inserting into client_debts automatically fires the SQLite trigger 'trg_client_debts_ai',
        // which updates clients.current_debt cleanly and accurately!
        if (creditAmount > 0 && resolvedClientId) {
          db.prepare(`
            INSERT INTO client_debts (
              client_id, product_id, product_name, unit_name, quantity, conversion_factor,
              unit_price, total_amount, paid_amount, remaining_amount, date, caisse_id,
              notes, status
            )
            VALUES (?, NULL, ?, 'vente', 1, 1, ?, ?, ?, ?, date('now'), ?, ?, 'unpaid')
          `).run(
            resolvedClientId,
            `Vente ${saleNumber} (${items.length} art.)`,
            totalAmount,
            totalAmount,
            cashRcv,
            creditAmount,
            resolvedCaisseId,
            notes || `Vente POS à crédit ${saleNumber}`
          );
        }

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(user_name, `Vente ${saleNumber}: ${totalAmount.toFixed(2)} DA`);
        return { venteId, saleNumber };
      })();

      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('clients:');
      appCache.delByPrefix('dashboard:');

      return { success: true, id: result.venteId, saleNumber: result.saleNumber, totalAmount, cashRcv, changeReturned, creditAmount };
    } catch (err) {
      console.error('Error creating vente:', err);
      return { success: false, message: err.message };
    }
  });

  // Get all ventes with filters
  ipcMain.handle('ventes:getAll', async (event, filters = {}) => {
    try {
      const { search = '', client_id, user_id, payment_status = 'all', date_from, date_to, page = 1, pageSize = 20 } = filters;
      let where = []; let params = [];

      if (search) { where.push('(v.sale_number LIKE ? OR v.client_name LIKE ? OR v.user_name LIKE ?)'); const s = `%${search}%`; params.push(s,s,s); }
      if (client_id && client_id !== 'all') { where.push('v.client_id = ?'); params.push(client_id); }
      if (user_id && user_id !== 'all') { where.push('v.user_id = ?'); params.push(user_id); }
      if (payment_status && payment_status !== 'all') { where.push('v.payment_status = ?'); params.push(payment_status); }
      if (date_from) { where.push("date(v.created_at) >= date(?)"); params.push(date_from); }
      if (date_to) { where.push("date(v.created_at) <= date(?)"); params.push(date_to); }

      const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const total = db.prepare(`SELECT COUNT(*) as c FROM ventes v ${whereStr}`).get(...params).c;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;

      const stats = db.prepare(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(v.total_amount), 0) as total_amount_sum,
          COALESCE(SUM(v.cash_received), 0) as cash_received_sum,
          COALESCE(SUM(v.credit_amount), 0) as credit_amount_sum,
          COALESCE(SUM(v.gross_profit), 0) as gross_profit_sum
        FROM ventes v
        LEFT JOIN clients c ON v.client_id = c.id
        ${whereStr}
      `).get(...params);

      const ventes = db.prepare(`
        SELECT v.*, c.name as client_full_name
        FROM ventes v
        LEFT JOIN clients c ON v.client_id = c.id
        ${whereStr}
        ORDER BY v.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset);

      return { success: true, ventes, total, totalPages, page, stats };
    } catch (err) { return { success: false, message: err.message, ventes: [], total: 0, totalPages: 1, page: 1 }; }
  });

  // Get single vente with lines
  ipcMain.handle('ventes:getById', async (event, id) => {
    try {
      const vente = db.prepare(`
        SELECT v.*, c.name as client_full_name, c.phone as client_phone, c.current_debt as client_debt
        FROM ventes v 
        LEFT JOIN clients c ON v.client_id = c.id 
        WHERE v.id = ?
      `).get(id);
      if (!vente) return { success: false, message: 'Vente introuvable' };
      const lignes = db.prepare('SELECT vl.*, p.barcode as product_barcode FROM vente_lignes vl LEFT JOIN products p ON vl.product_id = p.id WHERE vl.vente_id = ? ORDER BY vl.id ASC').all(id);
      const paiements = db.prepare('SELECT * FROM vente_paiements WHERE vente_id = ? ORDER BY created_at ASC').all(id);
      return { success: true, vente, lignes, paiements };
    } catch (err) { return { success: false, message: err.message }; }
  });

  // Delete vente (restore everything: stock, caisse, transactions, client debts, payments)
  ipcMain.handle('ventes:delete', async (event, data) => {
    try {
      const id = typeof data === 'object' && data !== null ? data.id : data;
      const userName = (typeof data === 'object' && data !== null && data.user_name) ? data.user_name : 'Admin';

      const vente = db.prepare('SELECT * FROM ventes WHERE id = ?').get(id);
      if (!vente) return { success: false, message: 'Vente introuvable' };
      const lignes = db.prepare('SELECT * FROM vente_lignes WHERE vente_id = ?').all(id);

      db.transaction(() => {
        // 1. Restore product stock
        for (const ligne of lignes) {
          if (ligne.product_id) {
            const factor = parseFloat(ligne.conversion_factor) || 1;
            const qtyToRestore = (parseFloat(ligne.quantity) || 0) * factor;
            if (qtyToRestore > 0) {
              db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(qtyToRestore, ligne.product_id);
            }
          }
        }

        // 2. Delete and reverse related caisse transactions
        // Note: SQLite trigger 'trg_caisse_transactions_ad' will automatically reverse current_balance on each corresponding caisse!
        const relatedCaisseTx = db.prepare(`
          SELECT * FROM caisse_transactions 
          WHERE reference = ? OR reference = ? OR description LIKE ?
        `).all(`VT-${vente.sale_number}`, vente.sale_number, `%${vente.sale_number}%`);

        if (relatedCaisseTx.length > 0) {
          db.prepare(`
            DELETE FROM caisse_transactions 
            WHERE reference = ? OR reference = ? OR description LIKE ?
          `).run(`VT-${vente.sale_number}`, vente.sale_number, `%${vente.sale_number}%`);
        } else if (vente.cash_received > 0 && vente.caisse_id) {
          // Direct fallback if no caisse_transactions records existed
          const caisse = db.prepare('SELECT current_balance FROM caisses WHERE id = ?').get(vente.caisse_id);
          const newBal = Math.max(0, (caisse?.current_balance || 0) - vente.cash_received);
          db.prepare('UPDATE caisses SET current_balance = ? WHERE id = ?').run(newBal, vente.caisse_id);
        }

        // 3. Delete and reverse client debt
        // Note: SQLite trigger 'trg_client_debts_ad' will automatically reverse current_debt on the client!
        const relatedDebts = db.prepare(`
          SELECT * FROM client_debts 
          WHERE (product_name LIKE ? OR notes LIKE ?) AND (client_id = ? OR ? IS NULL)
        `).all(`%${vente.sale_number}%`, `%${vente.sale_number}%`, vente.client_id, vente.client_id);

        if (relatedDebts.length > 0) {
          db.prepare(`
            DELETE FROM client_debts 
            WHERE (product_name LIKE ? OR notes LIKE ?) AND (client_id = ? OR ? IS NULL)
          `).run(`%${vente.sale_number}%`, `%${vente.sale_number}%`, vente.client_id, vente.client_id);
        } else if (vente.credit_amount > 0 && vente.client_id) {
          // Fallback if no client_debts row existed
          db.prepare('UPDATE clients SET current_debt = MAX(0, current_debt - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(vente.credit_amount, vente.client_id);
        }

        // 4. Delete flexy_transactions linked to this vente & restore SIM balances
        const linkedFlexy = db.prepare('SELECT * FROM flexy_transactions WHERE vente_id = ?').all(id);
        if (linkedFlexy.length > 0) {
          // Restore each operator SIM balance
          const balancesRow2 = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_sim_balances'").get();
          if (balancesRow2) {
            try {
              const bals = JSON.parse(balancesRow2.value);
              for (const ft of linkedFlexy) {
                const opk = (ft.operator || '').toLowerCase();
                if (typeof bals[opk] === 'number') bals[opk] += parseFloat(ft.amount) || 0;
              }
              db.prepare("UPDATE app_settings SET value = ? WHERE key = 'flexy_sim_balances'").run(JSON.stringify(bals));
            } catch {}
          }
          db.prepare('DELETE FROM flexy_transactions WHERE vente_id = ?').run(id);
        }

        // 5. Delete payments and lines
        db.prepare('DELETE FROM vente_paiements WHERE vente_id = ?').run(id);
        db.prepare('DELETE FROM vente_lignes WHERE vente_id = ?').run(id);

        // 6. Delete the vente
        db.prepare('DELETE FROM ventes WHERE id = ?').run(id);

        // 7. Audit log
        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(userName, `Suppression vente ${vente.sale_number} (${vente.total_amount.toFixed(2)} DA)`);
      })();

      appCache.del('products:pos_all');
      appCache.delByPrefix('products:page');
      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('clients:');
      appCache.delByPrefix('dashboard:');

      return { success: true };
    } catch (err) {
      console.error('Error deleting vente:', err);
      return { success: false, message: err.message };
    }
  });

  // Add partial payment to existing credit sale
  ipcMain.handle('ventes:addPaiement', async (event, data) => {
    try {
      const { vente_id, amount, user_id, user_name, caisse_id, notes } = data;
      const vente = db.prepare('SELECT * FROM ventes WHERE id = ?').get(vente_id);
      if (!vente) return { success: false, message: 'Vente introuvable' };
      const pmt = parseFloat(amount);
      if (isNaN(pmt) || pmt <= 0) return { success: false, message: 'Montant invalide' };
      if (pmt > vente.credit_amount) return { success: false, message: `Montant dépasse le crédit restant: ${vente.credit_amount} DA` };

      db.transaction(() => {
        const newCredit = Math.max(0, vente.credit_amount - pmt);
        const newCashRcv = vente.cash_received + pmt;
        const newStatus = newCredit <= 0 ? 'paye' : 'partiel';
        db.prepare('UPDATE ventes SET credit_amount=?, cash_received=?, payment_status=? WHERE id=?').run(newCredit, newCashRcv, newStatus, vente_id);
        db.prepare(`INSERT INTO vente_paiements (vente_id, client_id, amount, payment_date, user_id, user_name, notes) VALUES (?,?,?,date('now'),?,?,?)`).run(vente_id, vente.client_id, pmt, user_id, user_name, notes || '');

        // Update caisse
        if (caisse_id) {
          const caisse = db.prepare('SELECT current_balance FROM caisses WHERE id = ?').get(caisse_id);
          const balAfter = (caisse?.current_balance || 0) + pmt;
          db.prepare(`INSERT INTO caisse_transactions (caisse_id, type, amount, description, date, user_id, user_name, balance_after) VALUES (?, 'in', ?, ?, date('now'), ?, ?, ?)`).run(caisse_id, pmt, `Paiement crédit ${vente.sale_number}`, user_id, user_name, balAfter);
          db.prepare('UPDATE caisses SET current_balance = ? WHERE id = ?').run(balAfter, caisse_id);
        }

        // Update client debt
        if (vente.client_id) {
          db.prepare('UPDATE clients SET current_debt = MAX(0, current_debt - ?) WHERE id = ?').run(pmt, vente.client_id);
        }
        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(user_name, `Paiement crédit ${vente.sale_number}: ${pmt} DA`);
      })();

      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('clients:');
      appCache.delByPrefix('dashboard:');

      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  });

  // -------------------------------------------------------------
  // HIGH-PERFORMANCE PRECOMPUTED STATISTICS & DASHBOARD (TRIGGERS + SUMMARY TABLES)
  // -------------------------------------------------------------
  const fetchStatsDashboard = async (filters = {}) => {
    try {
      const { date_from, date_to } = filters;
      let dateWhere = '';
      let params = [];
      if (date_from && date_to) {
        dateWhere = "WHERE date BETWEEN date(?) AND date(?)";
        params = [date_from, date_to];
      } else if (date_from) {
        dateWhere = "WHERE date >= date(?)";
        params = [date_from];
      } else {
        dateWhere = "WHERE date = date('now')";
      }

      // 1. Precomputed Global KPIs from stats_daily_sales
      const salesKpi = db.prepare(`
        SELECT
          COALESCE(SUM(sales_count), 0) as nb_ventes,
          COALESCE(SUM(completed_count), 0) as nb_completed,
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(discount_amount), 0) as total_discount,
          COALESCE(SUM(total_revenue), 0) as total_ca,
          COALESCE(SUM(total_cogs), 0) as total_cout,
          COALESCE(SUM(gross_profit), 0) as total_profit,
          COALESCE(SUM(cash_received), 0) as total_cash,
          COALESCE(SUM(credit_amount), 0) as total_credit,
          CASE WHEN SUM(completed_count) > 0 THEN ROUND(SUM(total_revenue) / SUM(completed_count), 2) ELSE 0 END as panier_moyen,
          CASE WHEN SUM(total_revenue) > 0 THEN ROUND((SUM(gross_profit) / SUM(total_revenue)) * 100, 2) ELSE 0 END as margin_rate
        FROM stats_daily_sales
        ${dateWhere}
      `).get(...params) || {
        nb_ventes: 0, nb_completed: 0, subtotal: 0, total_discount: 0,
        total_ca: 0, total_cout: 0, total_profit: 0, total_cash: 0, total_credit: 0,
        panier_moyen: 0, margin_rate: 0
      };

      // 2. Precomputed Daily Trend for charts from stats_daily_sales
      const dailyTrend = db.prepare(`
        SELECT
          date,
          sales_count,
          completed_count,
          total_revenue,
          total_cogs,
          gross_profit,
          cash_received,
          credit_amount
        FROM stats_daily_sales
        ${dateWhere}
        ORDER BY date ASC
      `).all(...params);

      // 3. Precomputed Performance by User / Cashier from stats_daily_users
      const byUser = db.prepare(`
        SELECT
          user_id,
          user_name,
          COALESCE(SUM(sales_count), 0) as nb_ventes,
          COALESCE(SUM(revenue), 0) as ca,
          COALESCE(SUM(gross_profit), 0) as profit,
          COALESCE(SUM(cash_collected), 0) as cash,
          COALESCE(SUM(credit_issued), 0) as credit
        FROM stats_daily_users
        ${dateWhere}
        GROUP BY user_id
        ORDER BY ca DESC
        LIMIT 15
      `).all(...params);

      // 4. Precomputed Top Products from stats_daily_products
      const byProduct = db.prepare(`
        SELECT
          sp.product_id,
          sp.product_name,
          COALESCE(c.name, 'Sans catégorie') as category_name,
          COALESCE(SUM(sp.quantity_sold), 0) as qty_sold,
          COALESCE(SUM(sp.revenue), 0) as ca,
          COALESCE(SUM(sp.cogs), 0) as cout,
          COALESCE(SUM(sp.gross_profit), 0) as profit,
          CASE WHEN SUM(sp.revenue) > 0 THEN ROUND((SUM(sp.gross_profit) / SUM(sp.revenue)) * 100, 1) ELSE 0 END as margin_percent
        FROM stats_daily_products sp
        LEFT JOIN categories c ON sp.category_id = c.id
        ${dateWhere}
        GROUP BY sp.product_id
        ORDER BY ca DESC
        LIMIT 20
      `).all(...params);

      // 5. Precomputed Caisse Cash Movements from stats_daily_caisses
      const byCaisse = db.prepare(`
        SELECT
          sc.caisse_id,
          c.name as caisse_name,
          c.current_balance as current_balance,
          COALESCE(SUM(sc.total_in), 0) as total_in,
          COALESCE(SUM(sc.total_out), 0) as total_out,
          COALESCE(SUM(sc.net_change), 0) as net_change,
          COALESCE(SUM(sc.transaction_count), 0) as transaction_count
        FROM stats_daily_caisses sc
        JOIN caisses c ON sc.caisse_id = c.id
        ${dateWhere}
        GROUP BY sc.caisse_id
        ORDER BY total_in DESC
      `).all(...params);

      // 6. Precomputed Client Credit Summary from stats_daily_credits
      const creditSummary = db.prepare(`
        SELECT
          COALESCE(SUM(credit_issued), 0) as credit_issued,
          COALESCE(SUM(credit_repaid), 0) as credit_repaid,
          COALESCE(SUM(new_debts_count), 0) as new_debts_count,
          COALESCE(SUM(payments_count), 0) as payments_count,
          COALESCE(SUM(credit_issued) - SUM(credit_repaid), 0) as net_credit_change
        FROM stats_daily_credits
        ${dateWhere}
      `).get(...params) || {
        credit_issued: 0, credit_repaid: 0, new_debts_count: 0, payments_count: 0, net_credit_change: 0
      };

      // 7. Precomputed Employee Summary from stats_daily_employees
      const employeeSummary = db.prepare(`
        SELECT
          COALESCE(SUM(total_advances), 0) as total_advances,
          COALESCE(SUM(total_salaries), 0) as total_salaries,
          COALESCE(SUM(total_paid), 0) as total_paid
        FROM stats_daily_employees
        ${dateWhere}
      `).get(...params) || {
        total_advances: 0, total_salaries: 0, total_paid: 0
      };

      // 8. Precomputed Inventory Valuation from stats_inventory_summary
      const inventory = db.prepare('SELECT * FROM stats_inventory_summary WHERE id = 1').get() || {
        total_items_count: 0,
        total_units_stock: 0,
        total_inventory_valuation_cost: 0,
        total_inventory_valuation_selling: 0,
        potential_margin: 0,
        low_stock_count: 0,
        out_of_stock_count: 0
      };

      // 9. Authoritative Live Ledgers (Real-time balances that must never be cached)
      const liveCash = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total_cash FROM caisses').get().total_cash;
      const liveCredit = db.prepare('SELECT COALESCE(SUM(current_debt), 0) as total_debt FROM clients').get().total_debt;
      const countDebtors = db.prepare('SELECT COUNT(*) as count FROM clients WHERE current_debt > 0').get().count;

      // 10. Last reconciliation timestamp
      const lastRecon = db.prepare('SELECT created_at, status FROM stats_reconciliation_logs ORDER BY id DESC LIMIT 1').get();

      return {
        success: true,
        kpi: salesKpi,
        dailyTrend,
        byUser,
        byProduct,
        byCaisse,
        creditSummary,
        employeeSummary,
        inventory,
        authoritative: {
          liveTotalCash: liveCash,
          liveTotalCredit: liveCredit,
          activeDebtorsCount: countDebtors
        },
        totalClientCredit: liveCredit, // backward compatibility
        lastUpdated: new Date().toISOString(),
        lastReconciliation: lastRecon || null
      };
    } catch (err) {
      console.error('Error in fetchStatsDashboard:', err);
      return { success: false, message: err.message };
    }
  };

  // Primary IPC Handler for Stats Dashboard
  ipcMain.handle('stats:getDashboard', async (event, filters = {}) => {
    return await fetchStatsDashboard(filters);
  });

  // Backward compatibility alias for ventes dashboard
  ipcMain.handle('ventes:getDashboard', async (event, filters = {}) => {
    return await fetchStatsDashboard(filters);
  });

  // Admin Self-Healing & Reconciliation Procedure
  ipcMain.handle('stats:reconcile', async (event, params = {}) => {
    try {
      const user = params.user_name || 'Admin';
      const result = reconcileStats(db, {
        date_from: params.date_from || null,
        date_to: params.date_to || null,
        user_name: user
      });

      appCache.delByPrefix('dashboard:');

      db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
        user,
        `Réconciliation des statistiques exécutée (Plage: ${params.date_from || 'Début'} à ${params.date_to || 'Fin'})`
      );

      return { success: true, ...result };
    } catch (err) {
      console.error('Error in stats:reconcile:', err);
      return { success: false, message: err.message };
    }
  });

  // Get Reconciliation Audit Logs
  ipcMain.handle('stats:getReconciliationLogs', async () => {
    try {
      const logs = db.prepare('SELECT * FROM stats_reconciliation_logs ORDER BY id DESC LIMIT 30').all();
      return { success: true, logs };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // ==========================================
  // MULTI-SERVICES & FLEXY API HANDLERS
  // ==========================================

  // Flexy API Dispatcher Helper
  async function callFlexyApi(apiConfig, data) {
    if (!apiConfig || !apiConfig.enabled || !apiConfig.apiUrl) {
      return { success: false, message: 'API Flexy non activée ou URL manquante' };
    }
    try {
      const res = await fetch(apiConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiConfig.apiKey ? { 'Authorization': `Bearer ${apiConfig.apiKey}`, 'X-API-Key': apiConfig.apiKey } : {})
        },
        body: JSON.stringify({
          operator: data.operator,
          phone: data.phone,
          amount: data.amount,
          pin: apiConfig.pin || undefined,
          reference: data.transactionRef || `FLX-${Date.now()}`
        }),
        signal: AbortSignal.timeout(10000)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, status: res.status, message: json?.message || `Erreur API HTTP ${res.status}`, data: json };
      }
      return { success: true, message: 'Recharge API réussie', data: json };
    } catch (err) {
      return { success: false, message: `Échec appel API: ${err.message}` };
    }
  }

  // Services: Get Settings (Tarifs, Balances, API Config, Service Caisses)
  ipcMain.handle('services:getSettings', async () => {
    try {
      const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('services_tarifs', 'flexy_sim_balances', 'flexy_api_config', 'service_caisses')").all();
      const settings = {};
      for (const r of rows) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      }
      const defaultTarifs = {
        photocopie_nb: 10,
        photocopie_color: 30,
        photocopie_rv_nb: 15,
        photocopie_rv_color: 50,
        impression_doc: 20,
        scan_doc: 20,
        plastification: 50,
        flexy_commission_fixed: 0,
        flexy_commission_percent: 0
      };
      const defaultBalances = {
        mobilis: 25000,
        djezzy: 20000,
        ooredoo: 20000
      };
      const defaultApiConfig = {
        enabled: false,
        provider: 'custom',
        apiUrl: 'https://api.flexy-gateway.local/v1/recharge',
        apiKey: '',
        apiSecret: '',
        pin: '',
        autoSend: false
      };
      const defaultServiceCaisses = { flexy_caisse_id: null, photocopie_caisse_id: null };

      return {
        success: true,
        tarifs: settings.services_tarifs || defaultTarifs,
        balances: settings.flexy_sim_balances || defaultBalances,
        apiConfig: settings.flexy_api_config || defaultApiConfig,
        serviceCaisses: settings.service_caisses || defaultServiceCaisses
      };
    } catch (err) {
      console.error('Error fetching services settings:', err);
      return { success: false, message: err.message };
    }
  });

  // Services: Save Settings
  ipcMain.handle('services:saveSettings', async (event, { tarifs, balances, apiConfig, serviceCaisses }) => {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
      const saveTx = db.transaction(() => {
        if (tarifs !== undefined) {
          stmt.run('services_tarifs', JSON.stringify(tarifs));
        }
        if (balances !== undefined) {
          stmt.run('flexy_sim_balances', JSON.stringify(balances));
        }
        if (apiConfig !== undefined) {
          stmt.run('flexy_api_config', JSON.stringify(apiConfig));
        }
        if (serviceCaisses !== undefined) {
          stmt.run('service_caisses', JSON.stringify(serviceCaisses));
        }
      });
      saveTx();
      return { success: true, message: 'Paramètres services enregistrés' };
    } catch (err) {
      console.error('Error saving services settings:', err);
      return { success: false, message: err.message };
    }
  });

  // Services: Update SIM Balance
  ipcMain.handle('services:updateSimBalance', async (event, { operator, amount, mode = 'add' }) => {
    try {
      const opKey = (operator || '').toLowerCase();
      if (!['mobilis', 'djezzy', 'ooredoo', 'idoom'].includes(opKey)) {
        return { success: false, message: 'Opérateur invalide' };
      }
      const val = parseFloat(amount) || 0;
      const row = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_sim_balances'").get();
      const balances = row ? JSON.parse(row.value) : { mobilis: 0, djezzy: 0, ooredoo: 0 };
      
      if (mode === 'add') {
        balances[opKey] = (balances[opKey] || 0) + val;
      } else {
        balances[opKey] = val;
      }
      
      db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('flexy_sim_balances', ?)").run(JSON.stringify(balances));
      return { success: true, balances };
    } catch (err) {
      console.error('Error updating SIM balance:', err);
      return { success: false, message: err.message };
    }
  });

  // Services: Record Standalone Flexy Recharge
  ipcMain.handle('services:recordFlexy', async (event, data) => {
    try {
      const {
        operator,
        phone_number,
        amount,
        commission = 0,
        selling_price,
        affect_caisse = true,
        caisse_id = null,
        user_id = null,
        user_name = 'Admin',
        notes = ''
      } = data;

      const amt = parseFloat(amount) || 0;
      const comm = parseFloat(commission) || 0;
      const sp = parseFloat(selling_price) || (amt + comm);

      if (amt <= 0) return { success: false, message: 'Montant invalide' };
      if (!operator) return { success: false, message: 'Opérateur requis' };

      const opKey = operator.toLowerCase();
      const ref = `FLX-${Date.now().toString().slice(-6)}`;

      let targetCaisseId = caisse_id ? Number(caisse_id) : null;
      if (!targetCaisseId && affect_caisse) {
        // Try configured flexy caisse first, then default
        const scRow = db.prepare("SELECT value FROM app_settings WHERE key = 'service_caisses'").get();
        const sc = scRow ? (() => { try { return JSON.parse(scRow.value); } catch { return {}; } })() : {};
        if (sc.flexy_caisse_id) {
          targetCaisseId = Number(sc.flexy_caisse_id);
        } else {
          const def = db.prepare('SELECT id FROM caisses WHERE is_default = 1 LIMIT 1').get() || db.prepare('SELECT id FROM caisses LIMIT 1').get();
          if (def) targetCaisseId = def.id;
        }
      }

      // Check external API config
      let apiResult = null;
      const apiRow = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_api_config'").get();
      let apiConfig = apiRow ? JSON.parse(apiRow.value) : null;
      if (apiConfig && apiConfig.enabled && apiConfig.autoSend) {
        apiResult = await callFlexyApi(apiConfig, {
          operator: opKey,
          phone: phone_number,
          amount: amt,
          transactionRef: ref
        });
      }

      const txResult = db.transaction(() => {
        // Insert flexy transaction
        const res = db.prepare(`
          INSERT INTO flexy_transactions (
            operator, phone_number, amount, commission, selling_price, status,
            transaction_ref, api_response, caisse_id, user_id, user_name, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          opKey,
          phone_number || '',
          amt,
          comm,
          sp,
          apiResult ? (apiResult.success ? 'completed' : 'failed') : 'completed',
          ref,
          apiResult ? JSON.stringify(apiResult) : null,
          targetCaisseId,
          user_id,
          user_name,
          notes || 'Recharge directe Flexy'
        );

        // Deduct from SIM balance
        const balancesRow = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_sim_balances'").get();
        if (balancesRow) {
          try {
            const balances = JSON.parse(balancesRow.value);
            if (typeof balances[opKey] === 'number') {
              balances[opKey] = Math.max(0, balances[opKey] - amt);
              db.prepare("UPDATE app_settings SET value = ? WHERE key = 'flexy_sim_balances'").run(JSON.stringify(balances));
            }
          } catch {}
        }

        // Add cash to caisse if requested
        if (affect_caisse && targetCaisseId && sp > 0) {
          const activeSession = db.prepare("SELECT id FROM caisse_sessions WHERE caisse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1").get(targetCaisseId);
          const sessId = activeSession ? activeSession.id : null;
          const cat = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name LIKE '%Flexy%' OR name = 'Vente Comptoir' LIMIT 1").get();
          const catId = cat ? cat.id : null;

          db.prepare(`
            INSERT INTO caisse_transactions (
              caisse_id, session_id, type, amount, category_id, category_name,
              reference, description, payment_method, date, user_id, user_name
            ) VALUES (?, ?, 'in', ?, ?, 'Recharge Flexy', ?, ?, 'especes', date('now'), ?, ?)
          `).run(
            targetCaisseId,
            sessId,
            sp,
            catId,
            ref,
            `Recharge Flexy ${opKey.toUpperCase()} - ${amt} DA (${phone_number || 'Sans n°'})`,
            user_id,
            user_name
          );
        }

        return res.lastInsertRowid;
      })();

      return {
        success: true,
        transactionId: txResult,
        reference: ref,
        apiResult,
        message: 'Recharge enregistrée avec succès'
      };
    } catch (err) {
      console.error('Error recording flexy transaction:', err);
      return { success: false, message: err.message };
    }
  });

  // Services: Get Flexy Transactions History
  ipcMain.handle('services:getFlexyTransactions', async (event, params = {}) => {
    try {
      const {
        search = '',
        operator = 'all',
        dateFilter = 'all',
        limit = 100
      } = params;

      let whereClauses = [];
      let queryParams = [];

      if (search && search.trim()) {
        whereClauses.push('(phone_number LIKE ? OR transaction_ref LIKE ? OR notes LIKE ?)');
        const s = `%${search.trim()}%`;
        queryParams.push(s, s, s);
      }

      if (operator && operator !== 'all') {
        whereClauses.push('operator = ?');
        queryParams.push(operator.toLowerCase());
      }

      if (dateFilter === 'today') {
        whereClauses.push("date(created_at) = date('now')");
      } else if (dateFilter === 'yesterday') {
        whereClauses.push("date(created_at) = date('now', '-1 day')");
      } else if (dateFilter === '7days') {
        whereClauses.push("date(created_at) >= date('now', '-7 days')");
      } else if (dateFilter === 'thisMonth') {
        whereClauses.push("strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const rows = db.prepare(`
        SELECT * FROM flexy_transactions
        ${whereSql}
        ORDER BY id DESC
        LIMIT ?
      `).all(...queryParams, limit);

      // Summary KPIs
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission,
          COALESCE(SUM(selling_price), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN operator = 'mobilis' THEN amount ELSE 0 END), 0) as mobilis_total,
          COALESCE(SUM(CASE WHEN operator = 'djezzy' THEN amount ELSE 0 END), 0) as djezzy_total,
          COALESCE(SUM(CASE WHEN operator = 'ooredoo' THEN amount ELSE 0 END), 0) as ooredoo_total
        FROM flexy_transactions
        ${whereSql}
      `).get(...queryParams);

      return {
        success: true,
        transactions: rows,
        stats: {
          totalCount: stats?.total_count || 0,
          totalAmount: stats?.total_amount || 0,
          totalCommission: stats?.total_commission || 0,
          totalRevenue: stats?.total_revenue || 0,
          byOperator: {
            mobilis: stats?.mobilis_total || 0,
            djezzy: stats?.djezzy_total || 0,
            ooredoo: stats?.ooredoo_total || 0
          }
        }
      };
    } catch (err) {
      console.error('Error fetching flexy transactions:', err);
      return { success: false, message: err.message, transactions: [] };
    }
  });

  // Services: Test External Flexy API
  ipcMain.handle('services:testApi', async (event, customConfig) => {
    try {
      let config = customConfig;
      if (!config) {
        const row = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_api_config'").get();
        config = row ? JSON.parse(row.value) : null;
      }
      if (!config || !config.apiUrl) {
        return { success: false, message: 'URL API manquante' };
      }
      const testRes = await callFlexyApi(config, {
        operator: 'mobilis',
        phone: '0600000000',
        amount: 100,
        transactionRef: 'TEST_PING'
      });
      return testRes;
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Services: Delete Flexy Transaction (standalone or POS-linked)
  ipcMain.handle('services:deleteFlexy', async (event, id) => {
    try {
      if (!id) return { success: false, message: 'ID requis' };
      const tx = db.prepare('SELECT * FROM flexy_transactions WHERE id = ?').get(id);
      if (!tx) return { success: false, message: 'Transaction introuvable' };

      db.transaction(() => {
        // 1. Reverse the caisse balance: find and delete the caisse_transaction matching this flexy ref
        if (tx.transaction_ref) {
          // Try matching by exact reference in caisse_transactions
          const caisseTx = db.prepare(
            "SELECT * FROM caisse_transactions WHERE reference = ? OR description LIKE ? LIMIT 1"
          ).get(tx.transaction_ref, `%${tx.transaction_ref}%`);
          if (caisseTx) {
            // Delete triggers trg_caisse_transactions_ad which auto-reverses the balance
            db.prepare('DELETE FROM caisse_transactions WHERE id = ?').run(caisseTx.id);
          } else if (tx.caisse_id && tx.selling_price > 0) {
            // Fallback: manual balance reversal
            db.prepare('UPDATE caisses SET current_balance = MAX(0, current_balance - ?) WHERE id = ?')
              .run(parseFloat(tx.selling_price) || 0, tx.caisse_id);
          }
        } else if (tx.caisse_id && tx.selling_price > 0) {
          db.prepare('UPDATE caisses SET current_balance = MAX(0, current_balance - ?) WHERE id = ?')
            .run(parseFloat(tx.selling_price) || 0, tx.caisse_id);
        }

        // 2. Restore the operator SIM balance
        const balancesRow = db.prepare("SELECT value FROM app_settings WHERE key = 'flexy_sim_balances'").get();
        if (balancesRow) {
          try {
            const bals = JSON.parse(balancesRow.value);
            const opk = (tx.operator || '').toLowerCase();
            if (typeof bals[opk] === 'number') {
              bals[opk] += parseFloat(tx.amount) || 0;
              db.prepare("UPDATE app_settings SET value = ? WHERE key = 'flexy_sim_balances'").run(JSON.stringify(bals));
            }
          } catch {}
        }

        // 3. Delete the flexy transaction itself
        db.prepare('DELETE FROM flexy_transactions WHERE id = ?').run(id);

        db.prepare('INSERT INTO audit_logs (user, action) VALUES (?, ?)').run(
          'System', `Suppression recharge Flexy #${id} (${tx.operator} ${tx.amount} DA)`
        );
      })();

      appCache.delByPrefix('caisses:');
      appCache.delByPrefix('dashboard:');

      return { success: true, message: 'Transaction supprimée avec succès' };
    } catch (err) {
      console.error('Error deleting flexy transaction:', err);
      return { success: false, message: err.message };
    }
  });
}
