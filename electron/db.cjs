const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initDatabase(userDataPath) {
  const dbDir = userDataPath || path.join(__dirname, '..');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'distribution.db');
  console.log('[DB] Initializing SQLite database at:', dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -32000');       // 32 MB page cache (negative = KB)
  db.pragma('mmap_size = 134217728');     // 128 MB memory-mapped I/O
  db.pragma('synchronous = NORMAL');      // Faster writes, still crash-safe with WAL
  db.pragma('temp_store = MEMORY');       // Temp tables/indexes in RAM
  db.pragma('busy_timeout = 5000');       // 5 s wait on locked DB
  db.pragma('optimize');                  // Run optimizer at open

  // Complete Schema definition - Direct table creation with all columns and constraints
  db.exec(`
    -- =====================
    -- CORE & AUTH MODULE
    -- =====================
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      permissions TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- =====================
    -- SUPPLIERS (FOURNISSEURS)
    -- =====================
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      ice TEXT,
      notes TEXT,
      initial_credit REAL DEFAULT 0,
      current_credit REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fournisseur_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fournisseur_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      reference TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      balance_after REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs (id) ON DELETE CASCADE
    );

    -- =====================
    -- CATEGORIES & CAISSES MODULE
    -- =====================
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      color TEXT DEFAULT '#16a34a',
      icon TEXT DEFAULT 'tag',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS caisses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'closed',
      current_balance REAL NOT NULL DEFAULT 0,
      assigned_user_id INTEGER,
      last_opened_at TEXT,
      last_closed_at TEXT,
      is_default INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS caisse_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caisse_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance_expected REAL,
      closing_balance_actual REAL,
      difference REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS caisse_transaction_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'both',
      color TEXT DEFAULT '#16a34a',
      icon TEXT DEFAULT 'tag',
      is_system INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS caisse_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caisse_id INTEGER NOT NULL,
      session_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      category_name TEXT,
      reference TEXT,
      description TEXT NOT NULL,
      payment_method TEXT DEFAULT 'especes',
      destination_caisse_id INTEGER,
      date TEXT NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      balance_after REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES caisse_transaction_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (session_id) REFERENCES caisse_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (destination_caisse_id) REFERENCES caisses(id) ON DELETE SET NULL
    );

    -- =====================
    -- PRODUCTS & STOCK MODULE
    -- =====================
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      category_id INTEGER,
      primary_supplier_id INTEGER,
      caisse_id INTEGER,
      base_unit TEXT NOT NULL DEFAULT 'pièce',
      stock_quantity REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL NOT NULL DEFAULT 5,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_favorite INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (primary_supplier_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      unit_name TEXT NOT NULL,
      conversion_factor REAL NOT NULL DEFAULT 1,
      selling_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      barcode TEXT,
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      purchase_price REAL NOT NULL,
      supplier_sku TEXT,
      lead_time_days INTEGER DEFAULT 1,
      min_order_qty REAL DEFAULT 1,
      last_purchased_date TEXT,
      is_primary INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES fournisseurs(id) ON DELETE CASCADE
    );

    -- =====================
    -- PURCHASES / ORDERS MODULE
    -- =====================
    CREATE TABLE IF NOT EXISTS cart_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_type TEXT NOT NULL DEFAULT 'purchase',
      supplier_id INTEGER,
      caisse_id INTEGER,
      payment_method TEXT DEFAULT 'especes',
      caisse_transaction_id INTEGER,
      user_name TEXT DEFAULT 'Admin',
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      credit_amount REAL NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_transaction_id) REFERENCES caisse_transactions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cart_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES cart_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- =====================
    -- EMPLOYEES & PAYROLL MODULE
    -- (payroll linked to users table, no separate employees table)
    -- =====================
    CREATE TABLE IF NOT EXISTS employee_advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      payment_method TEXT DEFAULT 'especes',
      reference TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      base_salary REAL NOT NULL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      advance_deducted REAL DEFAULT 0,
      net_paid REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'especes',
      payment_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'paye',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employee_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      remaining REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'en_cours',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- =====================
    -- CLIENTS & DETTES CLIENTS MODULE
    -- =====================
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      current_debt REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      unit_name TEXT DEFAULT 'pièce',
      quantity REAL NOT NULL DEFAULT 1,
      conversion_factor REAL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      date TEXT NOT NULL,
      caisse_id INTEGER,
      caisse_transaction_id INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_transaction_id) REFERENCES caisse_transactions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS client_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      debt_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'especes',
      caisse_id INTEGER,
      caisse_transaction_id INTEGER,
      date TEXT NOT NULL,
      notes TEXT,
      balance_before REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES client_debts(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_transaction_id) REFERENCES caisse_transactions(id) ON DELETE SET NULL
    );

    -- =====================
    -- FLEXY & MULTI-SERVICES TRANSACTIONS
    -- =====================
    CREATE TABLE IF NOT EXISTS flexy_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT NOT NULL,           -- 'mobilis', 'djezzy', 'ooredoo', 'idoom'
      phone_number TEXT NOT NULL,
      amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      status TEXT DEFAULT 'completed',   -- 'completed', 'pending', 'failed'
      transaction_ref TEXT,
      api_response TEXT,
      vente_id INTEGER,
      caisse_id INTEGER,
      user_id INTEGER,
      user_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_flexy_operator ON flexy_transactions(operator);
    CREATE INDEX IF NOT EXISTS idx_flexy_phone ON flexy_transactions(phone_number);
    CREATE INDEX IF NOT EXISTS idx_flexy_created ON flexy_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_flexy_vente ON flexy_transactions(vente_id);

    -- =====================
    -- PERFORMANCE INDEXES (safe columns only)
    -- =====================
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_products_favorite ON products(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(primary_supplier_id);
    CREATE INDEX IF NOT EXISTS idx_products_caisse ON products(caisse_id);
    CREATE INDEX IF NOT EXISTS idx_products_status_fav ON products(status, is_favorite);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
    CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at);
    CREATE INDEX IF NOT EXISTS idx_product_units_prod ON product_units(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON product_units(barcode);
    CREATE INDEX IF NOT EXISTS idx_product_suppliers_prod ON product_suppliers(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_suppliers_supp ON product_suppliers(supplier_id);

    CREATE INDEX IF NOT EXISTS idx_cart_orders_supplier ON cart_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_cart_orders_type ON cart_orders(order_type);
    CREATE INDEX IF NOT EXISTS idx_cart_orders_created ON cart_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_cart_order_items_order ON cart_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_cart_order_items_product ON cart_order_items(product_id);

    CREATE INDEX IF NOT EXISTS idx_fournisseur_credits_supp ON fournisseur_credits(fournisseur_id);
    CREATE INDEX IF NOT EXISTS idx_fournisseur_credits_date ON fournisseur_credits(date);

    CREATE INDEX IF NOT EXISTS idx_caisse_transactions_caisse ON caisse_transactions(caisse_id);
    CREATE INDEX IF NOT EXISTS idx_caisse_transactions_date ON caisse_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_caisse_transactions_type ON caisse_transactions(type);
    CREATE INDEX IF NOT EXISTS idx_caisse_transactions_session ON caisse_transactions(session_id);
    CREATE INDEX IF NOT EXISTS idx_caisse_sessions_caisse ON caisse_sessions(caisse_id);
    CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions(status);

    CREATE INDEX IF NOT EXISTS idx_emp_advances_emp ON employee_advances(employee_id);
    CREATE INDEX IF NOT EXISTS idx_emp_payments_emp ON employee_payments(employee_id);
    CREATE INDEX IF NOT EXISTS idx_emp_payments_month ON employee_payments(year, month);
    CREATE INDEX IF NOT EXISTS idx_emp_debts_emp ON employee_debts(employee_id);

    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_clients_debt ON clients(current_debt);
    CREATE INDEX IF NOT EXISTS idx_client_debts_client ON client_debts(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_debts_product ON client_debts(product_id);
    CREATE INDEX IF NOT EXISTS idx_client_debts_status ON client_debts(status);
    CREATE INDEX IF NOT EXISTS idx_client_debts_date ON client_debts(date);
    CREATE INDEX IF NOT EXISTS idx_client_debts_client_status ON client_debts(client_id, status);
    CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_payments_date ON client_payments(date);
  `);

  // ==========================================
  // SCHEMA MIGRATIONS (Add missing columns to existing DBs)
  // ==========================================
  const migrations = [
    // products table - new columns
    { sql: `ALTER TABLE products ADD COLUMN caisse_id INTEGER REFERENCES caisses(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE products ADD COLUMN primary_supplier_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE products ADD COLUMN is_favorite INTEGER DEFAULT 0` },
    // cart_orders table - new columns
    { sql: `ALTER TABLE cart_orders ADD COLUMN caisse_id INTEGER REFERENCES caisses(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE cart_orders ADD COLUMN caisse_transaction_id INTEGER REFERENCES caisse_transactions(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE cart_orders ADD COLUMN payment_method TEXT DEFAULT 'especes'` },
    { sql: `ALTER TABLE cart_orders ADD COLUMN user_name TEXT DEFAULT 'Admin'` },
    { sql: `ALTER TABLE cart_orders ADD COLUMN paid_amount REAL DEFAULT 0` },
    { sql: `ALTER TABLE cart_orders ADD COLUMN credit_amount REAL DEFAULT 0` },
    // caisse_transactions - new columns
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN session_id INTEGER REFERENCES caisse_sessions(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN category_id INTEGER REFERENCES caisse_transaction_categories(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN category_name TEXT` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN payment_method TEXT DEFAULT 'especes'` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN destination_caisse_id INTEGER REFERENCES caisses(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN user_id INTEGER` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN user_name TEXT` },
    { sql: `ALTER TABLE caisse_transactions ADD COLUMN balance_after REAL DEFAULT 0` },
    // caisses - new columns
    { sql: `ALTER TABLE caisses ADD COLUMN assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL` },
    { sql: `ALTER TABLE caisses ADD COLUMN last_opened_at TEXT` },
    { sql: `ALTER TABLE caisses ADD COLUMN last_closed_at TEXT` },
    { sql: `ALTER TABLE caisses ADD COLUMN is_default INTEGER DEFAULT 0` },
    { sql: `ALTER TABLE caisses ADD COLUMN notes TEXT` },
    // users - payroll columns (added for payroll without separate employees table)
    { sql: `ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN department TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN position TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN base_salary REAL DEFAULT 0` },
    { sql: `ALTER TABLE users ADD COLUMN hire_date TEXT` },
    { sql: `ALTER TABLE users ADD COLUMN emp_status TEXT DEFAULT 'actif'` },
    { sql: `ALTER TABLE users ADD COLUMN cin TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN notes TEXT DEFAULT ''` },
    { sql: `ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT ''` },
    // employee_advances
    { sql: `ALTER TABLE employee_advances ADD COLUMN reference TEXT` },
    // fournisseurs
    { sql: `ALTER TABLE fournisseurs ADD COLUMN initial_credit REAL DEFAULT 0` },
    { sql: `ALTER TABLE fournisseurs ADD COLUMN current_credit REAL DEFAULT 0` },
    { sql: `ALTER TABLE fournisseurs ADD COLUMN ice TEXT` },
    // vente_lignes
    { sql: `ALTER TABLE vente_lignes ADD COLUMN conversion_factor REAL DEFAULT 1` },
  ];

  for (const m of migrations) {
    try {
      db.exec(m.sql);
    } catch (e) {
      // Column likely already exists — safe to ignore duplicate column errors
      if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) {
        console.warn('[DB] Migration warning:', e.message);
      }
    }
  }

  // Migrate tables for clients & client debts
  const tableMigrations = [
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      current_debt REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS client_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      unit_name TEXT DEFAULT 'pièce',
      quantity REAL NOT NULL DEFAULT 1,
      conversion_factor REAL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL NOT NULL,
      date TEXT NOT NULL,
      caisse_id INTEGER,
      caisse_transaction_id INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_transaction_id) REFERENCES caisse_transactions(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS client_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      debt_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'especes',
      caisse_id INTEGER,
      caisse_transaction_id INTEGER,
      date TEXT NOT NULL,
      notes TEXT,
      balance_before REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES client_debts(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL,
      FOREIGN KEY (caisse_transaction_id) REFERENCES caisse_transactions(id) ON DELETE SET NULL
    )`
  ];
  for (const tSql of tableMigrations) {
    try { db.exec(tSql); } catch (e) { console.warn('[DB] Table migration warning:', e.message); }
  }


  // Sales module table migrations
  const salesTableMigrations = [
    `CREATE TABLE IF NOT EXISTS ventes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT UNIQUE NOT NULL,
      client_id INTEGER,
      client_name TEXT NOT NULL DEFAULT 'Client Anonyme',
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      caisse_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      gross_profit REAL NOT NULL DEFAULT 0,
      cash_received REAL NOT NULL DEFAULT 0,
      change_returned REAL NOT NULL DEFAULT 0,
      credit_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'paye',
      sale_status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (caisse_id) REFERENCES caisses(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS vente_lignes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vente_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      unit_name TEXT NOT NULL DEFAULT 'piece',
      quantity REAL NOT NULL,
      conversion_factor REAL NOT NULL DEFAULT 1,
      cost_price_snapshot REAL NOT NULL DEFAULT 0,
      selling_price_snapshot REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      line_profit REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS vente_paiements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vente_id INTEGER NOT NULL,
      client_id INTEGER,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_ventes_client ON ventes(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ventes_user ON ventes(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ventes_status ON ventes(payment_status)`,
    `CREATE INDEX IF NOT EXISTS idx_ventes_sale_number ON ventes(sale_number)`,
    `CREATE INDEX IF NOT EXISTS idx_vente_lignes_vente ON vente_lignes(vente_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vente_lignes_product ON vente_lignes(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vente_paiements_vente ON vente_paiements(vente_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vente_paiements_client ON vente_paiements(client_id)`
  ];
  for (const tSql of salesTableMigrations) {
    try { db.exec(tSql); } catch (e) { if (!e.message.includes('already exists')) console.warn('[DB] Sales migration:', e.message); }
  }

  // Precomputed Summary Tables for High-Performance Statistics
  const statsTableMigrations = [
    `CREATE TABLE IF NOT EXISTS stats_daily_sales (
      date TEXT PRIMARY KEY,
      sales_count INTEGER DEFAULT 0,
      completed_count INTEGER DEFAULT 0,
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_cogs REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      cash_received REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stats_daily_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      category_id INTEGER,
      quantity_sold REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      cogs REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, product_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stats_daily_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      sales_count INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      cash_collected REAL DEFAULT 0,
      credit_issued REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stats_daily_caisses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      caisse_id INTEGER NOT NULL,
      total_in REAL DEFAULT 0,
      total_out REAL DEFAULT 0,
      net_change REAL DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, caisse_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stats_daily_credits (
      date TEXT PRIMARY KEY,
      credit_issued REAL DEFAULT 0,
      credit_repaid REAL DEFAULT 0,
      new_debts_count INTEGER DEFAULT 0,
      payments_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stats_daily_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      employee_id INTEGER NOT NULL,
      total_advances REAL DEFAULT 0,
      total_salaries REAL DEFAULT 0,
      total_paid REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, employee_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stats_inventory_summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_items_count INTEGER DEFAULT 0,
      total_units_stock REAL DEFAULT 0,
      total_inventory_valuation_cost REAL DEFAULT 0,
      total_inventory_valuation_selling REAL DEFAULT 0,
      potential_margin REAL DEFAULT 0,
      low_stock_count INTEGER DEFAULT 0,
      out_of_stock_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stats_reconciliation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reconciled_by TEXT NOT NULL,
      date_from TEXT,
      date_to TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      discrepancies_found INTEGER DEFAULT 0,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_stats_sales_date ON stats_daily_sales(date)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_prod_date ON stats_daily_products(date)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_prod_pid ON stats_daily_products(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_prod_cat ON stats_daily_products(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_user_date ON stats_daily_users(date)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_user_uid ON stats_daily_users(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_caisse_date ON stats_daily_caisses(date)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_caisse_cid ON stats_daily_caisses(caisse_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_credit_date ON stats_daily_credits(date)`,
    `CREATE INDEX IF NOT EXISTS idx_stats_emp_date ON stats_daily_employees(date)`
  ];
  for (const sSql of statsTableMigrations) {
    try { db.exec(sSql); } catch (e) { if (!e.message.includes('already exists')) console.warn('[DB] Stats migration:', e.message); }
  }

  // Migrate indexes that depend on migrated columns
  const indexMigrations = [
    `CREATE INDEX IF NOT EXISTS idx_products_caisse ON products(caisse_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(primary_supplier_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cart_orders_caisse ON cart_orders(caisse_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cart_orders_user ON cart_orders(user_name)`,
    `CREATE INDEX IF NOT EXISTS idx_caisse_transactions_session ON caisse_transactions(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_caisse_transactions_category ON caisse_transactions(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_caisse_sessions_caisse ON caisse_sessions(caisse_id)`,
    `CREATE INDEX IF NOT EXISTS idx_caisse_sessions_status ON caisse_sessions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_caisses_status ON caisses(status)`,
    `CREATE INDEX IF NOT EXISTS idx_caisses_default ON caisses(is_default)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_client_debts_client ON client_debts(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_debts_product ON client_debts(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_debts_status ON client_debts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_client_debts_date ON client_debts(date)`,
    `CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_payments_date ON client_payments(date)`
  ];
  for (const idx of indexMigrations) {
    try { db.exec(idx); } catch (e) { console.warn('[DB] Index migration warning:', e.message); }
  }

  // ==========================================
  // INITIAL SEEDS (Clean First Run Setup)
  // ==========================================

  // 1. Seed default app settings
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM app_settings').get().count;
  if (countSettings === 0) {
    const insertSetting = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');
    const defaultSettings = [
      ['language', 'fr'],
      ['date_format', 'DD/MM/YYYY'],
      ['printer_ticket', 'EPSON TM-T20III (Thermique 80mm)'],
      ['printer_invoice', 'HP LaserJet Pro M404 (A4)'],
      ['printer_label', 'Zebra ZD420 (Étiquettes)'],
      ['printer_copies', '1'],
      ['printer_paper', '80mm'],
      ['printer_autocut', 'true'],
      ['store_name', 'imatechx'],
      ['store_tagline', 'Logistique & Gestion Commerciale'],
      ['store_address', '120 Zone Industrielle, Route Principale'],
      ['store_city', 'Paris'],
      ['store_postal_code', '75001'],
      ['store_country', 'France'],
      ['store_phone', '+33 1 45 88 90 20'],
      ['store_phone_alt', '+33 6 12 34 56 78'],
      ['store_email', 'contact@distribution-express.fr'],
      ['store_website', 'www.distribution-express.fr'],
      ['store_ice', 'ICE 002394857000084'],
      ['store_tax_id', 'FR 89 423 889 123'],
      ['store_currency', 'DA'],
      ['store_footer_note', 'Merci pour votre fidélité !'],
      ['backup_auto_frequency', 'daily'],
      ['backup_last_date', '']
    ];
    for (const [k, v] of defaultSettings) {
      insertSetting.run(k, v);
    }
  }

  // Ensure Multi-Services & Flexy settings always exist
  const ensureSetting = (k, defaultVal) => {
    try {
      const row = db.prepare('SELECT key FROM app_settings WHERE key = ?').get(k);
      if (!row) {
        db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(
          k,
          typeof defaultVal === 'object' ? JSON.stringify(defaultVal) : String(defaultVal)
        );
      }
    } catch (e) {
      console.warn('[DB] Setting init warning for ' + k + ':', e.message);
    }
  };

  ensureSetting('services_tarifs', {
    photocopie_nb: 10,
    photocopie_color: 30,
    photocopie_rv_nb: 15,
    photocopie_rv_color: 50,
    impression_doc: 20,
    scan_doc: 20,
    plastification: 50,
    flexy_commission_fixed: 0,
    flexy_commission_percent: 0
  });

  ensureSetting('flexy_sim_balances', {
    mobilis: 25000,
    djezzy: 20000,
    ooredoo: 20000
  });

  ensureSetting('flexy_api_config', {
    enabled: false,
    provider: 'custom',
    apiUrl: 'https://api.flexy-gateway.local/v1/recharge',
    apiKey: '',
    apiSecret: '',
    pin: '',
    autoSend: false
  });

  ensureSetting('service_caisses', {
    flexy_caisse_id: null,
    photocopie_caisse_id: null
  });

  // 2. Seed default admin and accounts
  const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!checkAdmin) {
    console.log('[DB] Seeding default admin accounts...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, full_name, role, permissions)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('admin', 'admin', 'System Administrator', 'admin', '["*"]');
    insertUser.run('manager', 'manager', 'Account Manager', 'manager', '["*"]');
  } else {
    // Ensure admin user has all permissions
    db.prepare("UPDATE users SET permissions = '[\"*\"]' WHERE username = 'admin' AND (permissions IS NULL OR permissions = '' OR permissions = '[]')").run();
  }

  // 3. Seed default product categories
  const countCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (countCategories === 0) {
    console.log('[DB] Seeding default product categories...');
    const insertCat = db.prepare('INSERT INTO categories (name, code, color, icon) VALUES (?, ?, ?, ?)');
    insertCat.run('Tabac & Cigarettes', 'TABAC', '#dc2626', 'cigarette');
    insertCat.run('Boissons & Café', 'BOISSONS', '#2563eb', 'coffee');
    insertCat.run('Snacks & Confiserie', 'SNACKS', '#d97706', 'cookie');
    insertCat.run('Accessoires & Fumeurs', 'ACCESSOIRES', '#7c3aed', 'sparkles');
  }

  // 4. Seed default caisse transaction categories
  const countCaisseCategories = db.prepare('SELECT COUNT(*) as count FROM caisse_transaction_categories').get().count;
  if (countCaisseCategories === 0) {
    console.log('[DB] Seeding default caisse transaction categories...');
    const insertCaisseCat = db.prepare(`
      INSERT INTO caisse_transaction_categories (name, type, color, icon, is_system, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // System protected categories (is_system = 1)
    const systemCategories = [
      ['Vente Comptoir', 'in', '#16a34a', 'shopping-cart', 1, 'Encaissements des ventes clients'],
      ['Règlement Dette Client', 'in', '#16a34a', 'user-check', 1, 'Encaissements des remboursements de dettes clients'],
      ['Achat Fournisseur', 'out', '#dc2626', 'truck', 1, 'Règlement des factures et bons fournisseurs'],
      ['Paiement Salaire', 'out', '#9333ea', 'users', 1, 'Règlement des salaires mensuels des employés'],
      ['Avance Employé', 'out', '#d97706', 'user-minus', 1, 'Avances sur salaire accordées aux employés'],
      ['Transfert Inter-Caisse', 'both', '#0284c7', 'arrow-left-right', 1, 'Transfert de liquidités entre caisses'],
      ['Fond de Caisse', 'in', '#059669', 'vault', 1, 'Apport initial ou fond de roulement de caisse'],
      ['Ajustement Écart de Caisse', 'both', '#64748b', 'sliders', 1, 'Régularisation lors de la clôture de session']
    ];
    for (const cat of systemCategories) {
      insertCaisseCat.run(...cat);
    }

    // Custom categories (is_system = 0)
    const customCategories = [
      ['Frais de Transport & Livraison', 'out', '#ea580c', 'truck', 0, 'Carburant, taxis, livraison marchandise'],
      ['Électricité & Eau', 'out', '#ca8a04', 'zap', 0, 'Factures d’énergie, eau et services'],
      ['Loyer Magasin & Dépôt', 'out', '#475569', 'building', 0, 'Paiement mensuel du loyer commercial'],
      ['Fournitures de Bureau & Emballage', 'out', '#0891b2', 'package', 0, 'Papier thermique, cartons, scotch, stylos'],
      ['Café & Restauration', 'out', '#be185d', 'coffee', 0, 'Frais de réception, thé, café et collations'],
      ['Entrée Exceptionnelle', 'in', '#10b981', 'plus-circle', 0, 'Recettes diverses non liées aux ventes'],
      ['Dépense Divers', 'out', '#ef4444', 'minus-circle', 0, 'Petites dépenses courantes de fonctionnement']
    ];
    for (const cat of customCategories) {
      insertCaisseCat.run(...cat);
    }
  } else {
    // Ensure 'Règlement Dette Client' exists even if categories were previously seeded
    const hasReglement = db.prepare("SELECT id FROM caisse_transaction_categories WHERE name = 'Règlement Dette Client'").get();
    if (!hasReglement) {
      db.prepare(`
        INSERT OR IGNORE INTO caisse_transaction_categories (name, type, color, icon, is_system, description)
        VALUES ('Règlement Dette Client', 'in', '#16a34a', 'user-check', 1, 'Encaissements des remboursements de dettes clients')
      `).run();
    }
  }

  // 4b. Seed 1 default client if none exist
  const countClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  if (countClients === 0) {
    console.log('[DB] Seeding 1 default client...');
    db.prepare(`
      INSERT INTO clients (name, phone, address, notes, current_debt, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).run('Client Comptoir', '0550 12 34 56', 'Magasin Central', 'Client habituel du comptoir');
  }

  // 4c. Seed 1 default fournisseur if none exist
  const countFournisseurs = db.prepare('SELECT COUNT(*) as count FROM fournisseurs').get().count;
  let defaultSupplierId = null;
  if (countFournisseurs === 0) {
    console.log('[DB] Seeding 1 default fournisseur...');
    const fRes = db.prepare(`
      INSERT INTO fournisseurs (name, contact_person, phone, email, address, city, notes, initial_credit, current_credit, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')
    `).run(
      'Grossiste Général (Tabac & Alimentation)',
      'Mohamed',
      '0555 12 34 56',
      'grossiste.alger@gmail.com',
      'Zone d\'Activité Industrielle',
      'Alger',
      'Fournisseur officiel tabac, boissons et confiserie'
    );
    defaultSupplierId = fRes.lastInsertRowid;
  } else {
    const fRow = db.prepare('SELECT id FROM fournisseurs ORDER BY id ASC LIMIT 1').get();
    if (fRow) defaultSupplierId = fRow.id;
  }

  // 4d. Seed 5 initial products requested
  const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (countProducts === 0) {
    console.log('[DB] Seeding 5 initial products...');
    const catTabac = db.prepare("SELECT id FROM categories WHERE name LIKE '%Tabac%'").get();
    const catBoisson = db.prepare("SELECT id FROM categories WHERE name LIKE '%Boisson%'").get();
    const catSnack = db.prepare("SELECT id FROM categories WHERE name LIKE '%Snack%'").get();

    const insertProd = db.prepare(`
      INSERT INTO products (
        name, sku, barcode, category_id, primary_supplier_id, base_unit,
        stock_quantity, min_stock_alert, cost_price, selling_price, status, is_favorite, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `);

    const insertUnit = db.prepare(`
      INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, cost_price, is_default)
      VALUES (?, ?, 1, ?, ?, 1)
    `);

    const insertSuppPrice = db.prepare(`
      INSERT INTO product_suppliers (product_id, supplier_id, purchase_price, is_primary)
      VALUES (?, ?, ?, 1)
    `);

    const initialProducts = [
      {
        name: 'Marlboro Rouge',
        sku: 'MALB-ROUGE-30',
        barcode: '762210080001',
        catId: catTabac ? catTabac.id : null,
        base_unit: 'Paquet',
        stock: 500, // 500 packet
        cost_price: 25,
        selling_price: 30, // 30da cigarette
        is_favorite: 1,
        notes: 'Marlboro Rouge cigarette 30 DA (500 paquets)'
      },
      {
        name: 'Coca Cola sghira',
        sku: 'COCA-SGHIRA-60',
        barcode: '544900000099',
        catId: catBoisson ? catBoisson.id : null,
        base_unit: 'Bouteille',
        stock: 100,
        cost_price: 45,
        selling_price: 60, // 60da vente
        is_favorite: 1,
        notes: 'Coca Cola sghira 60 DA vente'
      },
      {
        name: 'Chips Rifkus',
        sku: 'CHIPS-RIFKUS-60',
        barcode: '613000001234',
        catId: catSnack ? catSnack.id : null,
        base_unit: 'Sachet',
        stock: 100,
        cost_price: 45,
        selling_price: 60, // 60da vente
        is_favorite: 1,
        notes: 'Chips Rifkus 60 DA vente'
      },
      {
        name: 'Saida (S3ida)',
        sku: 'EAU-SAIDA-50',
        barcode: '613000005432',
        catId: catBoisson ? catBoisson.id : null,
        base_unit: 'Bouteille',
        stock: 100,
        cost_price: 35,
        selling_price: 50, // s3ida 50da
        is_favorite: 1,
        notes: 'Eau minérale Saida 50 DA'
      },
      {
        name: 'Zari3a sghira',
        sku: 'SNK-ZARI3A-10',
        barcode: '613000009876',
        catId: catSnack ? catSnack.id : null,
        base_unit: 'Sachet',
        stock: 200,
        cost_price: 5,
        selling_price: 10, // zari3a sghira 10de vente
        is_favorite: 1,
        notes: 'Zari3a sghira 10 DA vente'
      }
    ];

    for (const p of initialProducts) {
      const pRes = insertProd.run(
        p.name, p.sku, p.barcode, p.catId, defaultSupplierId, p.base_unit,
        p.stock, 10, p.cost_price, p.selling_price, p.is_favorite, p.notes
      );
      const prodId = pRes.lastInsertRowid;
      insertUnit.run(prodId, p.base_unit, p.selling_price, p.cost_price);
      if (defaultSupplierId) {
        insertSuppPrice.run(prodId, defaultSupplierId, p.cost_price);
      }
    }

    try {
      recalculateInventorySummary(db);
    } catch (e) {}
  }

  // 5. Seed initial "Caisse Principale" (is_default = 1, protected from deletion)
  const defaultCaisse = db.prepare('SELECT id FROM caisses WHERE is_default = 1').get();
  if (!defaultCaisse) {
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM caisses').get().count;
    if (existingCount === 0) {
      console.log('[DB] Seeding initial non-deletable Caisse Principale...');
      const insertCaisse = db.prepare(`
        INSERT INTO caisses (name, code, status, current_balance, is_default, notes)
        VALUES (?, ?, 'closed', 0, 1, ?)
      `);
      insertCaisse.run('Caisse Principale', 'CAISSE-01', 'Caisse principale par défaut (non supprimable)');
    } else {
      // If caisses already exist but none marked as default, mark the first one as default
      const firstCaisse = db.prepare('SELECT id FROM caisses ORDER BY id ASC LIMIT 1').get();
      if (firstCaisse) {
        db.prepare('UPDATE caisses SET is_default = 1 WHERE id = ?').run(firstCaisse.id);
      }
    }
  }

  // ==========================================
  // HIGH-PERFORMANCE SQLITE TRIGGERS
  // ==========================================
  try {
    // 1. Maintain product stock automatically when cart order item is added
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_cart_order_items_stock_ai
      AFTER INSERT ON cart_order_items
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET stock_quantity = stock_quantity + (
          CASE (SELECT order_type FROM cart_orders WHERE id = NEW.order_id)
            WHEN 'purchase' THEN NEW.quantity
            WHEN 'sale' THEN -NEW.quantity
            ELSE 0
          END
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_cart_order_items_stock_ad
      AFTER DELETE ON cart_order_items
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET stock_quantity = stock_quantity - (
          CASE (SELECT order_type FROM cart_orders WHERE id = OLD.order_id)
            WHEN 'purchase' THEN OLD.quantity
            WHEN 'sale' THEN -OLD.quantity
            ELSE 0
          END
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.product_id;
      END;
    `);

    // 2. Automatically update updated_at on products modification
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_products_updated_at
      AFTER UPDATE ON products
      FOR EACH ROW
      WHEN OLD.updated_at = NEW.updated_at
      BEGIN
        UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);

    // 3. Auto-update caisse current_balance when a transaction is inserted
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_caisse_transactions_ai
      AFTER INSERT ON caisse_transactions
      FOR EACH ROW
      BEGIN
        UPDATE caisses
        SET current_balance = current_balance + (
          CASE NEW.type
            WHEN 'in' THEN NEW.amount
            WHEN 'transfer_in' THEN NEW.amount
            WHEN 'out' THEN -NEW.amount
            WHEN 'transfer_out' THEN -NEW.amount
            ELSE 0
          END
        )
        WHERE id = NEW.caisse_id;
      END;

      -- Auto-update fournisseur current_credit when a credit operation is inserted
      CREATE TRIGGER IF NOT EXISTS trg_fournisseur_credits_ai
      AFTER INSERT ON fournisseur_credits
      FOR EACH ROW
      BEGIN
        UPDATE fournisseurs
        SET current_credit = current_credit + (
          CASE NEW.type
            WHEN 'achat_credit' THEN NEW.amount
            WHEN 'paiement' THEN -NEW.amount
            WHEN 'avoir' THEN -NEW.amount
            ELSE 0
          END
        )
        WHERE id = NEW.fournisseur_id;
      END;

      -- Reverse fournisseur current_credit when a credit operation is deleted
      CREATE TRIGGER IF NOT EXISTS trg_fournisseur_credits_ad
      AFTER DELETE ON fournisseur_credits
      FOR EACH ROW
      BEGIN
        UPDATE fournisseurs
        SET current_credit = current_credit - (
          CASE OLD.type
            WHEN 'achat_credit' THEN OLD.amount
            WHEN 'paiement' THEN -OLD.amount
            WHEN 'avoir' THEN -OLD.amount
            ELSE 0
          END
        )
        WHERE id = OLD.fournisseur_id;
      END;

      -- Reverse caisse balance on transaction delete
      CREATE TRIGGER IF NOT EXISTS trg_caisse_transactions_ad
      AFTER DELETE ON caisse_transactions
      FOR EACH ROW
      BEGIN
        UPDATE caisses
        SET current_balance = current_balance - (
          CASE OLD.type
            WHEN 'in' THEN OLD.amount
            WHEN 'transfer_in' THEN OLD.amount
            WHEN 'out' THEN -OLD.amount
            WHEN 'transfer_out' THEN -OLD.amount
            ELSE 0
          END
        )
        WHERE id = OLD.caisse_id;
      END;

      -- Maintain caisse balance on transaction update (caisse_id or amount changes)
      CREATE TRIGGER IF NOT EXISTS trg_caisse_transactions_au
      AFTER UPDATE ON caisse_transactions
      FOR EACH ROW
      BEGIN
        -- Revert OLD from OLD.caisse_id
        UPDATE caisses
        SET current_balance = current_balance - (
          CASE OLD.type
            WHEN 'in' THEN OLD.amount
            WHEN 'transfer_in' THEN OLD.amount
            WHEN 'out' THEN -OLD.amount
            WHEN 'transfer_out' THEN -OLD.amount
            ELSE 0
          END
        )
        WHERE id = OLD.caisse_id;

        -- Apply NEW to NEW.caisse_id
        UPDATE caisses
        SET current_balance = current_balance + (
          CASE NEW.type
            WHEN 'in' THEN NEW.amount
            WHEN 'transfer_in' THEN NEW.amount
            WHEN 'out' THEN -NEW.amount
            WHEN 'transfer_out' THEN -NEW.amount
            ELSE 0
          END
        )
        WHERE id = NEW.caisse_id;
      END;

      -- Maintain client current_debt and reduce product stock on client_debt insert
      CREATE TRIGGER IF NOT EXISTS trg_client_debts_ai
      AFTER INSERT ON client_debts
      FOR EACH ROW
      BEGIN
        UPDATE clients
        SET current_debt = current_debt + NEW.remaining_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;

        UPDATE products
        SET stock_quantity = stock_quantity - (NEW.quantity * COALESCE(NEW.conversion_factor, 1)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id AND NEW.product_id IS NOT NULL;
      END;

      -- Reverse client current_debt and restore product stock on client_debt delete
      CREATE TRIGGER IF NOT EXISTS trg_client_debts_ad
      AFTER DELETE ON client_debts
      FOR EACH ROW
      BEGIN
        UPDATE clients
        SET current_debt = MAX(0, current_debt - OLD.remaining_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.client_id;

        UPDATE products
        SET stock_quantity = stock_quantity + (OLD.quantity * COALESCE(OLD.conversion_factor, 1)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.product_id AND OLD.product_id IS NOT NULL;
      END;

      -- Maintain client current_debt on payment insert
      CREATE TRIGGER IF NOT EXISTS trg_client_payments_ai
      AFTER INSERT ON client_payments
      FOR EACH ROW
      BEGIN
        UPDATE clients
        SET current_debt = MAX(0, current_debt - NEW.amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;
      END;

      -- Reverse client current_debt on payment delete
      CREATE TRIGGER IF NOT EXISTS trg_client_payments_ad
      AFTER DELETE ON client_payments
      FOR EACH ROW
      BEGIN
        UPDATE clients
        SET current_debt = current_debt + OLD.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.client_id;
      END;
    `);

    // 4. Protect default caisse and ensure at least one caisse always exists (DB-level triggers)
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_caisses_prevent_delete_default
      BEFORE DELETE ON caisses
      FOR EACH ROW
      WHEN OLD.is_default = 1
      BEGIN
        SELECT RAISE(ABORT, 'La caisse principale par défaut ne peut pas être supprimée.');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_caisses_prevent_delete_last
      BEFORE DELETE ON caisses
      FOR EACH ROW
      WHEN (SELECT COUNT(*) FROM caisses) <= 1
      BEGIN
        SELECT RAISE(ABORT, 'Au moins une caisse doit obligatoirement exister.');
      END;
    `);

    // 5. Precomputed Statistics Triggers (High-Performance Real-Time Aggregation)
    db.exec(`
      -- Ventes Insert: updates daily sales & daily cashier summaries
      CREATE TRIGGER IF NOT EXISTS trg_ventes_ai
      AFTER INSERT ON ventes
      FOR EACH ROW
      WHEN NEW.sale_status = 'completed'
      BEGIN
        INSERT INTO stats_daily_sales (
          date, sales_count, completed_count, subtotal, discount_amount,
          total_revenue, total_cogs, gross_profit, cash_received, credit_amount, updated_at
        )
        VALUES (
          COALESCE(date(NEW.created_at), date('now')), 1, 1, NEW.subtotal, NEW.discount_amount,
          NEW.total_amount, NEW.total_cost, NEW.gross_profit, NEW.cash_received, NEW.credit_amount, CURRENT_TIMESTAMP
        )
        ON CONFLICT(date) DO UPDATE SET
          sales_count = sales_count + 1,
          completed_count = completed_count + 1,
          subtotal = subtotal + excluded.subtotal,
          discount_amount = discount_amount + excluded.discount_amount,
          total_revenue = total_revenue + excluded.total_revenue,
          total_cogs = total_cogs + excluded.total_cogs,
          gross_profit = gross_profit + excluded.gross_profit,
          cash_received = cash_received + excluded.cash_received,
          credit_amount = credit_amount + excluded.credit_amount,
          updated_at = CURRENT_TIMESTAMP;

        INSERT INTO stats_daily_users (
          date, user_id, user_name, sales_count, revenue, gross_profit, cash_collected, credit_issued, updated_at
        )
        VALUES (
          COALESCE(date(NEW.created_at), date('now')), NEW.user_id, NEW.user_name, 1, NEW.total_amount, NEW.gross_profit, NEW.cash_received, NEW.credit_amount, CURRENT_TIMESTAMP
        )
        ON CONFLICT(date, user_id) DO UPDATE SET
          sales_count = sales_count + 1,
          user_name = excluded.user_name,
          revenue = revenue + excluded.revenue,
          gross_profit = gross_profit + excluded.gross_profit,
          cash_collected = cash_collected + excluded.cash_collected,
          credit_issued = credit_issued + excluded.credit_issued,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Ventes Delete: atomically reverses daily sales & daily cashier summaries
      CREATE TRIGGER IF NOT EXISTS trg_ventes_ad
      AFTER DELETE ON ventes
      FOR EACH ROW
      WHEN OLD.sale_status = 'completed'
      BEGIN
        UPDATE stats_daily_sales
        SET sales_count = MAX(0, sales_count - 1),
            completed_count = MAX(0, completed_count - 1),
            subtotal = MAX(0, subtotal - OLD.subtotal),
            discount_amount = MAX(0, discount_amount - OLD.discount_amount),
            total_revenue = MAX(0, total_revenue - OLD.total_revenue),
            total_cogs = MAX(0, total_cogs - OLD.total_cost),
            gross_profit = gross_profit - OLD.gross_profit,
            cash_received = MAX(0, cash_received - OLD.cash_received),
            credit_amount = MAX(0, credit_amount - OLD.credit_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.created_at), date('now'));

        UPDATE stats_daily_users
        SET sales_count = MAX(0, sales_count - 1),
            revenue = MAX(0, revenue - OLD.total_amount),
            gross_profit = gross_profit - OLD.gross_profit,
            cash_collected = MAX(0, cash_collected - OLD.cash_received),
            credit_issued = MAX(0, credit_issued - OLD.credit_amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.created_at), date('now')) AND user_id = OLD.user_id;
      END;

      -- Ventes Status Update: handles completion vs cancellation
      CREATE TRIGGER IF NOT EXISTS trg_ventes_au_status
      AFTER UPDATE OF sale_status ON ventes
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_sales
        SET completed_count = MAX(0, completed_count - 1),
            total_revenue = MAX(0, total_revenue - OLD.total_amount),
            total_cogs = MAX(0, total_cogs - OLD.total_cost),
            gross_profit = gross_profit - OLD.gross_profit,
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.created_at), date('now')) AND OLD.sale_status = 'completed' AND NEW.sale_status != 'completed';

        UPDATE stats_daily_sales
        SET completed_count = completed_count + 1,
            total_revenue = total_revenue + NEW.total_amount,
            total_cogs = total_cogs + NEW.total_cost,
            gross_profit = gross_profit + NEW.gross_profit,
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(NEW.created_at), date('now')) AND OLD.sale_status != 'completed' AND NEW.sale_status = 'completed';
      END;

      -- Vente Lignes Insert: updates daily product sales summary
      CREATE TRIGGER IF NOT EXISTS trg_vente_lignes_ai
      AFTER INSERT ON vente_lignes
      FOR EACH ROW
      WHEN NEW.product_id IS NOT NULL
      BEGIN
        INSERT INTO stats_daily_products (
          date, product_id, product_name, category_id,
          quantity_sold, revenue, cogs, gross_profit, updated_at
        )
        VALUES (
          COALESCE((SELECT date(created_at) FROM ventes WHERE id = NEW.vente_id), date('now')),
          NEW.product_id,
          NEW.product_name,
          (SELECT category_id FROM products WHERE id = NEW.product_id),
          NEW.quantity * NEW.conversion_factor,
          NEW.line_total,
          (NEW.cost_price_snapshot * NEW.quantity),
          NEW.line_profit,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date, product_id) DO UPDATE SET
          product_name = excluded.product_name,
          quantity_sold = quantity_sold + excluded.quantity_sold,
          revenue = revenue + excluded.revenue,
          cogs = cogs + excluded.cogs,
          gross_profit = gross_profit + excluded.gross_profit,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Vente Lignes Delete: reverses daily product sales summary
      CREATE TRIGGER IF NOT EXISTS trg_vente_lignes_ad
      AFTER DELETE ON vente_lignes
      FOR EACH ROW
      WHEN OLD.product_id IS NOT NULL
      BEGIN
        UPDATE stats_daily_products
        SET quantity_sold = MAX(0, quantity_sold - (OLD.quantity * OLD.conversion_factor)),
            revenue = MAX(0, revenue - OLD.line_total),
            cogs = MAX(0, cogs - (OLD.cost_price_snapshot * OLD.quantity)),
            gross_profit = gross_profit - OLD.line_profit,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = OLD.product_id
          AND date = COALESCE((SELECT date(created_at) FROM ventes WHERE id = OLD.vente_id), date(OLD.created_at), date('now'));
      END;

      -- Caisse Transactions Insert: maintains daily cash movement summary
      CREATE TRIGGER IF NOT EXISTS trg_caisse_transactions_stats_ai
      AFTER INSERT ON caisse_transactions
      FOR EACH ROW
      BEGIN
        INSERT INTO stats_daily_caisses (
          date, caisse_id, total_in, total_out, net_change, transaction_count, updated_at
        )
        VALUES (
          COALESCE(date(NEW.date), date('now')),
          NEW.caisse_id,
          CASE WHEN NEW.type IN ('in', 'transfer_in') THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type IN ('out', 'transfer_out') THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type IN ('in', 'transfer_in') THEN NEW.amount ELSE -NEW.amount END,
          1,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date, caisse_id) DO UPDATE SET
          total_in = total_in + excluded.total_in,
          total_out = total_out + excluded.total_out,
          net_change = net_change + excluded.net_change,
          transaction_count = transaction_count + 1,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Caisse Transactions Delete: reverses daily cash movement summary
      CREATE TRIGGER IF NOT EXISTS trg_caisse_transactions_stats_ad
      AFTER DELETE ON caisse_transactions
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_caisses
        SET total_in = MAX(0, total_in - CASE WHEN OLD.type IN ('in', 'transfer_in') THEN OLD.amount ELSE 0 END),
            total_out = MAX(0, total_out - CASE WHEN OLD.type IN ('out', 'transfer_out') THEN OLD.amount ELSE 0 END),
            net_change = net_change - (CASE WHEN OLD.type IN ('in', 'transfer_in') THEN OLD.amount ELSE -OLD.amount END),
            transaction_count = MAX(0, transaction_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.date), date('now')) AND caisse_id = OLD.caisse_id;
      END;

      -- Client Debts Insert: maintains daily credit issued summary
      CREATE TRIGGER IF NOT EXISTS trg_client_debts_stats_ai
      AFTER INSERT ON client_debts
      FOR EACH ROW
      BEGIN
        INSERT INTO stats_daily_credits (
          date, credit_issued, credit_repaid, new_debts_count, payments_count, updated_at
        )
        VALUES (
          COALESCE(date(NEW.date), date('now')),
          NEW.remaining_amount,
          0,
          1,
          0,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date) DO UPDATE SET
          credit_issued = credit_issued + excluded.credit_issued,
          new_debts_count = new_debts_count + 1,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Client Debts Delete: reverses daily credit issued summary
      CREATE TRIGGER IF NOT EXISTS trg_client_debts_stats_ad
      AFTER DELETE ON client_debts
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_credits
        SET credit_issued = MAX(0, credit_issued - OLD.remaining_amount),
            new_debts_count = MAX(0, new_debts_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.date), date('now'));
      END;

      -- Client Payments Insert: maintains daily credit repayment summary
      CREATE TRIGGER IF NOT EXISTS trg_client_payments_stats_ai
      AFTER INSERT ON client_payments
      FOR EACH ROW
      BEGIN
        INSERT INTO stats_daily_credits (
          date, credit_issued, credit_repaid, new_debts_count, payments_count, updated_at
        )
        VALUES (
          COALESCE(date(NEW.date), date('now')),
          0,
          NEW.amount,
          0,
          1,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date) DO UPDATE SET
          credit_repaid = credit_repaid + excluded.credit_repaid,
          payments_count = payments_count + 1,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Client Payments Delete: reverses daily credit repayment summary
      CREATE TRIGGER IF NOT EXISTS trg_client_payments_stats_ad
      AFTER DELETE ON client_payments
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_credits
        SET credit_repaid = MAX(0, credit_repaid - OLD.amount),
            payments_count = MAX(0, payments_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.date), date('now'));
      END;

      -- Employee Advances Insert: maintains employee advance summary
      CREATE TRIGGER IF NOT EXISTS trg_emp_adv_stats_ai
      AFTER INSERT ON employee_advances
      FOR EACH ROW
      BEGIN
        INSERT INTO stats_daily_employees (
          date, employee_id, total_advances, total_salaries, total_paid, updated_at
        )
        VALUES (
          COALESCE(date(NEW.date), date('now')),
          NEW.employee_id,
          NEW.amount,
          0,
          NEW.amount,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date, employee_id) DO UPDATE SET
          total_advances = total_advances + excluded.total_advances,
          total_paid = total_paid + excluded.total_advances,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Employee Advances Delete: reverses employee advance summary
      CREATE TRIGGER IF NOT EXISTS trg_emp_adv_stats_ad
      AFTER DELETE ON employee_advances
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_employees
        SET total_advances = MAX(0, total_advances - OLD.amount),
            total_paid = MAX(0, total_paid - OLD.amount),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.date), date('now')) AND employee_id = OLD.employee_id;
      END;

      -- Employee Payments Insert: maintains employee payroll summary
      CREATE TRIGGER IF NOT EXISTS trg_emp_pay_stats_ai
      AFTER INSERT ON employee_payments
      FOR EACH ROW
      BEGIN
        INSERT INTO stats_daily_employees (
          date, employee_id, total_advances, total_salaries, total_paid, updated_at
        )
        VALUES (
          COALESCE(date(NEW.payment_date), date('now')),
          NEW.employee_id,
          0,
          NEW.net_paid,
          NEW.net_paid,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(date, employee_id) DO UPDATE SET
          total_salaries = total_salaries + excluded.total_salaries,
          total_paid = total_paid + excluded.total_salaries,
          updated_at = CURRENT_TIMESTAMP;
      END;

      -- Employee Payments Delete: reverses employee payroll summary
      CREATE TRIGGER IF NOT EXISTS trg_emp_pay_stats_ad
      AFTER DELETE ON employee_payments
      FOR EACH ROW
      BEGIN
        UPDATE stats_daily_employees
        SET total_salaries = MAX(0, total_salaries - OLD.net_paid),
            total_paid = MAX(0, total_paid - OLD.net_paid),
            updated_at = CURRENT_TIMESTAMP
        WHERE date = COALESCE(date(OLD.payment_date), date('now')) AND employee_id = OLD.employee_id;
      END;
    `);

    // Ensure inventory valuation summary is computed
    recalculateInventorySummary(db);

    console.log('[DB] High-performance SQLite triggers initialized.');
  } catch (err) {
    console.warn('[DB] Notice initializing database triggers:', err.message);
  }

  return db;
}

// Recalculate Inventory Summary (Precomputed valuation & alerts)
function recalculateInventorySummary(db) {
  try {
    const inv = db.prepare(`
      SELECT
        COUNT(*) as total_items_count,
        COALESCE(SUM(stock_quantity), 0) as total_units_stock,
        COALESCE(SUM(stock_quantity * cost_price), 0) as total_inventory_valuation_cost,
        COALESCE(SUM(stock_quantity * selling_price), 0) as total_inventory_valuation_selling,
        COALESCE(SUM(stock_quantity * (selling_price - cost_price)), 0) as potential_margin,
        COALESCE(SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_alert THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
      FROM products
      WHERE status = 'active'
    `).get();

    db.prepare(`
      INSERT INTO stats_inventory_summary (
        id, total_items_count, total_units_stock, total_inventory_valuation_cost,
        total_inventory_valuation_selling, potential_margin, low_stock_count, out_of_stock_count, updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        total_items_count = excluded.total_items_count,
        total_units_stock = excluded.total_units_stock,
        total_inventory_valuation_cost = excluded.total_inventory_valuation_cost,
        total_inventory_valuation_selling = excluded.total_inventory_valuation_selling,
        potential_margin = excluded.potential_margin,
        low_stock_count = excluded.low_stock_count,
        out_of_stock_count = excluded.out_of_stock_count,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      inv.total_items_count,
      inv.total_units_stock,
      inv.total_inventory_valuation_cost,
      inv.total_inventory_valuation_selling,
      inv.potential_margin,
      inv.low_stock_count,
      inv.out_of_stock_count
    );

    return inv;
  } catch (e) {
    console.warn('[DB] Could not recalculate inventory summary:', e.message);
    return null;
  }
}

// Administrator Reconciliation & Self-Healing Procedure
function reconcileStats(db, { date_from = null, date_to = null, user_name = 'Admin' } = {}) {
  let dateFilterSales = "WHERE sale_status = 'completed'";
  let dateFilterCaisse = "";
  let dateFilterDebts = "";
  let dateFilterPayments = "";
  let dateFilterAdvances = "";
  let dateFilterEmpPayments = "";

  const paramsSales = [];
  const paramsCaisse = [];
  const paramsDebts = [];
  const paramsPayments = [];
  const paramsAdvances = [];
  const paramsEmpPayments = [];

  if (date_from && date_to) {
    dateFilterSales += " AND date(created_at) BETWEEN date(?) AND date(?)";
    dateFilterCaisse = "WHERE date(COALESCE(date, created_at)) BETWEEN date(?) AND date(?)";
    dateFilterDebts = "WHERE date(COALESCE(date, created_at)) BETWEEN date(?) AND date(?)";
    dateFilterPayments = "WHERE date(COALESCE(date, created_at)) BETWEEN date(?) AND date(?)";
    dateFilterAdvances = "WHERE date(COALESCE(date, created_at)) BETWEEN date(?) AND date(?)";
    dateFilterEmpPayments = "WHERE date(COALESCE(payment_date, created_at)) BETWEEN date(?) AND date(?)";

    paramsSales.push(date_from, date_to);
    paramsCaisse.push(date_from, date_to);
    paramsDebts.push(date_from, date_to);
    paramsPayments.push(date_from, date_to);
    paramsAdvances.push(date_from, date_to);
    paramsEmpPayments.push(date_from, date_to);
  } else if (date_from) {
    dateFilterSales += " AND date(created_at) >= date(?)";
    dateFilterCaisse = "WHERE date(COALESCE(date, created_at)) >= date(?)";
    dateFilterDebts = "WHERE date(COALESCE(date, created_at)) >= date(?)";
    dateFilterPayments = "WHERE date(COALESCE(date, created_at)) >= date(?)";
    dateFilterAdvances = "WHERE date(COALESCE(date, created_at)) >= date(?)";
    dateFilterEmpPayments = "WHERE date(COALESCE(payment_date, created_at)) >= date(?)";

    paramsSales.push(date_from);
    paramsCaisse.push(date_from);
    paramsDebts.push(date_from);
    paramsPayments.push(date_from);
    paramsAdvances.push(date_from);
    paramsEmpPayments.push(date_from);
  }

  let totalDiscrepancies = 0;
  const startTime = Date.now();

  db.transaction(() => {
    // 1. Reconcile stats_daily_sales
    const actualSales = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as sales_count,
        COUNT(CASE WHEN sale_status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(subtotal), 0) as subtotal,
        COALESCE(SUM(discount_amount), 0) as discount_amount,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_cost), 0) as total_cogs,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COALESCE(SUM(cash_received), 0) as cash_received,
        COALESCE(SUM(credit_amount), 0) as credit_amount
      FROM ventes
      ${dateFilterSales}
      GROUP BY date(created_at)
    `).all(...paramsSales);

    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_sales WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_sales WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_sales").run();
    }

    const insertSale = db.prepare(`
      INSERT INTO stats_daily_sales (
        date, sales_count, completed_count, subtotal, discount_amount,
        total_revenue, total_cogs, gross_profit, cash_received, credit_amount, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const s of actualSales) {
      insertSale.run(
        s.date, s.sales_count, s.completed_count, s.subtotal, s.discount_amount,
        s.total_revenue, s.total_cogs, s.gross_profit, s.cash_received, s.credit_amount
      );
    }

    // 2. Reconcile stats_daily_products
    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_products WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_products WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_products").run();
    }

    const actualProducts = db.prepare(`
      SELECT
        date(v.created_at) as date,
        vl.product_id,
        vl.product_name,
        p.category_id,
        COALESCE(SUM(vl.quantity * vl.conversion_factor), 0) as quantity_sold,
        COALESCE(SUM(vl.line_total), 0) as revenue,
        COALESCE(SUM(vl.cost_price_snapshot * vl.quantity), 0) as cogs,
        COALESCE(SUM(vl.line_profit), 0) as gross_profit
      FROM vente_lignes vl
      JOIN ventes v ON vl.vente_id = v.id
      LEFT JOIN products p ON vl.product_id = p.id
      ${dateFilterSales.replace(/created_at/g, 'v.created_at')}
      AND vl.product_id IS NOT NULL
      GROUP BY date(v.created_at), vl.product_id
    `).all(...paramsSales);

    const insertProduct = db.prepare(`
      INSERT INTO stats_daily_products (
        date, product_id, product_name, category_id, quantity_sold, revenue, cogs, gross_profit, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const p of actualProducts) {
      insertProduct.run(p.date, p.product_id, p.product_name, p.category_id, p.quantity_sold, p.revenue, p.cogs, p.gross_profit);
    }

    // 3. Reconcile stats_daily_users
    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_users WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_users WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_users").run();
    }

    const actualUsers = db.prepare(`
      SELECT
        date(created_at) as date,
        user_id,
        user_name,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COALESCE(SUM(cash_received), 0) as cash_collected,
        COALESCE(SUM(credit_amount), 0) as credit_issued
      FROM ventes
      ${dateFilterSales}
      GROUP BY date(created_at), user_id
    `).all(...paramsSales);

    const insertUser = db.prepare(`
      INSERT INTO stats_daily_users (
        date, user_id, user_name, sales_count, revenue, gross_profit, cash_collected, credit_issued, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const u of actualUsers) {
      insertUser.run(u.date, u.user_id, u.user_name, u.sales_count, u.revenue, u.gross_profit, u.cash_collected, u.credit_issued);
    }

    // 4. Reconcile stats_daily_caisses
    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_caisses WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_caisses WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_caisses").run();
    }

    const actualCaisses = db.prepare(`
      SELECT
        date(COALESCE(date, created_at)) as date,
        caisse_id,
        COALESCE(SUM(CASE WHEN type IN ('in', 'transfer_in') THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN type IN ('out', 'transfer_out') THEN amount ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN type IN ('in', 'transfer_in') THEN amount ELSE -amount END), 0) as net_change,
        COUNT(*) as transaction_count
      FROM caisse_transactions
      ${dateFilterCaisse}
      GROUP BY date(COALESCE(date, created_at)), caisse_id
    `).all(...paramsCaisse);

    const insertCaisse = db.prepare(`
      INSERT INTO stats_daily_caisses (
        date, caisse_id, total_in, total_out, net_change, transaction_count, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const c of actualCaisses) {
      insertCaisse.run(c.date, c.caisse_id, c.total_in, c.total_out, c.net_change, c.transaction_count);
    }

    // 5. Reconcile stats_daily_credits
    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_credits WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_credits WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_credits").run();
    }

    const debtsIssued = db.prepare(`
      SELECT
        date(COALESCE(date, created_at)) as date,
        COALESCE(SUM(remaining_amount), 0) as credit_issued,
        COUNT(*) as new_debts_count
      FROM client_debts
      ${dateFilterDebts}
      GROUP BY date(COALESCE(date, created_at))
    `).all(...paramsDebts);

    for (const di of debtsIssued) {
      db.prepare(`
        INSERT INTO stats_daily_credits (date, credit_issued, credit_repaid, new_debts_count, payments_count, updated_at)
        VALUES (?, ?, 0, ?, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(date) DO UPDATE SET
          credit_issued = excluded.credit_issued,
          new_debts_count = excluded.new_debts_count,
          updated_at = CURRENT_TIMESTAMP
      `).run(di.date, di.credit_issued, di.new_debts_count);
    }

    const debtsRepaid = db.prepare(`
      SELECT
        date(COALESCE(date, created_at)) as date,
        COALESCE(SUM(amount), 0) as credit_repaid,
        COUNT(*) as payments_count
      FROM client_payments
      ${dateFilterPayments}
      GROUP BY date(COALESCE(date, created_at))
    `).all(...paramsPayments);

    for (const dr of debtsRepaid) {
      db.prepare(`
        INSERT INTO stats_daily_credits (date, credit_issued, credit_repaid, new_debts_count, payments_count, updated_at)
        VALUES (?, 0, ?, 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(date) DO UPDATE SET
          credit_repaid = excluded.credit_repaid,
          payments_count = excluded.payments_count,
          updated_at = CURRENT_TIMESTAMP
      `).run(dr.date, dr.credit_repaid, dr.payments_count);
    }

    // 6. Reconcile stats_daily_employees
    if (date_from && date_to) {
      db.prepare("DELETE FROM stats_daily_employees WHERE date BETWEEN date(?) AND date(?)").run(date_from, date_to);
    } else if (date_from) {
      db.prepare("DELETE FROM stats_daily_employees WHERE date >= date(?)").run(date_from);
    } else {
      db.prepare("DELETE FROM stats_daily_employees").run();
    }

    const empAdvances = db.prepare(`
      SELECT
        date(COALESCE(date, created_at)) as date,
        employee_id,
        COALESCE(SUM(amount), 0) as total_advances
      FROM employee_advances
      ${dateFilterAdvances}
      GROUP BY date(COALESCE(date, created_at)), employee_id
    `).all(...paramsAdvances);

    for (const ea of empAdvances) {
      db.prepare(`
        INSERT INTO stats_daily_employees (date, employee_id, total_advances, total_salaries, total_paid, updated_at)
        VALUES (?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(date, employee_id) DO UPDATE SET
          total_advances = excluded.total_advances,
          total_paid = total_paid + excluded.total_advances,
          updated_at = CURRENT_TIMESTAMP
      `).run(ea.date, ea.employee_id, ea.total_advances, ea.total_advances);
    }

    const empSalaries = db.prepare(`
      SELECT
        date(COALESCE(payment_date, created_at)) as date,
        employee_id,
        COALESCE(SUM(net_paid), 0) as total_salaries
      FROM employee_payments
      ${dateFilterEmpPayments}
      GROUP BY date(COALESCE(payment_date, created_at)), employee_id
    `).all(...paramsEmpPayments);

    for (const es of empSalaries) {
      db.prepare(`
        INSERT INTO stats_daily_employees (date, employee_id, total_advances, total_salaries, total_paid, updated_at)
        VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(date, employee_id) DO UPDATE SET
          total_salaries = excluded.total_salaries,
          total_paid = total_paid + excluded.total_salaries,
          updated_at = CURRENT_TIMESTAMP
      `).run(es.date, es.employee_id, es.total_salaries, es.total_salaries);
    }

    // 7. Inventory Summary
    recalculateInventorySummary(db);

    const elapsed = Date.now() - startTime;

    // 8. Log reconciliation
    db.prepare(`
      INSERT INTO stats_reconciliation_logs (reconciled_by, date_from, date_to, status, discrepancies_found, details)
      VALUES (?, ?, ?, 'completed', ?, ?)
    `).run(
      user_name,
      date_from || 'ALL',
      date_to || 'ALL',
      totalDiscrepancies,
      `Réconciliation réussie en ${elapsed}ms: ${actualSales.length} jours de ventes, ${actualProducts.length} produits agrégés, ${actualCaisses.length} flux caisses.`
    );
  })();

  return { success: true, discrepancies: totalDiscrepancies };
}

module.exports = { initDatabase, reconcileStats, recalculateInventorySummary };
