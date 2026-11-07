const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth & Account
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getUsers: () => ipcRenderer.invoke('auth:getUsers'),
  createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
  updateUser: (userData) => ipcRenderer.invoke('auth:updateUser', userData),
  deleteUser: (id) => ipcRenderer.invoke('auth:deleteUser', id),
  updateAccount: (data) => ipcRenderer.invoke('auth:updateAccount', data),
  getAuditLogs: () => ipcRenderer.invoke('audit:getLogs'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Printers
  getPrinters: () => ipcRenderer.invoke('system:getPrinters'),
  printTest: (options) => ipcRenderer.invoke('system:printTest', options),

  // Backup & Restore
  exportDbBackup: () => ipcRenderer.invoke('backup:exportDb'),
  importDbBackup: () => ipcRenderer.invoke('backup:importDb'),
  getFullBackupData: () => ipcRenderer.invoke('backup:getFullData'),
  restoreFullBackupData: (data) => ipcRenderer.invoke('backup:restoreFullData', data),

  // Fournisseurs & Crédits
  getFournisseurs: () => ipcRenderer.invoke('fournisseurs:getAll'),
  getFournisseurById: (id) => ipcRenderer.invoke('fournisseurs:getById', id),
  createFournisseur: (data) => ipcRenderer.invoke('fournisseurs:create', data),
  updateFournisseur: (data) => ipcRenderer.invoke('fournisseurs:update', data),
  deleteFournisseur: (id) => ipcRenderer.invoke('fournisseurs:delete', id),
  getFournisseurCredits: (params) => ipcRenderer.invoke('fournisseurs:getCredits', params),
  addFournisseurCredit: (data) => ipcRenderer.invoke('fournisseurs:addCredit', data),
  deleteFournisseurCredit: (id) => ipcRenderer.invoke('fournisseurs:deleteCredit', id),

  // Clients & Dettes Clients
  getClients: (params) => ipcRenderer.invoke('clients:getAll', params),
  getClientById: (id) => ipcRenderer.invoke('clients:getById', id),
  createClient: (data) => ipcRenderer.invoke('clients:create', data),
  updateClient: (data) => ipcRenderer.invoke('clients:update', data),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),
  addClientDebt: (data) => ipcRenderer.invoke('clients:addDebt', data),
  payClientDebt: (data) => ipcRenderer.invoke('clients:payDebt', data),
  deleteClientDebt: (id) => ipcRenderer.invoke('clients:deleteDebt', id),
  deleteClientPayment: (id) => ipcRenderer.invoke('clients:deletePayment', id),
  getClientStats: () => ipcRenderer.invoke('clients:getStats'),

  // KMS Products, Units & Supplier Comparisons
  getProducts: (filters) => ipcRenderer.invoke('products:getAll', filters),
  getProductsForPOS: () => ipcRenderer.invoke('products:getForPOS'),
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (data) => ipcRenderer.invoke('products:update', data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  toggleProductFavorite: (id) => ipcRenderer.invoke('products:toggleFavorite', id),
  updateProductStock: (data) => ipcRenderer.invoke('products:updateStock', data),
  getSupplierComparison: (id) => ipcRenderer.invoke('products:getSupplierComparison', id),
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  createCategory: (data) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (data) => ipcRenderer.invoke('categories:update', data),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
  createCartOrder: (data) => ipcRenderer.invoke('cart:createOrder', data),
  getCartOrders: (filters) => ipcRenderer.invoke('cart:getOrders', filters),
  getCartOrderById: (id) => ipcRenderer.invoke('cart:getOrderById', id),
  deleteCartOrder: (id) => ipcRenderer.invoke('cart:deleteOrder', id),
  updateCartOrder: (data) => ipcRenderer.invoke('cart:updateOrder', data),
  selectAndParseInvoicePdf: () => ipcRenderer.invoke('purchases:selectAndParseInvoicePdf'),
  parseInvoicePdfBuffer: (base64Data) => ipcRenderer.invoke('purchases:parseInvoicePdfBuffer', base64Data),

  // Employees & Payroll
  getEmployees: (filters) => ipcRenderer.invoke('employees:getAll', filters),
  getEmployeeById: (id) => ipcRenderer.invoke('employees:getById', id),
  createEmployee: (data) => ipcRenderer.invoke('employees:create', data),
  updateEmployee: (data) => ipcRenderer.invoke('employees:update', data),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),
  addEmployeeAdvance: (data) => ipcRenderer.invoke('employees:addAdvance', data),
  deleteEmployeeAdvance: (id) => ipcRenderer.invoke('employees:deleteAdvance', id),
  paySalary: (data) => ipcRenderer.invoke('employees:paySalary', data),
  deleteEmployeePayment: (id) => ipcRenderer.invoke('employees:deletePayment', id),
  addEmployeeDebt: (data) => ipcRenderer.invoke('employees:addDebt', data),
  deleteEmployeeDebt: (id) => ipcRenderer.invoke('employees:deleteDebt', id),
  getEmployeeKpis: (filters) => ipcRenderer.invoke('employees:getKpis', filters),
  getEmployeeDepartments: () => ipcRenderer.invoke('employees:getDepartments'),

  // Multi-Caisse & Trésorerie
  getCaisses: (params) => ipcRenderer.invoke('caisses:getAll', params),
  getCaisseById: (id) => ipcRenderer.invoke('caisses:getById', id),
  createCaisse: (data) => ipcRenderer.invoke('caisses:create', data),
  updateCaisse: (data) => ipcRenderer.invoke('caisses:update', data),
  deleteCaisse: (id) => ipcRenderer.invoke('caisses:delete', id),
  openCaisseSession: (data) => ipcRenderer.invoke('caisses:openSession', data),
  closeCaisseSession: (data) => ipcRenderer.invoke('caisses:closeSession', data),
  getCaisseSessions: (params) => ipcRenderer.invoke('caisses:getSessions', params),
  getCaisseTransactions: (filters) => ipcRenderer.invoke('caisses:getTransactions', filters),
  createCaisseTransaction: (data) => ipcRenderer.invoke('caisses:createTransaction', data),
  transferCaisse: (data) => ipcRenderer.invoke('caisses:transfer', data),
  deleteCaisseTransaction: (id) => ipcRenderer.invoke('caisses:deleteTransaction', id),
  getCaisseCategories: () => ipcRenderer.invoke('caisses:getCategories'),
  createCaisseCategory: (data) => ipcRenderer.invoke('caisses:createCategory', data),
  updateCaisseCategory: (data) => ipcRenderer.invoke('caisses:updateCategory', data),
  deleteCaisseCategory: (id) => ipcRenderer.invoke('caisses:deleteCategory', id),
  getCaisseStats: (filters) => ipcRenderer.invoke('caisses:getStats', filters),

  // Ventes & Statistics Engine
  createVente: (data) => ipcRenderer.invoke('ventes:create', data),
  getVentes: (filters) => ipcRenderer.invoke('ventes:getAll', filters),
  getVenteById: (id) => ipcRenderer.invoke('ventes:getById', id),
  deleteVente: (id) => ipcRenderer.invoke('ventes:delete', id),
  addVentePaiement: (data) => ipcRenderer.invoke('ventes:addPaiement', data),
  getVentesStats: (filters) => ipcRenderer.invoke('ventes:getStats', filters),
  getVentesDashboard: (filters) => ipcRenderer.invoke('ventes:getDashboard', filters),
  getStatsDashboard: (filters) => ipcRenderer.invoke('stats:getDashboard', filters),
  reconcileStats: (params) => ipcRenderer.invoke('stats:reconcile', params),
  getStatsReconciliationLogs: () => ipcRenderer.invoke('stats:getReconciliationLogs'),

  // Multi-Services & Flexy API
  getServicesSettings: () => ipcRenderer.invoke('services:getSettings'),
  saveServicesSettings: (data) => ipcRenderer.invoke('services:saveSettings', data),
  updateSimBalance: (data) => ipcRenderer.invoke('services:updateSimBalance', data),
  recordFlexyTransaction: (data) => ipcRenderer.invoke('services:recordFlexy', data),
  getFlexyTransactions: (params) => ipcRenderer.invoke('services:getFlexyTransactions', params),
  deleteFlexyTransaction: (id) => ipcRenderer.invoke('services:deleteFlexy', id),
  testFlexyApi: (config) => ipcRenderer.invoke('services:testApi', config),

  // Global cache flush
  flushCache: () => ipcRenderer.invoke('cache:flush'),

  // Dominosoft Software Activation
  checkActivation: () => ipcRenderer.invoke('activation:checkStatus'),
  verifyActivationKey: (key) => ipcRenderer.invoke('activation:verify', key),
  relaunchApp: () => ipcRenderer.invoke('activation:relaunch'),
});
