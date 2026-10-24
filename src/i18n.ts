export type Language = 'fr' | 'en' | 'ar';

export interface Translations {
  // Navigation
  appName: string;
  sqliteOnline: string;
  dashboard: string;
  shipments: string;
  inventory: string;
  warehouses: string;
  users: string;
  settings: string;
  logout: string;
  refresh: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  date: string;
  search: string;
  filterAll: string;
  adminBadge: string;

  // Settings Tabs
  tabLanguage: string;
  tabPrinter: string;
  tabStore: string;
  tabAccount: string;
  tabBackup: string;

  // Header Titles
  titleDashboard: string;
  titleShipments: string;
  titleInventory: string;
  titleWarehouses: string;
  titleUsers: string;
  titleSettings: string;

  // Language Section
  languageHeading: string;
  languageSubheading: string;
  selectLanguage: string;
  dateFormat: string;
  currencyFormat: string;
  languagePreview: string;
  sampleDate: string;
  sampleAmount: string;
  savedLanguageNotice: string;

  // Printer Section
  printerHeading: string;
  printerSubheading: string;
  detectPrintersBtn: string;
  printersDetected: string;
  receiptPrinter: string;
  invoicePrinter: string;
  barcodePrinter: string;
  paperSize: string;
  autoCutPaper: string;
  cashDrawer: string;
  numberOfCopies: string;
  silentPrinting: string;
  testPrintBtn: string;
  testPrintReceipt: string;
  testPrintSuccess: string;
  noPrintersFound: string;
  thermalPaperDesc: string;
  laserPaperDesc: string;

  // Store Info Section
  storeHeading: string;
  storeSubheading: string;
  storeName: string;
  storeTagline: string;
  commercialRegister: string;
  taxIdentification: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  phoneAlt: string;
  email: string;
  website: string;
  defaultCurrency: string;
  invoiceFooterNote: string;
  storeLogo: string;
  uploadLogo: string;
  saveStoreBtn: string;
  storeSavedSuccess: string;

  // Account Management Section
  accountHeading: string;
  accountSubheading: string;
  profileDetails: string;
  fullName: string;
  username: string;
  userRole: string;
  roleDescription: string;
  changePasswordTitle: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  updateProfileBtn: string;
  updatePasswordBtn: string;
  accountUpdatedSuccess: string;
  passwordMismatch: string;
  wrongCurrentPassword: string;
  switchAccountTitle: string;
  securityLogsTitle: string;
  noSecurityLogs: string;
  timeCol: string;
  userCol: string;
  actionCol: string;

  // Backup & Restore Section
  backupHeading: string;
  backupSubheading: string;
  dbInfoTitle: string;
  dbType: string;
  dbLocation: string;
  lastBackupDate: string;
  neverBackedUp: string;
  exportBackupSection: string;
  exportDbBtn: string;
  exportJsonBtn: string;
  exportCsvSection: string;
  exportCsvInventory: string;
  exportCsvShipments: string;
  exportCsvWarehouses: string;
  restoreSection: string;
  restoreWarning: string;
  importDbBtn: string;
  importJsonBtn: string;
  restoreSuccess: string;
  autoBackupSchedule: string;
  freqDaily: string;
  freqWeekly: string;
  freqManual: string;

  // Fournisseurs & Historique de Crédit
  providers: string;
  providersHeading: string;
  providersSubheading: string;
  addProviderBtn: string;
  editProviderBtn: string;
  deleteProviderBtn: string;
  providerDetails: string;
  providerName: string;
  contactPerson: string;
  iceTaxId: string;
  currentCredit: string;
  initialCredit: string;
  totalDebts: string;
  totalPaid: string;
  providersWithDebt: string;
  totalProviders: string;
  tabProvidersList: string;
  tabGlobalCreditHistory: string;
  creditHistory: string;
  creditHistoryFor: string;
  recordCreditOperation: string;
  recordPayment: string;
  newPurchaseCredit: string;
  operationType: string;
  typePurchaseCredit: string;
  typePayment: string;
  typeCreditNote: string;
  amount: string;
  operationDate: string;
  paymentMethod: string;
  methodCash: string;
  methodCheque: string;
  methodTransfer: string;
  methodPromissoryNote: string;
  methodOther: string;
  referenceDoc: string;
  notesRemarks: string;
  balanceAfter: string;
  actions: string;
  confirmDeleteProvider: string;
  confirmDeleteMsg: string;
  searchProviderPlaceholder: string;
  filterDebtOnly: string;
  filterZeroDebt: string;
  filterAllProviders: string;
  statementTitle: string;
  printStatement: string;
  noOperations: string;
  noProvidersFound: string;
  statusActive: string;
  statusInactive: string;
  providerCreatedSuccess: string;
  providerUpdatedSuccess: string;
  providerDeletedSuccess: string;
  operationSavedSuccess: string;
  deleteOperationConfirm: string;
  adminOnlyNotice: string;

  // KMS Products & Multi-Units
  products: string;
  productsHeading: string;
  productsSubheading: string;
  sku: string;
  barcode: string;
  category: string;
  allCategories: string;
  stock: string;
  minStock: string;
  baseUnit: string;
  sellingUnits: string;
  supplier: string;
  allSuppliers: string;
  supplierPrices: string;
  compareSuppliers: string;
  cheapestSupplier: string;
  priceDifference: string;
  addToCart: string;
  cart: string;
  cartEmpty: string;
  totalCart: string;
  checkoutCart: string;
  clearCart: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  priceRange: string;
  fastSearch: string;
  addProduct: string;
  editProduct: string;
  deleteProduct: string;
  productSaved: string;
  productDeleted: string;
  orderCreated: string;
  orderType: string;
  quickStockUpdate: string;
  conversionFactor: string;
  sellingPrice: string;
  costPrice: string;
  cartDrawerTitle: string;
  quickAdd: string;
  purchaseOrderBtn: string;
  articlesReferenced: string;
  inCatalog: string;
  toRestock: string;
  completeStockout: string;
  stockValueCost: string;
  catalogTab: string;
  purchasesHistoryTab: string;
  allFilter: string;
  priceDA: string;
  sortBy: string;
  sortNameAsc: string;
  sortNameDesc: string;
  sortPriceCheap: string;
  sortPriceExp: string;
  sortStockAsc: string;
  sortStockDesc: string;
  articleRef: string;
  stockAvailable: string;
  caisseAndSupplier: string;
  unitsAndPrices: string;
  supplierPurchase: string;
  noArticlesMatchFilter: string;
  noCatalogProducts: string;
  resetFiltersHint: string;
  addFirstProductHint: string;
  generalCategory: string;
  adjustStockTooltip: string;
  inReserve: string;
  caisseLabel: string;
  defaultLabel: string;
  supplierShort: string;
  suppliersCount: string;
  purchaseShort: string;
  saleShort: string;
  addPurchaseBtn: string;
  showingItems: string;
  perPageLabel: string;
  previous: string;
  next: string;
  receivedPurchaseOrders: string;
  ordersUnit: string;
  cashPayouts: string;
  supplierDebtsKPI: string;
  totalPurchaseVolume: string;
  searchOrdersPlaceholder: string;
  allSuppliersFilter: string;
  allCaissesFilter: string;
  allPaymentsFilter: string;
  paymentCash: string;
  paymentMixte: string;
  paymentCredit: string;
  paymentTransfer: string;
  paymentCheque: string;
  dateTo: string;
  resetFilters: string;
  refAndDate: string;
  caisseDebited: string;
  paymentAndDebts: string;
  articlesCount: string;
  totalAmount: string;
  loadingOrders: string;
  noOrdersFound: string;
  paidAmountShort: string;
  debtAmountShort: string;
  detailsBtn: string;
  showingOrders: string;
  purchaseOrderTitle: string;
  purchaseOrderSubtitle: string;
  refreshWholesaleRates: string;
  caissePaymentLabel: string;
  autoPerProduct: string;
  paymentMethodLabel: string;
  debitCaisseCheckbox: string;
  wholesaleCost: string;
  customerSale: string;
  subtotalWholesale: string;
  versementsAndCreditBySupplier: string;
  currentDebt: string;
  orderTotal: string;
  versementCash: string;
  fullyPaidNoDebt: string;
  remainingCreditForOrder: string;
  newSupplierDebt: string;
  wholesaleOrderTotal: string;
  cashOutflowVersements: string;
  remainingCreditDebts: string;
  orderFullyPaidCash: string;
  validateOrderBtn: string;
  orderDetailsTitle: string;
  deleteOrderBtn: string;
  confirmDeleteOrderTitle: string;
  confirmDeleteOrderDesc: string;
  confirmDeleteBtn: string;
  caisseAssociated: string;
  articleDesignation: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  saveChanges: string;
  noOrderItems: string;
  orderReceivedItems: string;
  grandTotal: string;
  modifyOrderParams: string;
  caisseAttachment: string;
  noCaisseOption: string;
  cashOutflowLabel: string;
  remainingDebtLabel: string;
  orderFullPaidNotice: string;
  deleteOrderWarning: string;
  deleteOrderPoint1: string;
  deleteOrderPoint2: string;
  deleteOrderPoint3: string;

  // Multi-Caisse & Trésorerie
  caisses: string;
  caissesHeading: string;
  caissesSubheading: string;
  tabCaissesList: string;
  tabTransactions: string;
  tabCategories: string;
  tabSessions: string;
  openCaisse: string;
  closeCaisse: string;
  newTransaction: string;
  transfer: string;
  caisseBalance: string;
  totalCaissesBalance: string;
  totalInflows: string;
  totalOutflows: string;
  netCashFlow: string;
  activeCaisses: string;
  allCaisses: string;
  sourceCaisse: string;
  destinationCaisse: string;
  transactionCategory: string;
  systemProtectedCategory: string;
  customCategory: string;
  openingBalance: string;
  closingBalance: string;
  actualCounted: string;
  expectedBalance: string;
  cashDifference: string;
  perPage: string;
  page: string;
  of: string;
  total: string;
  inflow: string;
  outflow: string;
  transferOut: string;
  transferIn: string;

  // Employee Payroll
  empPageTitle: string;
  empPageSubtitle: string;
  empNewEmployee: string;
  empRefresh: string;
  empKpiPeriod: string;
  empTotalEmployees: string;
  empMasseSalariale: string;
  empTotalPaid: string;
  empSalaireRestant: string;
  empTotalAdvances: string;
  empTotalDebts: string;
  empTotalDepenses: string;
  empSearchPlaceholder: string;
  empAllStatuses: string;
  empAllDepts: string;
  empColEmployee: string;
  empColDeptPost: string;
  empColBaseSalary: string;
  empColTotalPaid: string;
  empColAdvances: string;
  empColDebts: string;
  empColStatus: string;
  empColActions: string;
  empNoEmployees: string;
  empNoEmployeesHint: string;
  empStatusActif: string;
  empStatusInactif: string;
  empStatusConge: string;
  empPage: string;
  empOf: string;
  empResults: string;
  empPrev: string;
  empNext: string;
  empModalNewTitle: string;
  empModalEditPrefix: string;
  empFieldFullName: string;
  empFieldCin: string;
  empFieldPhone: string;
  empFieldEmail: string;
  empFieldDept: string;
  empFieldPost: string;
  empFieldBaseSalary: string;
  empFieldHireDate: string;
  empFieldStatus: string;
  empFieldAddress: string;
  empFieldNotes: string;
  empBtnCancel: string;
  empBtnCreate: string;
  empBtnSaveChanges: string;
  empPayModalPrefix: string;
  empPayBaseSalaryLabel: string;
  empPayMonth: string;
  empPayYear: string;
  empPayBonuses: string;
  empPayDeductions: string;
  empPayAdvanceDeducted: string;
  empPayMethod: string;
  empPayMethodCash: string;
  empPayMethodTransfer: string;
  empPayMethodCheque: string;
  empPayMethodOther: string;
  empPayDate: string;
  empPayNotes: string;
  empPayNetLabel: string;
  empPayBtnSubmit: string;
  empAdvModalPrefix: string;
  empAdvAmount: string;
  empAdvDate: string;
  empAdvReason: string;
  empAdvMethod: string;
  empAdvReference: string;
  empAdvBtnSubmit: string;
  empDebtModalPrefix: string;
  empDebtAmount: string;
  empDebtDate: string;
  empDebtDescription: string;
  empDebtBtnSubmit: string;
  empDetailPrefix: string;
  empTabInfo: string;
  empTabSalaires: string;
  empTabAvances: string;
  empTabDettes: string;
  empInfoDept: string;
  empInfoPost: string;
  empInfoPhone: string;
  empInfoEmail: string;
  empInfoAddress: string;
  empInfoHireDate: string;
  empInfoBaseSalary: string;
  empInfoCin: string;
  empInfoNotes: string;
  empSalColMonth: string;
  empSalColBase: string;
  empSalColBonuses: string;
  empSalColDeductions: string;
  empSalColAdvDed: string;
  empSalColNet: string;
  empSalColMethod: string;
  empSalColDate: string;
  empAdvColDate: string;
  empAdvColAmount: string;
  empAdvColReason: string;
  empAdvColMethod: string;
  empDebtColDate: string;
  empDebtColDesc: string;
  empDebtColAmount: string;
  empDebtColRemaining: string;
  empDebtColStatus: string;
  empEmptyPayments: string;
  empEmptyAdvances: string;
  empEmptyDebts: string;
  empToastCreated: string;
  empToastUpdated: string;
  empToastDeleted: string;
  empToastNameRequired: string;
  empToastInvalidAmount: string;
  empToastAdvGranted: string;
  empToastDebtSaved: string;
  empToastAdvDeleted: string;
  empToastPayDeleted: string;
  empToastDebtDeleted: string;
  empConfirmDelete: string;
  empConfirmDeleteAdv: string;
  empConfirmDeletePay: string;
  empConfirmDeleteDebt: string;
  empMonths: string[];

  // Clients & Dettes Clients
  clients: string;
  clientsHeading: string;
  clientsSubheading: string;
  newClient: string;
  giveProductDebt: string;
  settleDebt: string;
  clientDebts: string;
  clientBlockedNotice: string;
  clientClearNotice: string;
  clientCannotBuyWarning: string;
  lastTakenProduct: string;
  clientHistory: string;

  // Navigation & POS/Dashboard/Historique Tabs
  posSale: string;
  salesHistory: string;
  dashboardPerformance: string;
  servicesMenu: string;
  titlePos: string;
  titleSalesHistory: string;
  titleDashboardPerformance: string;
  titleServices: string;

  // Dashboard Page
  dashTitle: string;
  dashSubtitle: string;
  dashDateFrom: string;
  dashDateTo: string;
  dashRefresh: string;
  dashLoading: string;
  dashNbSales: string;
  dashTotalRevenue: string;
  dashTotalCash: string;
  dashNewCredit: string;
  dashCostSales: string;
  dashGrossProfit: string;
  dashTotalClientCredit: string;
  dashActiveDebts: string;
  dashPerfByUser: string;
  dashTopProducts: string;
  dashColCashier: string;
  dashColNbSales: string;
  dashColRevenue: string;
  dashColCollected: string;
  dashColMargin: string;
  dashColProduct: string;
  dashColQtySold: string;
  dashNoData: string;

  // Rich Statistics Engine
  statsTabOverview: string;
  statsTabTrends: string;
  statsTabProducts: string;
  statsTabCashiers: string;
  statsTabTreasury: string;
  statsTabCredit: string;
  statsTabEmployees: string;
  statsTabReconciliation: string;

  statsFilterToday: string;
  statsFilterYesterday: string;
  statsFilter7Days: string;
  statsFilterThisMonth: string;
  statsFilterLastMonth: string;
  statsFilterThisYear: string;
  statsFilterCustom: string;

  statsMarginRate: string;
  statsAvgBasket: string;
  statsInventoryValuationCost: string;
  statsInventoryValuationSelling: string;
  statsPotentialMargin: string;
  statsLowStockAlerts: string;
  statsOutOfStock: string;
  statsCashCollected: string;
  statsCreditRepaid: string;
  statsNetCreditChange: string;
  statsTotalSalaries: string;
  statsTotalAdvances: string;
  statsLiveCashRegisters: string;
  statsLiveClientDebt: string;
  statsActiveDebtors: string;
  statsReconcileBtn: string;
  statsReconcileRunning: string;
  statsReconcileDesc: string;
  statsLastReconciled: string;
  statsLastUpdated: string;
  statsReconcileSuccess: string;
  statsReconciliationLogsTitle: string;

  // Historique Page
  histTitle: string;
  histSubtitle: string;
  histSearchPlaceholder: string;
  histAllStatus: string;
  histStatusPaid: string;
  histStatusPartial: string;
  histStatusCredit: string;
  histFilterBtn: string;
  histColSaleNum: string;
  histColDate: string;
  histColClient: string;
  histColCashier: string;
  histColTotal: string;
  histColPaid: string;
  histColCredit: string;
  histColStatus: string;
  histColActions: string;
  histLoading: string;
  histNoSales: string;
  histViewDetails: string;
  histCollectCredit: string;
  histDeleteSale: string;
  histPageOf: string;
  histPrev: string;
  histNext: string;
  histGeneralInfo: string;
  histRemainingCredit: string;
  histSoldItems: string;
  histReceivedPayments: string;
  histRecordPayment: string;
  histCreditRemainingPay: string;
  histDestCaisse: string;
  histNoCaisse: string;
  histAmountRcv: string;
  histNotesOptional: string;
  histNotesPlaceholder: string;
  histConfirmPayment: string;
  histPaymentSavedToast: string;
  histSaleDeletedToast: string;
  histDeleteConfirm: string;
  histGrossProfit: string;

  // Ventes / POS Page
  posTitle: string;
  posInService: string;
  posSearchKbd: string;
  posFavoritesKbd: string;
  posTigePackKbd: string;
  posDebtKbd: string;
  posCheckoutKbd: string;
  posScanBarcode: string;
  posSearchItem: string;
  posRefreshItems: string;
  posTabFavorites: string;
  posTabAll: string;
  posTabTobacco: string;
  posAllCategories: string;
  posActiveMode: string;
  posSwitchToSingle: string;
  posSwitchToPack: string;
  posCart: string;
  posEmptyCart: string;
  posClientWalkIn: string;
  posCartEmptyTitle: string;
  posCartEmptySubtitle: string;
  posTotalToPay: string;
  posDirectPay: string;
  posEnterKey: string;
  posDebtBtn: string;
  posLastReceipt: string;
  posSaleToCredit: string;
  posDebtAmount: string;
  posBeneficiaryClient: string;
  posSearchClient: string;
  posCurrentDebt: string;
  posNoteReason: string;
  posNotePlaceholder: string;
  posValidateDebt: string;
  posReceipt: string;
  posThankYou: string;
  posPrint: string;
  posSoundEnable: string;
  posSoundDisable: string;
  posNoFavoriteItems: string;
  posNoItemsFound: string;
  posSeeAllItems: string;
  posDiscount: string;
  posArticleCount: string;
  posMargin: string;
  posCashReceived: string;
  posChangeReturned: string;
  posRemainingCredit: string;
  posPartialPayOptions: string;
  posConfirmPayment: string;
  posPleaseSelectClient: string;
  posSingle: string;
  posPack: string;
  posNextScans: string;
  posLoadingItems: string;

  // Debt Settlement Modal (Clients)
  settleDebtTitle: string;
  settleDebtSubtitle: string;
  clientConcerned: string;
  currentDebtDue: string;
  lastTakenProductSnippet: string;
  amountToCollect: string;
  totalBalanceBtn: string;
  destCaisseLabel: string;
  caisseSelected: string;
  primaryCaisse: string;
  effectiveDepositIn: string;
  newEstimatedBalance: string;
  paymentMode: string;
  paymentDate: string;
  modeCash: string;
  modeTransfer: string;
  modeCheck: string;
  modeOther: string;
  notesRef: string;
  fullDebtSettledBanner: string;
  partialDebtSettledBanner: string;
  validateSettlementBtn: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    appName: "imatechx",
    sqliteOnline: "SQLite En Ligne",
    dashboard: "Tableau de Bord",
    shipments: "Expéditions",
    inventory: "Stock & Articles",
    warehouses: "Entrepôts",
    users: "Rôles & Accès",
    settings: "Paramètres",
    logout: "Déconnexion",
    refresh: "Actualiser",
    save: "Enregistrer les modifications",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer",
    date: "Date",
    search: "Rechercher...",
    filterAll: "Tous les statuts",
    adminBadge: "ADMIN",

    tabLanguage: "Langue & Région",
    tabPrinter: "Imprimantes & Reçus",
    tabStore: "Informations Magasin",
    tabAccount: "Gestion du Compte",
    tabBackup: "Sauvegarde & Restauration",

    titleDashboard: "Tableau de Bord Logistique",
    titleShipments: "Gestion des Expéditions",
    titleInventory: "Inventaire & Stock en Entrepôt",
    titleWarehouses: "Réseau des Entrepôts",
    titleUsers: "Administration des Utilisateurs & Rôles",
    titleSettings: "Configuration & Paramètres Système",

    languageHeading: "Préférences Linguistiques & Régionales",
    languageSubheading: "Choisissez la langue de l'interface utilisateur et adaptez les formats d'affichage.",
    selectLanguage: "Langue du logiciel",
    dateFormat: "Format des dates",
    currencyFormat: "Format de devise",
    languagePreview: "Aperçu en direct",
    sampleDate: "Exemple date",
    sampleAmount: "Exemple montant",
    savedLanguageNotice: "La langue a été mise à jour avec succès.",

    printerHeading: "Gestion des Imprimantes & Formats de Sortie",
    printerSubheading: "Configurez vos imprimantes thermiques pour tickets de caisse et laser pour bons de livraison.",
    detectPrintersBtn: "Détecter les Imprimantes du Système",
    printersDetected: "imprimante(s) détectée(s)",
    receiptPrinter: "Imprimante Tickets & Reçus (Thermique)",
    invoicePrinter: "Imprimante Factures & Bons (Laser/A4)",
    barcodePrinter: "Imprimante Étiquettes & Codes-barres",
    paperSize: "Taille de papier thermique",
    autoCutPaper: "Coupure automatique du papier après impression",
    cashDrawer: "Ouvrir automatiquement le tiroir-caisse",
    numberOfCopies: "Nombre d'exemplaires par défaut",
    silentPrinting: "Impression directe (silencieuse sans popup)",
    testPrintBtn: "Imprimer un Ticket de Test",
    testPrintReceipt: "Reçu de Test",
    testPrintSuccess: "Impression test effectuée avec succès !",
    noPrintersFound: "Aucune imprimante physique détectée. Mode virtuel actif.",
    thermalPaperDesc: "Idéal pour rouleau thermique 80mm ou 58mm POS.",
    laserPaperDesc: "Format standard feuille A4 ou A5 pour bordereaux et factures.",

    storeHeading: "Fiche Société & Magasin",
    storeSubheading: "Ces informations apparaîtront sur vos en-têtes de factures, bons d'expédition et tickets.",
    storeName: "Nom de l'établissement / Dépôt",
    storeTagline: "Slogan / Sous-titre commercial",
    commercialRegister: "Registre de Commerce (RC / SIRET)",
    taxIdentification: "Identifiant Fiscal (IF / ICE / TVA)",
    address: "Adresse physique",
    city: "Ville",
    postalCode: "Code postal",
    country: "Pays",
    phone: "Téléphone principal",
    phoneAlt: "Téléphone secondaire / WhatsApp",
    email: "Email de contact",
    website: "Site Web de l'entreprise",
    defaultCurrency: "Symbole monétaire principal",
    invoiceFooterNote: "Mention de bas de page (Pied de ticket / Facture)",
    storeLogo: "Logo officiel de l'entreprise",
    uploadLogo: "Changer le logo",
    saveStoreBtn: "Enregistrer les Informations Société",
    storeSavedSuccess: "Informations de l'établissement enregistrées avec succès.",

    accountHeading: "Gestion du Profil & Sécurité",
    accountSubheading: "Gérez votre compte personnel, vos identifiants d'accès et vos habilitations.",
    profileDetails: "Détails du Compte Connecté",
    fullName: "Nom et Prénom",
    username: "Identifiant de connexion",
    userRole: "Rôle attribué",
    roleDescription: "Les privilèges associés à votre rôle déterminent les actions autorisées dans l'application.",
    changePasswordTitle: "Changer le Mot de Passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    updateProfileBtn: "Mettre à jour mon profil",
    updatePasswordBtn: "Modifier le mot de passe",
    accountUpdatedSuccess: "Profil mis à jour avec succès !",
    passwordMismatch: "Les nouveaux mots de passe ne correspondent pas.",
    wrongCurrentPassword: "Le mot de passe actuel saisi est incorrect.",
    switchAccountTitle: "Changement Rapide d'Utilisateur",
    securityLogsTitle: "Journal Récent des Activités & Sécurité",
    noSecurityLogs: "Aucune activité récente enregistrée.",
    timeCol: "Date & Heure",
    userCol: "Utilisateur",
    actionCol: "Action Réalisée",

    backupHeading: "Sauvegarde & Restauration de la Base de Données",
    backupSubheading: "Protégez vos données d'entreprise avec des sauvegardes SQLite complètes ou restaurez une archive.",
    dbInfoTitle: "État de la Base SQLite Locale",
    dbType: "Moteur de Base de Données",
    dbLocation: "Emplacement",
    lastBackupDate: "Dernière sauvegarde",
    neverBackedUp: "Aucune sauvegarde récente",
    exportBackupSection: "Créer une Sauvegarde Maintenant",
    exportDbBtn: "Sauvegarder le fichier SQLite (.db)",
    exportJsonBtn: "Télécharger l'archive complète (.json)",
    exportCsvSection: "Exportation des Données en Fichier CSV",
    exportCsvInventory: "Exporter l'Inventaire (CSV)",
    exportCsvShipments: "Exporter les Expéditions (CSV)",
    exportCsvWarehouses: "Exporter les Entrepôts (CSV)",
    restoreSection: "Restaurer une Sauvegarde Existante",
    restoreWarning: "Attention : La restauration remplacera toutes les données actuelles (articles, expéditions, entrepôts) par le contenu du fichier sélectionné.",
    importDbBtn: "Restaurer un fichier SQLite (.db)",
    importJsonBtn: "Restaurer depuis un fichier (.json)",
    restoreSuccess: "Base de données restaurée avec succès !",
    autoBackupSchedule: "Fréquence du rappel de sauvegarde",
    freqDaily: "Quotidienne (Recommandé)",
    freqWeekly: "Hebdomadaire",
    freqManual: "Manuelle uniquement",

    // Fournisseurs & Historique de Crédit
    providers: "Fournisseurs",
    providersHeading: "Gestion des Fournisseurs & Crédits",
    providersSubheading: "Suivi des dettes fournisseurs, gestion des paiements et historique des opérations de crédit.",
    addProviderBtn: "Nouveau Fournisseur",
    editProviderBtn: "Modifier Fournisseur",
    deleteProviderBtn: "Supprimer Fournisseur",
    providerDetails: "Fiche Fournisseur",
    providerName: "Nom / Raison Sociale",
    contactPerson: "Personne de Contact",
    iceTaxId: "Identifiant Fiscal (ICE / RC)",
    currentCredit: "Solde Dû / Dette",
    initialCredit: "Solde Initial",
    totalDebts: "Total Dettes Fournisseurs",
    totalPaid: "Total Règlements Effectués",
    providersWithDebt: "Fournisseurs avec Dette",
    totalProviders: "Total Fournisseurs",
    tabProvidersList: "Répertoire des Fournisseurs",
    tabGlobalCreditHistory: "Historique Global des Crédits",
    creditHistory: "Historique de Crédit",
    creditHistoryFor: "Historique de Crédit - Fournisseur",
    recordCreditOperation: "Nouvelle Opération",
    recordPayment: "Enregistrer un Règlement",
    newPurchaseCredit: "Achat à Crédit (Facture)",
    operationType: "Type d'opération",
    typePurchaseCredit: "Achat à Crédit (Dette +)",
    typePayment: "Paiement / Règlement (Dette -)",
    typeCreditNote: "Avoir / Retour (Dette -)",
    amount: "Montant",
    operationDate: "Date de l'opération",
    paymentMethod: "Mode de règlement",
    methodCash: "Espèces (Caisse)",
    methodCheque: "Chèque bancaire",
    methodTransfer: "Virement bancaire",
    methodPromissoryNote: "Traite / Effet",
    methodOther: "Autre mode",
    referenceDoc: "N° Pièce / Référence",
    notesRemarks: "Notes & Remarques",
    balanceAfter: "Solde restant",
    actions: "Actions",
    confirmDeleteProvider: "Confirmer la suppression",
    confirmDeleteMsg: "Êtes-vous sûr de vouloir supprimer définitivement ce fournisseur et tout son historique de crédit ?",
    searchProviderPlaceholder: "Rechercher par nom, téléphone, ICE, ville...",
    filterDebtOnly: "Avec Solde Dû (> 0)",
    filterZeroDebt: "Soldé (0 DH)",
    filterAllProviders: "Tous les fournisseurs",
    statementTitle: "Relevé de Compte Fournisseur",
    printStatement: "Imprimer Relevé",
    noOperations: "Aucune opération de crédit enregistrée.",
    noProvidersFound: "Aucun fournisseur ne correspond à vos critères.",
    statusActive: "Actif",
    statusInactive: "Inactif",
    providerCreatedSuccess: "Fournisseur créé avec succès !",
    providerUpdatedSuccess: "Fournisseur mis à jour avec succès !",
    providerDeletedSuccess: "Fournisseur supprimé avec succès !",
    operationSavedSuccess: "Opération de crédit enregistrée avec succès !",
    deleteOperationConfirm: "Êtes-vous sûr de vouloir annuler cette opération de crédit ?",
    adminOnlyNotice: "Seul un Administrateur peut ajouter, modifier ou supprimer un fournisseur.",

    // KMS Products & Multi-Units
    products: "Produits KMS",
    productsHeading: "Catalogue Produits & Commandes KMS",
    productsSubheading: "Interface rapide et optimisée : multi-unités de vente, comparateur de prix fournisseurs et ajout direct au panier.",
    sku: "SKU / Réf",
    barcode: "Code-barres",
    category: "Catégorie",
    allCategories: "Toutes les catégories",
    stock: "Stock disponible",
    minStock: "Stock Min",
    baseUnit: "Unité de base",
    sellingUnits: "Unités de vente",
    supplier: "Fournisseur",
    allSuppliers: "Tous les fournisseurs",
    supplierPrices: "Prix Fournisseurs",
    compareSuppliers: "Comparer Fournisseurs",
    cheapestSupplier: "Meilleur Prix",
    priceDifference: "Écart de prix",
    addToCart: "Ajouter au Panier",
    cart: "Panier KMS",
    cartEmpty: "Votre panier de commande est vide.",
    totalCart: "Total Commande",
    checkoutCart: "Valider la Commande",
    clearCart: "Vider le panier",
    inStock: "En stock",
    lowStock: "Stock faible",
    outOfStock: "Rupture de stock",
    priceRange: "Fourchette de prix",
    fastSearch: "Recherche instantanée (Nom, SKU, Code-barres)...",
    addProduct: "Nouveau Produit",
    editProduct: "Modifier Produit",
    deleteProduct: "Supprimer Produit",
    productSaved: "Produit enregistré avec succès !",
    productDeleted: "Produit supprimé avec succès !",
    orderCreated: "Commande validée avec succès !",
    orderType: "Type de commande",
    quickStockUpdate: "Ajuster Stock",
    conversionFactor: "Facteur de conversion",
    sellingPrice: "Prix de vente",
    costPrice: "Prix d'achat",
    cartDrawerTitle: "Panier & Commande Rapide",
    quickAdd: "+ Panier",
    purchaseOrderBtn: "Bon de Commande",
    articlesReferenced: "Articles Référencés",
    inCatalog: "en catalogue",
    toRestock: "à réapprovisionner",
    completeStockout: "rupture complète",
    stockValueCost: "Valeur du Stock (Achat)",
    catalogTab: "Catalogue & Tarifs Grossistes",
    purchasesHistoryTab: "Historique des Achats & Bons Fournisseurs",
    allFilter: "Tous",
    priceDA: "Prix (DA):",
    sortBy: "Trier par:",
    sortNameAsc: "Nom (A → Z)",
    sortNameDesc: "Nom (Z → A)",
    sortPriceCheap: "Prix (Moins cher)",
    sortPriceExp: "Prix (Plus cher)",
    sortStockAsc: "Stock (Croissant)",
    sortStockDesc: "Stock (Décroissant)",
    articleRef: "Article & Référence",
    stockAvailable: "Stock Disponible",
    caisseAndSupplier: "Caisse & Fournisseur",
    unitsAndPrices: "Unités & Tarifs (Gros / Détail)",
    supplierPurchase: "Achat Fournisseur",
    noArticlesMatchFilter: "Aucun article ne correspond à vos filtres de recherche",
    noCatalogProducts: "Aucun produit enregistré pour le moment",
    resetFiltersHint: "Essayez de réinitialiser vos critères de recherche ou de modifier les filtres ci-dessus.",
    addFirstProductHint: "Votre catalogue est vide. Cliquez ci-dessous pour ajouter votre premier produit.",
    generalCategory: "Général",
    adjustStockTooltip: "Ajuster l'inventaire en stock",
    inReserve: "En réserve",
    caisseLabel: "Caisse:",
    defaultLabel: "Par défaut",
    supplierShort: "Fourn:",
    suppliersCount: "{count} fournisseurs",
    purchaseShort: "Achat:",
    saleShort: "Vente:",
    addPurchaseBtn: "+ Achat",
    showingItems: "Affichage de {from} à {to} sur {total} articles",
    perPageLabel: "| Par page :",
    previous: "Précédent",
    next: "Suivant",
    receivedPurchaseOrders: "Bons d'Achat Réceptionnés",
    ordersUnit: "commandes",
    cashPayouts: "Sorties Caisse (Payé Cash)",
    supplierDebtsKPI: "Dettes Fournisseurs (Crédit)",
    totalPurchaseVolume: "Volume Total d'Achats",
    searchOrdersPlaceholder: "Rechercher par N°, fournisseur, caisse...",
    allSuppliersFilter: "Tous les fournisseurs",
    allCaissesFilter: "Toutes les caisses",
    allPaymentsFilter: "Tous règlements",
    paymentCash: "Espèces (Cash)",
    paymentMixte: "Mixte (Acompte + Dette)",
    paymentCredit: "À Crédit (Dette)",
    paymentTransfer: "Virement bancaire",
    paymentCheque: "Chèque",
    dateTo: "à",
    resetFilters: "Réinitialiser",
    refAndDate: "Réf & Date",
    caisseDebited: "Caisse Débitée",
    paymentAndDebts: "Règlement & Dettes",
    articlesCount: "Articles",
    totalAmount: "Montant Total",
    loadingOrders: "Chargement de l'historique des achats...",
    noOrdersFound: "Aucun bon d'achat correspondant aux critères",
    paidAmountShort: "Versé :",
    debtAmountShort: "Dette :",
    detailsBtn: "Détails",
    showingOrders: "Affichage de {from} à {to} sur {total} bon(s) d'achat",
    purchaseOrderTitle: "Bon de Commande Fournisseur",
    purchaseOrderSubtitle: "Achat grossiste & Réapprovisionnement stock",
    refreshWholesaleRates: "Actualiser tarifs",
    caissePaymentLabel: "Caisse de paiement :",
    autoPerProduct: "Automatique par article",
    paymentMethodLabel: "Règlement :",
    debitCaisseCheckbox: "Débiter la caisse",
    wholesaleCost: "Achat gros :",
    customerSale: "Vente client :",
    subtotalWholesale: "Sous-total Achat Fournisseur",
    versementsAndCreditBySupplier: "Versements & Crédit par Fournisseur",
    currentDebt: "Dette actuelle :",
    orderTotal: "Total de la commande :",
    versementCash: "Versement (Sortie Caisse) :",
    fullyPaidNoDebt: "Payé intégralement (aucune dette générée)",
    remainingCreditForOrder: "Reste à crédit pour ce bon :",
    newSupplierDebt: "Nouvelle dette fournisseur :",
    wholesaleOrderTotal: "Total Commande Grossiste :",
    cashOutflowVersements: "Sortie Caisse (Versements) :",
    remainingCreditDebts: "Reste à Crédit (Dettes) :",
    orderFullyPaidCash: "Commande réglée à 100% au comptant",
    validateOrderBtn: "Valider",
    orderDetailsTitle: "Bon d'Achat Fournisseur",
    deleteOrderBtn: "Supprimer ce bon",
    confirmDeleteOrderTitle: "Confirmer l'annulation du bon",
    confirmDeleteOrderDesc: "Êtes-vous sûr de vouloir supprimer et annuler ce bon d'achat ?",
    confirmDeleteBtn: "Confirmer la suppression",
    caisseAssociated: "Caisse associée",
    articleDesignation: "Désignation Article",
    unit: "Unité",
    quantity: "Quantité",
    unitPrice: "Prix Unitaire",
    subtotal: "Sous-total",
    saveChanges: "Enregistrer modifications",
    noOrderItems: "Aucun détail d'article disponible",
    orderReceivedItems: "Articles réceptionnés dans ce bon",
    grandTotal: "Total Général",
    modifyOrderParams: "Modifier les paramètres du bon",
    caisseAttachment: "Caisse de rattachement",
    noCaisseOption: "-- Aucune caisse --",
    cashOutflowLabel: "Montant Versé (Sortie Caisse)",
    remainingDebtLabel: "Reste à Crédit (Dette Fournisseur)",
    orderFullPaidNotice: "La commande sera intégralement réglée en caisse (aucune dette fournisseur).",
    deleteOrderWarning: "Action automatique et réversible :",
    deleteOrderPoint1: "Les quantités de stock entrées seront automatiquement déduites via les déclencheurs de base de données.",
    deleteOrderPoint2: "Si une transaction de caisse était liée, elle sera annulée et remboursée.",
    deleteOrderPoint3: "Si un achat à crédit fournisseur était enregistré, la dette sera automatiquement régularisée.",

    // Multi-Caisse & Trésorerie
    caisses: "Caisses & Trésorerie",
    caissesHeading: "Gestion Multi-Caisse & Trésorerie",
    caissesSubheading: "Supervision des caisses indépendantes, suivi des flux d'entrées/sorties, transferts et statistiques en direct.",
    tabCaissesList: "Caisses Enregistreuses",
    tabTransactions: "Journal des Flux",
    tabCategories: "Catégories de Flux",
    tabSessions: "Sessions & Clôtures",
    openCaisse: "Ouvrir Caisse",
    closeCaisse: "Clôturer Caisse",
    newTransaction: "Nouvelle Opération",
    transfer: "Transfert Inter-Caisse",
    caisseBalance: "Solde de Caisse",
    totalCaissesBalance: "Trésorerie Globale",
    totalInflows: "Total Entrées",
    totalOutflows: "Total Sorties",
    netCashFlow: "Flux Net (Solde Réel)",
    activeCaisses: "Caisses Actives / Ouvertes",
    allCaisses: "Toutes les Caisses (Vue Globale)",
    sourceCaisse: "Caisse Débitée (Source)",
    destinationCaisse: "Caisse Créditée (Destination)",
    transactionCategory: "Catégorie de Flux",
    systemProtectedCategory: "Catégorie Système (Fixe)",
    customCategory: "Catégorie Personnalisée",
    openingBalance: "Fond de Roulement Initial",
    closingBalance: "Solde à la Clôture",
    actualCounted: "Espèces Réelles Comptées",
    expectedBalance: "Solde Théorique Attendu",
    cashDifference: "Écart de Caisse",
    perPage: "Par page",
    page: "Page",
    of: "sur",
    total: "Total",
    inflow: "Entrée (+)",
    outflow: "Sortie (-)",
    transferOut: "Transfert Sortant (⇄)",
    transferIn: "Transfert Entrant (⇄)",

    // Employee Payroll
    empPageTitle: "Paiement des Employés",
    empPageSubtitle: "Gestion de la paie, avances et dettes · Base SQLite en temps réel",
    empNewEmployee: "Nouvel Employé",
    empRefresh: "Actualiser",
    empKpiPeriod: "Période des KPIs :",
    empTotalEmployees: "Nombre total d'employés",
    empMasseSalariale: "Masse salariale du mois",
    empTotalPaid: "Total salaires payés",
    empSalaireRestant: "Salaires restants à payer",
    empTotalAdvances: "Total avances accordées",
    empTotalDebts: "Total dettes des employés",
    empTotalDepenses: "Dépenses totales employés",
    empSearchPlaceholder: "Rechercher par nom, CIN, département…",
    empAllStatuses: "Tous les statuts",
    empAllDepts: "Tous les départements",
    empColEmployee: "Employé",
    empColDeptPost: "Département / Poste",
    empColBaseSalary: "Salaire base",
    empColTotalPaid: "Total payé",
    empColAdvances: "Avances",
    empColDebts: "Dettes",
    empColStatus: "Statut",
    empColActions: "Actions",
    empNoEmployees: "Aucun employé trouvé",
    empNoEmployeesHint: 'Cliquez sur "Nouvel Employé" pour commencer',
    empStatusActif: "Actif",
    empStatusInactif: "Inactif",
    empStatusConge: "En congé",
    empPage: "Page",
    empOf: "/",
    empResults: "résultats",
    empPrev: "Préc.",
    empNext: "Suiv.",
    empModalNewTitle: "Nouvel Employé",
    empModalEditPrefix: "Modifier —",
    empFieldFullName: "Nom complet *",
    empFieldCin: "CIN",
    empFieldPhone: "Téléphone",
    empFieldEmail: "Email",
    empFieldDept: "Département",
    empFieldPost: "Poste",
    empFieldBaseSalary: "Salaire de base (DA) *",
    empFieldHireDate: "Date d'embauche",
    empFieldStatus: "Statut",
    empFieldAddress: "Adresse",
    empFieldNotes: "Notes",
    empBtnCancel: "Annuler",
    empBtnCreate: "Créer l'employé",
    empBtnSaveChanges: "Enregistrer les modifications",
    empPayModalPrefix: "Payer le salaire —",
    empPayBaseSalaryLabel: "Salaire de base mensuel",
    empPayMonth: "Mois",
    empPayYear: "Année",
    empPayBonuses: "Primes / Bonus (DA)",
    empPayDeductions: "Retenues (DA)",
    empPayAdvanceDeducted: "Avance déduite (DA)",
    empPayMethod: "Mode de paiement",
    empPayMethodCash: "💵 Espèces",
    empPayMethodTransfer: "🏦 Virement bancaire",
    empPayMethodCheque: "📄 Chèque",
    empPayMethodOther: "🔄 Autre",
    empPayDate: "Date de paiement",
    empPayNotes: "Notes",
    empPayNetLabel: "Net à payer",
    empPayBtnSubmit: "Enregistrer le paiement",
    empAdvModalPrefix: "Avance sur salaire —",
    empAdvAmount: "Montant (DA) *",
    empAdvDate: "Date",
    empAdvReason: "Motif",
    empAdvMethod: "Mode de paiement",
    empAdvReference: "Référence",
    empAdvBtnSubmit: "Accorder l'avance",
    empDebtModalPrefix: "Enregistrer une dette —",
    empDebtAmount: "Montant (DA) *",
    empDebtDate: "Date",
    empDebtDescription: "Description",
    empDebtBtnSubmit: "Enregistrer la dette",
    empDetailPrefix: "Dossier —",
    empTabInfo: "👤 Infos",
    empTabSalaires: "💰 Salaires",
    empTabAvances: "⬆️ Avances",
    empTabDettes: "⚠️ Dettes",
    empInfoDept: "Département",
    empInfoPost: "Poste",
    empInfoPhone: "Téléphone",
    empInfoEmail: "Email",
    empInfoAddress: "Adresse",
    empInfoHireDate: "Date d'embauche",
    empInfoBaseSalary: "Salaire de base",
    empInfoCin: "CIN",
    empInfoNotes: "Notes",
    empSalColMonth: "Mois / Année",
    empSalColBase: "Salaire base",
    empSalColBonuses: "Primes",
    empSalColDeductions: "Retenues",
    empSalColAdvDed: "Avance déduite",
    empSalColNet: "Net payé",
    empSalColMethod: "Mode",
    empSalColDate: "Date",
    empAdvColDate: "Date",
    empAdvColAmount: "Montant",
    empAdvColReason: "Motif",
    empAdvColMethod: "Mode",
    empDebtColDate: "Date",
    empDebtColDesc: "Description",
    empDebtColAmount: "Montant",
    empDebtColRemaining: "Restant",
    empDebtColStatus: "Statut",
    empEmptyPayments: "Aucun paiement de salaire enregistré",
    empEmptyAdvances: "Aucune avance accordée",
    empEmptyDebts: "Aucune dette enregistrée",
    empToastCreated: "Employé créé avec succès",
    empToastUpdated: "Employé mis à jour",
    empToastDeleted: "Employé supprimé",
    empToastNameRequired: "Le nom est requis",
    empToastInvalidAmount: "Montant invalide",
    empToastAdvGranted: "Avance accordée",
    empToastDebtSaved: "Dette enregistrée",
    empToastAdvDeleted: "Avance supprimée",
    empToastPayDeleted: "Paiement supprimé",
    empToastDebtDeleted: "Dette supprimée",
    empConfirmDelete: "Supprimer l'employé \"{name}\" ? Toutes ses données seront effacées.",
    empConfirmDeleteAdv: "Supprimer cette avance ?",
    empConfirmDeletePay: "Supprimer ce paiement ?",
    empConfirmDeleteDebt: "Supprimer cette dette ?",
    empMonths: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],

    // Clients & Dettes Clients
    clients: "Clients & Dettes",
    clientsHeading: "Gestion des Clients & Suivi des Dettes",
    clientsSubheading: "Suivi complet des dettes clients, historique des produits pris en stock et traçabilité des encaissements par caisse (Caisse Principale, Caisse Tabac...).",
    newClient: "Nouveau Client",
    giveProductDebt: "Donner un Produit / Dette",
    settleDebt: "Régler la Dette",
    clientDebts: "Dettes Clients",
    clientBlockedNotice: "Avec Dette en cours",
    clientClearNotice: "Client Soldé (À jour)",
    clientCannotBuyWarning: "Ce client a une dette en cours. Vous pouvez tout de même lui accorder des produits en stock selon votre décision.",
    lastTakenProduct: "Dernier produit pris",
    clientHistory: "Historique & Relevé",

    // Navigation & POS/Dashboard/Historique Tabs
    posSale: "Vente / Caisse",
    salesHistory: "Historique des Ventes",
    dashboardPerformance: "Tableau de Bord",
    servicesMenu: "Services & Flexy",
    titlePos: "Point de Vente",
    titleSalesHistory: "Historique des Ventes",
    titleDashboardPerformance: "Tableau de Bord / Statistiques",
    titleServices: "Multi-Services & Flexy",

    // Dashboard Page
    dashTitle: "Tableau de Bord / Performance des Ventes",
    dashSubtitle: "Indicateurs clés, chiffres d'affaires, marges et répartition",
    dashDateFrom: "De",
    dashDateTo: "à",
    dashRefresh: "Actualiser",
    dashLoading: "Chargement des statistiques...",
    dashNbSales: "Nombre de ventes",
    dashTotalRevenue: "Chiffre d'affaires",
    dashTotalCash: "Total encaissé",
    dashNewCredit: "Nouveaux crédits générés",
    dashCostSales: "Coût des ventes",
    dashGrossProfit: "Marge brute",
    dashTotalClientCredit: "Crédit total clients (tous)",
    dashActiveDebts: "Dettes actives en cours",
    dashPerfByUser: "Performance par Caissier / Vendeur",
    dashTopProducts: "Top Produits Vendus",
    dashColCashier: "Caissier",
    dashColNbSales: "Nb Ventes",
    dashColRevenue: "Chiffre d'Affaires",
    dashColCollected: "Encaissé",
    dashColMargin: "Marge",
    dashColProduct: "Produit",
    dashColQtySold: "Qté vendue",
    dashNoData: "Aucune donnée",

    // Rich Statistics Engine
    statsTabOverview: "Aperçu & KPIs",
    statsTabTrends: "Tendances & Ventes",
    statsTabProducts: "Analyse Produits",
    statsTabCashiers: "Équipe & Caissiers",
    statsTabTreasury: "Trésorerie & Caisses",
    statsTabCredit: "Crédits & Recouvrements",
    statsTabEmployees: "Paie & Avances",
    statsTabReconciliation: "Réconciliation & Audit",

    statsFilterToday: "Aujourd'hui",
    statsFilterYesterday: "Hier",
    statsFilter7Days: "7 derniers jours",
    statsFilterThisMonth: "Ce mois",
    statsFilterLastMonth: "Mois dernier",
    statsFilterThisYear: "Cette année",
    statsFilterCustom: "Personnalisé",

    statsMarginRate: "Taux de Marge",
    statsAvgBasket: "Panier Moyen",
    statsInventoryValuationCost: "Valeur Stock (Coût d'achat)",
    statsInventoryValuationSelling: "Valeur Stock (Prix vente)",
    statsPotentialMargin: "Marge Potentielle Stock",
    statsLowStockAlerts: "Articles en alerte stock",
    statsOutOfStock: "Ruptures de stock",
    statsCashCollected: "Cash Encaissé",
    statsCreditRepaid: "Crédits Remboursés",
    statsNetCreditChange: "Variation Nette Créances",
    statsTotalSalaries: "Salaires Versés",
    statsTotalAdvances: "Avances Versées",
    statsLiveCashRegisters: "Trésorerie Réelle (Caisses)",
    statsLiveClientDebt: "Créances Clients Réelles",
    statsActiveDebtors: "Clients endettés",
    statsReconcileBtn: "Vérifier & Réconcilier",
    statsReconcileRunning: "Réconciliation en cours...",
    statsReconcileDesc: "Vérifie l'intégrité des tables récapitulatives avec les transactions originales et répare les écarts éventuels.",
    statsLastReconciled: "Dernière réconciliation :",
    statsLastUpdated: "Mis à jour le :",
    statsReconcileSuccess: "Réconciliation terminée avec succès ! Les agrégats sont parfaitement synchronisés.",
    statsReconciliationLogsTitle: "Historique des Réconciliations",

    // Historique Page
    histTitle: "Historique des Ventes",
    histSubtitle: "Consultez, filtrez et régularisez les paiements de toutes vos ventes",
    histSearchPlaceholder: "Rechercher (N° Vente, client, caissier)...",
    histAllStatus: "Tous statuts",
    histStatusPaid: "Payé",
    histStatusPartial: "Partiel",
    histStatusCredit: "Crédit",
    histFilterBtn: "Filtrer",
    histColSaleNum: "N° Vente",
    histColDate: "Date",
    histColClient: "Client",
    histColCashier: "Caissier",
    histColTotal: "Total",
    histColPaid: "Encaissé",
    histColCredit: "Crédit",
    histColStatus: "Statut",
    histColActions: "Actions",
    histLoading: "Chargement des ventes...",
    histNoSales: "Aucune vente trouvée",
    histViewDetails: "Voir détails",
    histCollectCredit: "Encaisser crédit",
    histDeleteSale: "Supprimer vente",
    histPageOf: "Page {page} sur {totalPages} ({total} ventes au total)",
    histPrev: "Précédent",
    histNext: "Suivant",
    histGeneralInfo: "Informations générales",
    histRemainingCredit: "Crédit restant",
    histSoldItems: "Articles vendus",
    histReceivedPayments: "Paiements reçus",
    histRecordPayment: "Enregistrer paiement",
    histCreditRemainingPay: "Crédit restant à payer",
    histDestCaisse: "Caisse destinataire",
    histNoCaisse: "-- Sans caisse --",
    histAmountRcv: "Montant reçu",
    histNotesOptional: "Notes (optionnel)",
    histNotesPlaceholder: "Remarques...",
    histConfirmPayment: "Confirmer paiement",
    histPaymentSavedToast: "Paiement enregistré avec succès",
    histSaleDeletedToast: "Vente supprimée avec succès",
    histDeleteConfirm: "Supprimer la vente {num} ? (Le stock des articles sera restauré)",
    histGrossProfit: "Marge brute",

    // Ventes / POS Page
    posTitle: "Point de Vente",
    posInService: "En service",
    posSearchKbd: "Chercher",
    posFavoritesKbd: "Favoris",
    posTigePackKbd: "Tige/Pqt",
    posDebtKbd: "Dette",
    posCheckoutKbd: "Encaisser",
    posScanBarcode: "Scan code-barres douchette...",
    posSearchItem: "Recherche article [F2]...",
    posRefreshItems: "Actualiser les produits",
    posTabFavorites: "Favoris",
    posTabAll: "Tous",
    posTabTobacco: "Tabac & Cigarettes",
    posAllCategories: "Toutes catégories",
    posActiveMode: "Mode actif :",
    posSwitchToSingle: "Passer en Tige",
    posSwitchToPack: "Passer en Paquet",
    posCart: "PANIER",
    posEmptyCart: "VIDER",
    posClientWalkIn: "Client comptoir / dette...",
    posCartEmptyTitle: "Panier vide",
    posCartEmptySubtitle: "Scannez ou cliquez un article",
    posTotalToPay: "TOTAL À PAYER",
    posDirectPay: "ENCAISSER DIRECT",
    posEnterKey: "[↵ Entrée]",
    posDebtBtn: "DETTE [D]",
    posLastReceipt: "Dernier reçu",
    posSaleToCredit: "Vente à Crédit / Dette Client",
    posDebtAmount: "MONTANT DE LA DETTE",
    posBeneficiaryClient: "Client bénéficiaire *",
    posSearchClient: "Rechercher un client...",
    posCurrentDebt: "Dette actuelle :",
    posNoteReason: "Note / Motif",
    posNotePlaceholder: "Note sur la dette...",
    posValidateDebt: "Valider la Dette",
    posReceipt: "Ticket de Caisse",
    posThankYou: "Merci pour votre visite !",
    posPrint: "Imprimer",
    posSoundEnable: "Activer les sons",
    posSoundDisable: "Désactiver les sons",
    posNoFavoriteItems: "Aucun article favori pour la caisse",
    posNoItemsFound: "Aucun article trouvé",
    posSeeAllItems: "Voir tous les articles",
    posDiscount: "Remise",
    posArticleCount: "article(s)",
    posMargin: "Marge:",
    posCashReceived: "Espèces reçues (DA)",
    posChangeReturned: "Monnaie à rendre :",
    posRemainingCredit: "Reste à crédit :",
    posPartialPayOptions: "Paiement partiel / Options",
    posConfirmPayment: "Confirmer l'encaissement",
    posPleaseSelectClient: "Veuillez sélectionner un client ci-dessous pour enregistrer ce reste en dette.",
    posSingle: "Tige",
    posPack: "Paquet",
    posNextScans: "(Scans suivants : {unit})",
    posLoadingItems: "Chargement des articles...",

    // Debt Settlement Modal (Clients)
    settleDebtTitle: "Règlement de Dette Client",
    settleDebtSubtitle: "Encaisser le versement et affecter les fonds à la caisse choisie",
    clientConcerned: "Client concerné :",
    currentDebtDue: "Dette actuelle due :",
    lastTakenProductSnippet: "Dernier produit pris en dette précédemment :",
    amountToCollect: "Montant à Encaisser (DA) *",
    totalBalanceBtn: "Solde Total",
    destCaisseLabel: "📍 Caisse de Destination (Où mettre l'argent encaissé ?) *",
    caisseSelected: "Caisse sélectionnée",
    primaryCaisse: "Principale",
    effectiveDepositIn: "Dépôt effectif dans :",
    newEstimatedBalance: "Nouveau solde prévu :",
    paymentMode: "Mode de versement",
    paymentDate: "Date de paiement",
    modeCash: "Espèces (Encaisser en liquide)",
    modeTransfer: "Virement bancaire",
    modeCheck: "Chèque",
    modeOther: "Autre",
    notesRef: "Remarques / Référence",
    fullDebtSettledBanner: "Ce versement solde intégralement la dette du client (Solde restant : 0.00 DA).",
    partialDebtSettledBanner: "Règlement partiel : Reste dû",
    validateSettlementBtn: "Encaisser et Valider le Règlement"
  },

  en: {
    appName: "imatechx",
    sqliteOnline: "SQLite Online",
    dashboard: "Dashboard",
    shipments: "Shipments",
    inventory: "Inventory & Items",
    warehouses: "Warehouses",
    users: "Roles & Access",
    settings: "Settings",
    logout: "Log Out",
    refresh: "Refresh",
    save: "Save Changes",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    date: "Date",
    search: "Search...",
    filterAll: "All Statuses",
    adminBadge: "ADMIN",

    tabLanguage: "Language & Region",
    tabPrinter: "Printers & Receipts",
    tabStore: "Store Information",
    tabAccount: "Account Management",
    tabBackup: "Backup & Restore",

    titleDashboard: "Logistics Dashboard",
    titleShipments: "Shipment Tracking & Operations",
    titleInventory: "Warehouse Inventory & Products",
    titleWarehouses: "Warehouse Network",
    titleUsers: "User Management & Access Control",
    titleSettings: "System Configuration & Settings",

    languageHeading: "Language & Regional Preferences",
    languageSubheading: "Select your preferred application language and customize regional display settings.",
    selectLanguage: "Software Language",
    dateFormat: "Date Format",
    currencyFormat: "Currency Format",
    languagePreview: "Live Preview",
    sampleDate: "Sample Date",
    sampleAmount: "Sample Amount",
    savedLanguageNotice: "Language preference updated successfully.",

    printerHeading: "Printer Setup & Output Options",
    printerSubheading: "Configure POS thermal printers for receipts and laser printers for delivery notes & invoices.",
    detectPrintersBtn: "Scan System Printers",
    printersDetected: "printer(s) found",
    receiptPrinter: "Receipt & Ticket Printer (Thermal)",
    invoicePrinter: "Invoice & Delivery Slip Printer (Laser/A4)",
    barcodePrinter: "Barcode & Label Printer",
    paperSize: "Thermal Paper Width",
    autoCutPaper: "Auto-cut receipt paper upon completion",
    cashDrawer: "Open cash drawer automatically",
    numberOfCopies: "Default Print Copies",
    silentPrinting: "Silent Direct Printing (no dialog prompt)",
    testPrintBtn: "Print Test Receipt",
    testPrintReceipt: "Test Receipt",
    testPrintSuccess: "Test page sent to printer successfully!",
    noPrintersFound: "No physical printers detected. Virtual simulator active.",
    thermalPaperDesc: "Optimized for 80mm or 58mm thermal rolls.",
    laserPaperDesc: "Standard A4 or A5 pages for commercial documents.",

    storeHeading: "Store & Company Profile",
    storeSubheading: "This information will automatically appear on your invoices, receipts, and packing slips.",
    storeName: "Company / Warehouse Name",
    storeTagline: "Commercial Tagline / Subtitle",
    commercialRegister: "Company Registration / Trade Register",
    taxIdentification: "Tax ID / VAT / ICE Number",
    address: "Physical Address",
    city: "City",
    postalCode: "Postal Code",
    country: "Country",
    phone: "Primary Phone Number",
    phoneAlt: "Secondary Phone / WhatsApp",
    email: "Contact Email",
    website: "Company Website",
    defaultCurrency: "Primary Currency Symbol",
    invoiceFooterNote: "Invoice & Receipt Footer Note",
    storeLogo: "Official Company Logo",
    uploadLogo: "Change Logo",
    saveStoreBtn: "Save Store Information",
    storeSavedSuccess: "Store details saved successfully.",

    accountHeading: "User Account & Security",
    accountSubheading: "Manage your credentials, change password, and inspect security logs.",
    profileDetails: "Current User Profile",
    fullName: "Full Name",
    username: "Username",
    userRole: "Assigned Role",
    roleDescription: "Permissions associated with your role govern what actions you can execute.",
    changePasswordTitle: "Change Account Password",
    currentPassword: "Old / Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    updateProfileBtn: "Update Profile Info",
    updatePasswordBtn: "Save New Password",
    accountUpdatedSuccess: "Profile updated successfully!",
    passwordMismatch: "The passwords do not match.",
    wrongCurrentPassword: "The current password entered is incorrect.",
    switchAccountTitle: "Quick Switch User",
    securityLogsTitle: "Recent Security & Activity Log",
    noSecurityLogs: "No recent activity records found.",
    timeCol: "Date & Time",
    userCol: "User",
    actionCol: "Action Description",

    backupHeading: "Database Backup & Restoration",
    backupSubheading: "Safeguard your warehouse distribution database with full backups or restore previous data.",
    dbInfoTitle: "Local SQLite Database Health",
    dbType: "Database Engine",
    dbLocation: "File Location",
    lastBackupDate: "Last Backup Taken",
    neverBackedUp: "No backups recorded yet",
    exportBackupSection: "Create Backup Now",
    exportDbBtn: "Export SQLite File (.db)",
    exportJsonBtn: "Download Full Archive (.json)",
    exportCsvSection: "Export Data to CSV Files",
    exportCsvInventory: "Export Inventory (CSV)",
    exportCsvShipments: "Export Shipments (CSV)",
    exportCsvWarehouses: "Export Warehouses (CSV)",
    restoreSection: "Restore From Backup File",
    restoreWarning: "Warning: Restoring will overwrite all current data (products, shipments, warehouses) with the backup file.",
    importDbBtn: "Restore SQLite File (.db)",
    importJsonBtn: "Restore from File (.json)",
    restoreSuccess: "Database restored successfully!",
    autoBackupSchedule: "Backup Reminder Frequency",
    freqDaily: "Daily (Recommended)",
    freqWeekly: "Weekly",
    freqManual: "Manual Only",

    // Fournisseurs & Historique de Crédit
    providers: "Suppliers & Providers",
    providersHeading: "Suppliers & Credit Ledger",
    providersSubheading: "Track supplier debts, payment records, and chronological credit history.",
    addProviderBtn: "New Supplier",
    editProviderBtn: "Edit Supplier",
    deleteProviderBtn: "Delete Supplier",
    providerDetails: "Supplier Profile",
    providerName: "Company / Supplier Name",
    contactPerson: "Contact Person",
    iceTaxId: "Tax ID / Registration (ICE)",
    currentCredit: "Current Debt Balance",
    initialCredit: "Initial Balance",
    totalDebts: "Total Outstanding Debts",
    totalPaid: "Total Settled Payments",
    providersWithDebt: "Suppliers with Debt",
    totalProviders: "Total Suppliers",
    tabProvidersList: "Suppliers Directory",
    tabGlobalCreditHistory: "Global Credit History",
    creditHistory: "Credit History",
    creditHistoryFor: "Credit Statement - Supplier",
    recordCreditOperation: "New Operation",
    recordPayment: "Record Payment",
    newPurchaseCredit: "Credit Purchase (Invoice)",
    operationType: "Operation Type",
    typePurchaseCredit: "Credit Purchase (Debt +)",
    typePayment: "Payment / Settlement (Debt -)",
    typeCreditNote: "Credit Note / Return (Debt -)",
    amount: "Amount",
    operationDate: "Transaction Date",
    paymentMethod: "Payment Method",
    methodCash: "Cash",
    methodCheque: "Bank Cheque",
    methodTransfer: "Bank Wire Transfer",
    methodPromissoryNote: "Promissory Note",
    methodOther: "Other",
    referenceDoc: "Document # / Ref",
    notesRemarks: "Notes & Remarks",
    balanceAfter: "Balance After",
    actions: "Actions",
    confirmDeleteProvider: "Confirm Deletion",
    confirmDeleteMsg: "Are you sure you want to permanently delete this supplier and all their credit history?",
    searchProviderPlaceholder: "Search by name, phone, ICE, city...",
    filterDebtOnly: "With Balance Due (> 0)",
    filterZeroDebt: "Cleared (0)",
    filterAllProviders: "All Suppliers",
    statementTitle: "Supplier Account Statement",
    printStatement: "Print Statement",
    noOperations: "No credit transactions recorded.",
    noProvidersFound: "No suppliers match your criteria.",
    statusActive: "Active",
    statusInactive: "Inactive",
    providerCreatedSuccess: "Supplier created successfully!",
    providerUpdatedSuccess: "Supplier updated successfully!",
    providerDeletedSuccess: "Supplier deleted successfully!",
    operationSavedSuccess: "Credit operation saved successfully!",
    deleteOperationConfirm: "Are you sure you want to delete this credit transaction?",
    adminOnlyNotice: "Only Administrators can add, edit, or delete suppliers.",

    // KMS Products & Multi-Units
    products: "KMS Products",
    productsHeading: "KMS Products & Order Management",
    productsSubheading: "Fast and lightweight interface: multi-unit selling, supplier price comparisons, and direct cart ordering.",
    sku: "SKU / Code",
    barcode: "Barcode",
    category: "Category",
    allCategories: "All Categories",
    stock: "Stock Quantity",
    minStock: "Min Stock",
    baseUnit: "Base Unit",
    sellingUnits: "Selling Units",
    supplier: "Supplier",
    allSuppliers: "All Suppliers",
    supplierPrices: "Supplier Prices",
    compareSuppliers: "Compare Suppliers",
    cheapestSupplier: "Best Price",
    priceDifference: "Price Difference",
    addToCart: "Add to Cart",
    cart: "KMS Cart",
    cartEmpty: "Your order cart is empty.",
    totalCart: "Order Total",
    checkoutCart: "Place Order",
    clearCart: "Clear Cart",
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    priceRange: "Price Range",
    fastSearch: "Instant search (Name, SKU, Barcode)...",
    addProduct: "New Product",
    editProduct: "Edit Product",
    deleteProduct: "Delete Product",
    productSaved: "Product saved successfully!",
    productDeleted: "Product deleted successfully!",
    orderCreated: "Order processed successfully!",
    orderType: "Order Type",
    quickStockUpdate: "Adjust Stock",
    conversionFactor: "Conversion Factor",
    sellingPrice: "Selling Price",
    costPrice: "Cost Price",
    cartDrawerTitle: "Cart & Quick Order",
    quickAdd: "+ Cart",
    purchaseOrderBtn: "Purchase Order",
    articlesReferenced: "Referenced Items",
    inCatalog: "in catalog",
    toRestock: "to restock",
    completeStockout: "out of stock",
    stockValueCost: "Stock Value (Cost)",
    catalogTab: "Catalog & Wholesale Prices",
    purchasesHistoryTab: "Purchases & Supplier Orders History",
    allFilter: "All",
    priceDA: "Price (DA):",
    sortBy: "Sort by:",
    sortNameAsc: "Name (A → Z)",
    sortNameDesc: "Name (Z → A)",
    sortPriceCheap: "Price (Lowest)",
    sortPriceExp: "Price (Highest)",
    sortStockAsc: "Stock (Lowest first)",
    sortStockDesc: "Stock (Highest first)",
    articleRef: "Item & Reference",
    stockAvailable: "Available Stock",
    caisseAndSupplier: "Register & Supplier",
    unitsAndPrices: "Units & Prices (Wholesale / Retail)",
    supplierPurchase: "Supplier Purchase",
    noArticlesMatchFilter: "No items match your search filters",
    noCatalogProducts: "No products registered yet",
    resetFiltersHint: "Try resetting your search filters or modifying the criteria above.",
    addFirstProductHint: "Your catalog is empty. Click below to add your first product.",
    generalCategory: "General",
    adjustStockTooltip: "Adjust inventory in stock",
    inReserve: "In stock",
    caisseLabel: "Register:",
    defaultLabel: "Default",
    supplierShort: "Supp:",
    suppliersCount: "{count} suppliers",
    purchaseShort: "Cost:",
    saleShort: "Sale:",
    addPurchaseBtn: "+ Purchase",
    showingItems: "Showing {from} to {to} of {total} items",
    perPageLabel: "| Per page:",
    previous: "Previous",
    next: "Next",
    receivedPurchaseOrders: "Received Purchase Orders",
    ordersUnit: "orders",
    cashPayouts: "Cash Outflows (Paid Cash)",
    supplierDebtsKPI: "Supplier Debts (Credit)",
    totalPurchaseVolume: "Total Purchase Volume",
    searchOrdersPlaceholder: "Search by #, supplier, register...",
    allSuppliersFilter: "All suppliers",
    allCaissesFilter: "All registers",
    allPaymentsFilter: "All payments",
    paymentCash: "Cash",
    paymentMixte: "Mixed (Deposit + Debt)",
    paymentCredit: "On Credit (Debt)",
    paymentTransfer: "Bank Transfer",
    paymentCheque: "Check",
    dateTo: "to",
    resetFilters: "Reset",
    refAndDate: "Ref & Date",
    caisseDebited: "Debited Register",
    paymentAndDebts: "Payment & Debts",
    articlesCount: "Items",
    totalAmount: "Total Amount",
    loadingOrders: "Loading purchase history...",
    noOrdersFound: "No purchase orders match criteria",
    paidAmountShort: "Paid:",
    debtAmountShort: "Debt:",
    detailsBtn: "Details",
    showingOrders: "Showing {from} to {to} of {total} order(s)",
    purchaseOrderTitle: "Supplier Purchase Order",
    purchaseOrderSubtitle: "Wholesale purchase & stock replenishment",
    refreshWholesaleRates: "Update rates",
    caissePaymentLabel: "Payment register:",
    autoPerProduct: "Automatic per item",
    paymentMethodLabel: "Payment:",
    debitCaisseCheckbox: "Debit register",
    wholesaleCost: "Wholesale cost:",
    customerSale: "Customer sale:",
    subtotalWholesale: "Supplier Purchase Subtotal",
    versementsAndCreditBySupplier: "Payments & Credit per Supplier",
    currentDebt: "Current debt:",
    orderTotal: "Order total:",
    versementCash: "Payment (Cash outflow):",
    fullyPaidNoDebt: "Paid in full (no debt created)",
    remainingCreditForOrder: "Remaining credit for this order:",
    newSupplierDebt: "New supplier debt:",
    wholesaleOrderTotal: "Wholesale Order Total:",
    cashOutflowVersements: "Cash Outflow (Payments):",
    remainingCreditDebts: "Remaining Credit (Debts):",
    orderFullyPaidCash: "Order 100% paid in cash",
    validateOrderBtn: "Validate",
    orderDetailsTitle: "Supplier Purchase Order",
    deleteOrderBtn: "Delete this order",
    confirmDeleteOrderTitle: "Confirm order cancellation",
    confirmDeleteOrderDesc: "Are you sure you want to delete and cancel this purchase order?",
    confirmDeleteBtn: "Confirm deletion",
    caisseAssociated: "Associated Register",
    articleDesignation: "Item Description",
    unit: "Unit",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    subtotal: "Subtotal",
    saveChanges: "Save modifications",
    noOrderItems: "No item details available",
    orderReceivedItems: "Items received in this order",
    grandTotal: "Grand Total",
    modifyOrderParams: "Edit order settings",
    caisseAttachment: "Associated Cash Register",
    noCaisseOption: "-- No register --",
    cashOutflowLabel: "Paid Amount (Register Outflow)",
    remainingDebtLabel: "Remaining on Credit (Supplier Debt)",
    orderFullPaidNotice: "The order will be fully paid from register (no supplier debt).",
    deleteOrderWarning: "Automatic and reversible action:",
    deleteOrderPoint1: "Stock quantities entered will be automatically deducted by database triggers.",
    deleteOrderPoint2: "If a cash register transaction was linked, it will be cancelled and refunded.",
    deleteOrderPoint3: "If a supplier credit purchase was recorded, the debt will be automatically settled.",

    // Multi-Caisse & Trésorerie
    caisses: "Cash Registers & Cashflow",
    caissesHeading: "Multi-Register & Cashflow Management",
    caissesSubheading: "Independent register monitoring, cash in/out flows, inter-register transfers, and real-time ledger stats.",
    tabCaissesList: "Cash Registers",
    tabTransactions: "Cashflow Ledger",
    tabCategories: "Flow Categories",
    tabSessions: "Sessions & Closures",
    openCaisse: "Open Register",
    closeCaisse: "Close Register",
    newTransaction: "New Transaction",
    transfer: "Inter-Register Transfer",
    caisseBalance: "Register Balance",
    totalCaissesBalance: "Total Cash on Hand",
    totalInflows: "Total Cash In",
    totalOutflows: "Total Cash Out",
    netCashFlow: "Net Cash Flow",
    activeCaisses: "Active Registers",
    allCaisses: "All Registers (Global View)",
    sourceCaisse: "Source Register (Debit)",
    destinationCaisse: "Destination Register (Credit)",
    transactionCategory: "Flow Category",
    systemProtectedCategory: "System Category (Fixed)",
    customCategory: "Custom Category",
    openingBalance: "Opening Float",
    closingBalance: "Closing Balance",
    actualCounted: "Actual Counted Cash",
    expectedBalance: "Expected Theoretical Balance",
    cashDifference: "Cash Discrepancy",
    perPage: "Per page",
    page: "Page",
    of: "of",
    total: "Total",
    inflow: "Cash In (+)",
    outflow: "Cash Out (-)",
    transferOut: "Transfer Out (⇄)",
    transferIn: "Transfer In (⇄)",

    // Employee Payroll
    empPageTitle: "Employee Payroll",
    empPageSubtitle: "Manage salaries, advances and debts · Real-time SQLite database",
    empNewEmployee: "New Employee",
    empRefresh: "Refresh",
    empKpiPeriod: "KPI Period:",
    empTotalEmployees: "Total Employees",
    empMasseSalariale: "Monthly Payroll Mass",
    empTotalPaid: "Total Salaries Paid",
    empSalaireRestant: "Remaining Salaries",
    empTotalAdvances: "Total Advances Granted",
    empTotalDebts: "Total Employee Debts",
    empTotalDepenses: "Total Employee Expenses",
    empSearchPlaceholder: "Search by name, ID, department…",
    empAllStatuses: "All Statuses",
    empAllDepts: "All Departments",
    empColEmployee: "Employee",
    empColDeptPost: "Department / Position",
    empColBaseSalary: "Base Salary",
    empColTotalPaid: "Total Paid",
    empColAdvances: "Advances",
    empColDebts: "Debts",
    empColStatus: "Status",
    empColActions: "Actions",
    empNoEmployees: "No employees found",
    empNoEmployeesHint: 'Click "New Employee" to get started',
    empStatusActif: "Active",
    empStatusInactif: "Inactive",
    empStatusConge: "On Leave",
    empPage: "Page",
    empOf: "/",
    empResults: "results",
    empPrev: "Prev.",
    empNext: "Next.",
    empModalNewTitle: "New Employee",
    empModalEditPrefix: "Edit —",
    empFieldFullName: "Full Name *",
    empFieldCin: "National ID",
    empFieldPhone: "Phone",
    empFieldEmail: "Email",
    empFieldDept: "Department",
    empFieldPost: "Position",
    empFieldBaseSalary: "Base Salary (DA) *",
    empFieldHireDate: "Hire Date",
    empFieldStatus: "Status",
    empFieldAddress: "Address",
    empFieldNotes: "Notes",
    empBtnCancel: "Cancel",
    empBtnCreate: "Create Employee",
    empBtnSaveChanges: "Save Changes",
    empPayModalPrefix: "Pay Salary —",
    empPayBaseSalaryLabel: "Monthly Base Salary",
    empPayMonth: "Month",
    empPayYear: "Year",
    empPayBonuses: "Bonuses (DA)",
    empPayDeductions: "Deductions (DA)",
    empPayAdvanceDeducted: "Advance Deducted (DA)",
    empPayMethod: "Payment Method",
    empPayMethodCash: "💵 Cash",
    empPayMethodTransfer: "🏦 Bank Transfer",
    empPayMethodCheque: "📄 Cheque",
    empPayMethodOther: "🔄 Other",
    empPayDate: "Payment Date",
    empPayNotes: "Notes",
    empPayNetLabel: "Net to Pay",
    empPayBtnSubmit: "Save Payment",
    empAdvModalPrefix: "Salary Advance —",
    empAdvAmount: "Amount (DA) *",
    empAdvDate: "Date",
    empAdvReason: "Reason",
    empAdvMethod: "Payment Method",
    empAdvReference: "Reference",
    empAdvBtnSubmit: "Grant Advance",
    empDebtModalPrefix: "Record Debt —",
    empDebtAmount: "Amount (DA) *",
    empDebtDate: "Date",
    empDebtDescription: "Description",
    empDebtBtnSubmit: "Save Debt",
    empDetailPrefix: "Profile —",
    empTabInfo: "👤 Info",
    empTabSalaires: "💰 Salaries",
    empTabAvances: "⬆️ Advances",
    empTabDettes: "⚠️ Debts",
    empInfoDept: "Department",
    empInfoPost: "Position",
    empInfoPhone: "Phone",
    empInfoEmail: "Email",
    empInfoAddress: "Address",
    empInfoHireDate: "Hire Date",
    empInfoBaseSalary: "Base Salary",
    empInfoCin: "National ID",
    empInfoNotes: "Notes",
    empSalColMonth: "Month / Year",
    empSalColBase: "Base",
    empSalColBonuses: "Bonuses",
    empSalColDeductions: "Deductions",
    empSalColAdvDed: "Adv. Deducted",
    empSalColNet: "Net Paid",
    empSalColMethod: "Method",
    empSalColDate: "Date",
    empAdvColDate: "Date",
    empAdvColAmount: "Amount",
    empAdvColReason: "Reason",
    empAdvColMethod: "Method",
    empDebtColDate: "Date",
    empDebtColDesc: "Description",
    empDebtColAmount: "Amount",
    empDebtColRemaining: "Remaining",
    empDebtColStatus: "Status",
    empEmptyPayments: "No salary payments recorded",
    empEmptyAdvances: "No advances granted",
    empEmptyDebts: "No debts recorded",
    empToastCreated: "Employee created successfully",
    empToastUpdated: "Employee updated",
    empToastDeleted: "Employee deleted",
    empToastNameRequired: "Name is required",
    empToastInvalidAmount: "Invalid amount",
    empToastAdvGranted: "Advance granted",
    empToastDebtSaved: "Debt recorded",
    empToastAdvDeleted: "Advance deleted",
    empToastPayDeleted: "Payment deleted",
    empToastDebtDeleted: "Debt deleted",
    empConfirmDelete: "Delete employee \"{name}\"? All their data will be erased.",
    empConfirmDeleteAdv: "Delete this advance?",
    empConfirmDeletePay: "Delete this payment?",
    empConfirmDeleteDebt: "Delete this debt?",
    empMonths: ['January','February','March','April','May','June','July','August','September','October','November','December'],

    // Clients & Dettes Clients
    clients: "Clients & Debts",
    clientsHeading: "Client Debt & Credit Ledger",
    clientsSubheading: "Full client debt tracking, history of products taken from stock, and cash settlement per register (Main Cash, Tobacco Cash...).",
    newClient: "New Client",
    giveProductDebt: "Give Product / Record Debt",
    settleDebt: "Settle Debt",
    clientDebts: "Client Debts",
    clientBlockedNotice: "With Outstanding Debt",
    clientClearNotice: "Clear Client (Up to date)",
    clientCannotBuyWarning: "This client currently has an active debt. You can still grant additional products from stock at your discretion.",
    lastTakenProduct: "Last product taken",
    clientHistory: "History & Statement",

    // Navigation & POS/Dashboard/Historique Tabs
    posSale: "Sales / POS",
    salesHistory: "Sales History",
    dashboardPerformance: "Dashboard",
    servicesMenu: "Services & Flexy",
    titlePos: "Point of Sale",
    titleSalesHistory: "Sales History",
    titleDashboardPerformance: "Dashboard / Analytics",
    titleServices: "Multi-Services & Flexy",

    // Dashboard Page
    dashTitle: "Dashboard / Sales Performance",
    dashSubtitle: "Key performance indicators, revenue, profit margins and distribution",
    dashDateFrom: "From",
    dashDateTo: "to",
    dashRefresh: "Refresh",
    dashLoading: "Loading statistics...",
    dashNbSales: "Number of Sales",
    dashTotalRevenue: "Total Revenue",
    dashTotalCash: "Total Collected",
    dashNewCredit: "New Credit Generated",
    dashCostSales: "Cost of Sales",
    dashGrossProfit: "Gross Profit",
    dashTotalClientCredit: "Total Client Credit (All)",
    dashActiveDebts: "Active outstanding debts",
    dashPerfByUser: "Performance by Cashier / Seller",
    dashTopProducts: "Top Selling Products",
    dashColCashier: "Cashier",
    dashColNbSales: "Sales Qty",
    dashColRevenue: "Revenue",
    dashColCollected: "Collected",
    dashColMargin: "Margin",
    dashColProduct: "Product",
    dashColQtySold: "Qty Sold",
    dashNoData: "No data available",

    // Rich Statistics Engine
    statsTabOverview: "Overview & KPIs",
    statsTabTrends: "Trends & Sales",
    statsTabProducts: "Product Analytics",
    statsTabCashiers: "Team & Cashiers",
    statsTabTreasury: "Treasury & Registers",
    statsTabCredit: "Credits & Recoveries",
    statsTabEmployees: "Payroll & Advances",
    statsTabReconciliation: "Reconciliation & Audit",

    statsFilterToday: "Today",
    statsFilterYesterday: "Yesterday",
    statsFilter7Days: "Last 7 days",
    statsFilterThisMonth: "This month",
    statsFilterLastMonth: "Last month",
    statsFilterThisYear: "This year",
    statsFilterCustom: "Custom",

    statsMarginRate: "Margin Rate",
    statsAvgBasket: "Average Basket",
    statsInventoryValuationCost: "Stock Value (Purchase Cost)",
    statsInventoryValuationSelling: "Stock Value (Retail Price)",
    statsPotentialMargin: "Potential Stock Margin",
    statsLowStockAlerts: "Low stock alert items",
    statsOutOfStock: "Out of stock items",
    statsCashCollected: "Cash Collected",
    statsCreditRepaid: "Credits Repaid",
    statsNetCreditChange: "Net Credit Change",
    statsTotalSalaries: "Salaries Paid",
    statsTotalAdvances: "Advances Issued",
    statsLiveCashRegisters: "Live Cash (All Registers)",
    statsLiveClientDebt: "Total Outstanding Debt",
    statsActiveDebtors: "Active Debtors",
    statsReconcileBtn: "Verify & Reconcile",
    statsReconcileRunning: "Reconciliation in progress...",
    statsReconcileDesc: "Verifies consistency of precomputed summary tables against original transaction tables and repairs any discrepancies.",
    statsLastReconciled: "Last reconciled:",
    statsLastUpdated: "Last updated:",
    statsReconcileSuccess: "Reconciliation finished successfully! Precomputed summaries are in perfect sync.",
    statsReconciliationLogsTitle: "Reconciliation Audit History",

    // Historique Page
    histTitle: "Sales History",
    histSubtitle: "View, filter and settle payments for all recorded sales",
    histSearchPlaceholder: "Search (Sale #, client, cashier)...",
    histAllStatus: "All statuses",
    histStatusPaid: "Paid",
    histStatusPartial: "Partial",
    histStatusCredit: "Credit",
    histFilterBtn: "Filter",
    histColSaleNum: "Sale #",
    histColDate: "Date",
    histColClient: "Client",
    histColCashier: "Cashier",
    histColTotal: "Total",
    histColPaid: "Collected",
    histColCredit: "Credit",
    histColStatus: "Status",
    histColActions: "Actions",
    histLoading: "Loading sales...",
    histNoSales: "No sales found",
    histViewDetails: "View details",
    histCollectCredit: "Collect credit",
    histDeleteSale: "Delete sale",
    histPageOf: "Page {page} of {totalPages} ({total} total sales)",
    histPrev: "Previous",
    histNext: "Next",
    histGeneralInfo: "General Information",
    histRemainingCredit: "Remaining Credit",
    histSoldItems: "Sold Items",
    histReceivedPayments: "Received Payments",
    histRecordPayment: "Record Payment",
    histCreditRemainingPay: "Remaining Credit to Pay",
    histDestCaisse: "Destination Register",
    histNoCaisse: "-- No register --",
    histAmountRcv: "Amount Received",
    histNotesOptional: "Notes (optional)",
    histNotesPlaceholder: "Remarks...",
    histConfirmPayment: "Confirm Payment",
    histPaymentSavedToast: "Payment recorded successfully",
    histSaleDeletedToast: "Sale deleted successfully",
    histDeleteConfirm: "Delete sale {num}? (Item inventory will be restored)",
    histGrossProfit: "Gross Profit",

    // Ventes / POS Page
    posTitle: "Point of Sale",
    posInService: "In service",
    posSearchKbd: "Search",
    posFavoritesKbd: "Favorites",
    posTigePackKbd: "Single/Pack",
    posDebtKbd: "Debt",
    posCheckoutKbd: "Checkout",
    posScanBarcode: "Scan barcode with gun...",
    posSearchItem: "Search item [F2]...",
    posRefreshItems: "Refresh products",
    posTabFavorites: "Favorites",
    posTabAll: "All",
    posTabTobacco: "Tobacco & Cigarettes",
    posAllCategories: "All categories",
    posActiveMode: "Active mode:",
    posSwitchToSingle: "Switch to Single",
    posSwitchToPack: "Switch to Pack",
    posCart: "CART",
    posEmptyCart: "CLEAR",
    posClientWalkIn: "Walk-in client / debt...",
    posCartEmptyTitle: "Empty Cart",
    posCartEmptySubtitle: "Scan barcode or click an item",
    posTotalToPay: "TOTAL TO PAY",
    posDirectPay: "DIRECT CASH",
    posEnterKey: "[↵ Enter]",
    posDebtBtn: "DEBT [D]",
    posLastReceipt: "Last receipt",
    posSaleToCredit: "Credit Sale / Client Debt",
    posDebtAmount: "DEBT AMOUNT",
    posBeneficiaryClient: "Beneficiary client *",
    posSearchClient: "Search client...",
    posCurrentDebt: "Current debt:",
    posNoteReason: "Note / Reason",
    posNotePlaceholder: "Note on debt...",
    posValidateDebt: "Validate Debt",
    posReceipt: "Sales Receipt",
    posThankYou: "Thank you for your visit!",
    posPrint: "Print",
    posSoundEnable: "Enable sounds",
    posSoundDisable: "Disable sounds",
    posNoFavoriteItems: "No favorite items for register",
    posNoItemsFound: "No items found",
    posSeeAllItems: "See all items",
    posDiscount: "Discount",
    posArticleCount: "item(s)",
    posMargin: "Margin:",
    posCashReceived: "Cash received (DA)",
    posChangeReturned: "Change to return:",
    posRemainingCredit: "Remaining credit:",
    posPartialPayOptions: "Partial Payment / Options",
    posConfirmPayment: "Confirm Checkout",
    posPleaseSelectClient: "Please select a client below to record the remaining debt.",
    posSingle: "Single",
    posPack: "Pack",
    posNextScans: "(Next scans: {unit})",
    posLoadingItems: "Loading products...",

    // Debt Settlement Modal (Clients)
    settleDebtTitle: "Client Debt Settlement",
    settleDebtSubtitle: "Collect payment and allocate funds to the selected register",
    clientConcerned: "Concerned client:",
    currentDebtDue: "Current debt due:",
    lastTakenProductSnippet: "Last product taken on credit previously:",
    amountToCollect: "Amount to Collect (DA) *",
    totalBalanceBtn: "Full Balance",
    destCaisseLabel: "📍 Destination Register (Where to put collected money?) *",
    caisseSelected: "Selected register",
    primaryCaisse: "Main",
    effectiveDepositIn: "Effective deposit into:",
    newEstimatedBalance: "New expected balance:",
    paymentMode: "Payment Method",
    paymentDate: "Payment Date",
    modeCash: "Cash",
    modeTransfer: "Bank Transfer",
    modeCheck: "Check",
    modeOther: "Other",
    notesRef: "Notes / Reference",
    fullDebtSettledBanner: "This payment fully settles the client's debt (Remaining balance: 0.00 DA).",
    partialDebtSettledBanner: "Partial payment: Remaining debt",
    validateSettlementBtn: "Collect & Validate Settlement"
  },

  ar: {
    appName: "imatechx",
    sqliteOnline: "قاعدة بيانات متصلة",
    dashboard: "لوحة التحكم",
    shipments: "الشحنات",
    inventory: "المخزون والمواد",
    warehouses: "المستودعات",
    users: "الأدوار والمستخدمين",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    refresh: "تحديث",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    close: "إغلاق",
    date: "التاريخ",
    search: "بحث...",
    filterAll: "جميع الحالات",
    adminBadge: "مسؤول",

    tabLanguage: "اللغة والمنطقة",
    tabPrinter: "إعدادات الطابعات",
    tabStore: "معلومات المتجر والشركة",
    tabAccount: "إدارة الحساب",
    tabBackup: "النسخ الاحتياطي والاستعادة",

    titleDashboard: "لوحة التحكم اللوجستية",
    titleShipments: "إدارة الشحنات والعمليات",
    titleInventory: "مخزون المستودعات والمنتجات",
    titleWarehouses: "شبكة المستودعات",
    titleUsers: "إدارة المستخدمين والصلاحيات",
    titleSettings: "إعدادات وتخصيص النظام",

    languageHeading: "تفضيلات اللغة والإقليم",
    languageSubheading: "اختر لغة واجهة النظام وخصص طريقة عرض التواريخ والأرقام.",
    selectLanguage: "لغة التطبيق",
    dateFormat: "تنسيق التاريخ",
    currencyFormat: "تنسيق العملة",
    languagePreview: "معاينة مباشرة",
    sampleDate: "مثال التاريخ",
    sampleAmount: "مثال المبلغ",
    savedLanguageNotice: "تم تحديث إعدادات اللغة بنجاح.",

    printerHeading: "إعداد الطابعات ونماذج الطباعة",
    printerSubheading: "تخصيص طابعات الفواتير الحرارية وطابعات المستندات وسندات التسليم.",
    detectPrintersBtn: "الكشف عن طابعات النظام",
    printersDetected: "طابعة تم العثور عليها",
    receiptPrinter: "طابعة الإيصالات والتذاكر (حرارية)",
    invoicePrinter: "طابعة الفواتير وسندات التسليم (A4)",
    barcodePrinter: "طابعة الباركود والملصقات",
    paperSize: "عرض الورق الحراري",
    autoCutPaper: "قطع الورق تلقائياً بعد اكتمال الطباعة",
    cashDrawer: "فتح درج النقود تلقائياً",
    numberOfCopies: "عدد النسخ الافتراضي",
    silentPrinting: "طباعة صامتة فورية (بدون نافذة تأكيد)",
    testPrintBtn: "طباعة إيصال تجريبي",
    testPrintReceipt: "إيصال اختبار",
    testPrintSuccess: "تم إرسال صفحة الاختبار إلى الطابعة بنجاح!",
    noPrintersFound: "لم يتم العثور على طابعة حقيقية، النظام في وضع المحاكاة.",
    thermalPaperDesc: "مناسب لفواتير نقاط البيع الحرارية مقاس 80 مم أو 58 مم.",
    laserPaperDesc: "ورق قياسي A4 للمستندات والطلبات الرسمية.",

    storeHeading: "بيانات المتجر والمنشأة",
    storeSubheading: "هذه البيانات تظهر تلقائياً في ترويسة الفواتير وسندات الاستلام والإيصالات.",
    storeName: "اسم المتجر أو المؤسسة",
    storeTagline: "الشعار التجاري / النشاط",
    commercialRegister: "السجل التجاري (RC)",
    taxIdentification: "الرقم الضريبي / المعرف المالي (ICE)",
    address: "العنوان بالكامل",
    city: "المدينة",
    postalCode: "الرمز البريدي",
    country: "الدولة",
    phone: "رقم الهاتف الرئيسي",
    phoneAlt: "رقم ثانوي / واتساب",
    email: "البريد الإلكتروني للتواصل",
    website: "الموقع الإلكتروني",
    defaultCurrency: "رمز العملة الأساسية",
    invoiceFooterNote: "ملاحظة تذييل الفاتورة والإيصال",
    storeLogo: "شعار الشركة الرسمي",
    uploadLogo: "تغيير الشعار",
    saveStoreBtn: "حفظ بيانات المؤسسة",
    storeSavedSuccess: "تم حفظ بيانات المنشأة بنجاح.",

    accountHeading: "إدارة الحساب والأمان",
    accountSubheading: "إدارة ملفك الشخصي وتحديث كلمة المرور ومتابعة سجلات النشاط.",
    profileDetails: "تفاصيل الحساب الحالي",
    fullName: "الاسم الكامل",
    username: "اسم المستخدم",
    userRole: "الدور والصلاحية",
    roleDescription: "تمنحك صلاحيات دورك الوصول إلى العمليات المسموح بها في النظام.",
    changePasswordTitle: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    updateProfileBtn: "تحديث البيانات الشخصية",
    updatePasswordBtn: "تغيير كلمة المرور",
    accountUpdatedSuccess: "تم تحديث الحساب بنجاح!",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    wrongCurrentPassword: "كلمة المرور الحالية غير صحيحة.",
    switchAccountTitle: "تبديل سريع للمستخدم",
    securityLogsTitle: "سجل العمليات والأمان الأخير",
    noSecurityLogs: "لا توجد سجلات نشاط مسجلة مؤخراً.",
    timeCol: "الوقت والتاريخ",
    userCol: "المستخدم",
    actionCol: "العملية المنفذة",

    backupHeading: "النسخ الاحتياطي واستعادة البيانات",
    backupSubheading: "احمِ بيانات منشأتك بإنشاء نسخ احتياطية لقاعدة البيانات أو استعادة نسخة سابقة.",
    dbInfoTitle: "حالة قاعدة بيانات SQLite المحلية",
    dbType: "محرك البيانات",
    dbLocation: "مسار الملف",
    lastBackupDate: "تاريخ آخر نسخة احتياطية",
    neverBackedUp: "لم يتم حفظ نسخ سابقة بعد",
    exportBackupSection: "إنشاء نسخة احتياطية الآن",
    exportDbBtn: "تصدير ملف SQLite (.db)",
    exportJsonBtn: "تنزيل الأرشيف الكامل (.json)",
    exportCsvSection: "تصدير البيانات إلى ملفات CSV",
    exportCsvInventory: "تصدير المخزون (CSV)",
    exportCsvShipments: "تصدير الشحنات (CSV)",
    exportCsvWarehouses: "تصدير المستودعات (CSV)",
    restoreSection: "استعادة من ملف نسخ احتياطي",
    restoreWarning: "تحذير: الاستعادة ستستبدل كافة البيانات الحالية (المنتجات، الشحنات، المستودعات) بمحتويات الملف المحدد.",
    importDbBtn: "استعادة ملف SQLite (.db)",
    importJsonBtn: "استعادة من ملف (.json)",
    restoreSuccess: "تمت استعادة قاعدة البيانات بنجاح!",
    autoBackupSchedule: "التذكير الدوري بالنسخ الاحتياطي",
    freqDaily: "يومياً (موصى به)",
    freqWeekly: "أسبوعياً",
    freqManual: "يدوي فقط",

    // Fournisseurs & Historique de Crédit
    providers: "الموردون",
    providersHeading: "إدارة الموردين وتاريخ الائتمان",
    providersSubheading: "متابعة ديون الموردين، تسجيل المدفوعات وسجل المعاملات الائتمانية.",
    addProviderBtn: "مورد جديد",
    editProviderBtn: "تعديل المورد",
    deleteProviderBtn: "حذف المورد",
    providerDetails: "بطاقة المورد",
    providerName: "اسم المورد / الشركة",
    contactPerson: "الشخص المسؤول",
    iceTaxId: "الرقم التعريفي (ICE / RC)",
    currentCredit: "الرصيد المستحق / الدين",
    initialCredit: "الرصيد الافتتاحي",
    totalDebts: "إجمالي ديون الموردين",
    totalPaid: "إجمالي المدفوعات المسددة",
    providersWithDebt: "موردون بذمة مالية",
    totalProviders: "إجمالي الموردين",
    tabProvidersList: "دليل الموردين",
    tabGlobalCreditHistory: "سجل الائتمان العام",
    creditHistory: "سجل الديون والائتمان",
    creditHistoryFor: "كشف حساب المورد",
    recordCreditOperation: "عملية جديدة",
    recordPayment: "تسجيل دفعة / سداد",
    newPurchaseCredit: "شراء بالأجل (فاتورة)",
    operationType: "نوع العملية",
    typePurchaseCredit: "شراء بالأجل (زيادة دين +)",
    typePayment: "سداد / دفعة (خصم دين -)",
    typeCreditNote: "إشعار دائن / مرتجع (خصم -)",
    amount: "المبلغ",
    operationDate: "تاريخ العملية",
    paymentMethod: "طريقة السداد",
    methodCash: "نقداً (الصندوق)",
    methodCheque: "شيك بنكي",
    methodTransfer: "تحويل بنكي",
    methodPromissoryNote: "كمبيالة / سند",
    methodOther: "طريقة أخرى",
    referenceDoc: "رقم الوثيقة / المرجع",
    notesRemarks: "ملاحظات",
    balanceAfter: "الرصيد المتبقي",
    actions: "الإجراءات",
    confirmDeleteProvider: "تأكيد الحذف",
    confirmDeleteMsg: "هل أنت متأكد من حذف هذا المورد نهائياً مع كافة سجلات معاملاته الائتمانية؟",
    searchProviderPlaceholder: "البحث بالاسم، الهاتف، السجل التجاري، المدينة...",
    filterDebtOnly: "المتبقي بذمتهم (> 0)",
    filterZeroDebt: "مستوفى بالكامل (0)",
    filterAllProviders: "جميع الموردين",
    statementTitle: "كشف حساب المورد",
    printStatement: "طباعة كشف الحساب",
    noOperations: "لا توجد معاملات ائتمانية مسجلة.",
    noProvidersFound: "لا يوجد موردون يطابقون معايير البحث.",
    statusActive: "نشط",
    statusInactive: "غير نشط",
    providerCreatedSuccess: "تمت إضافة المورد بنجاح!",
    providerUpdatedSuccess: "تم تحديث بيانات المورد بنجاح!",
    providerDeletedSuccess: "تم حذف المورد بنجاح!",
    operationSavedSuccess: "تم تسجيل العملية الائتمانية بنجاح!",
    deleteOperationConfirm: "هل أنت متأكد من حذف هذه المعاملة المالية؟",
    adminOnlyNotice: "يحق فقط للمدير (Admin) إضافة أو تعديل أو حذف الموردين.",

    // KMS Products & Multi-Units
    products: "منتجات KMS",
    productsHeading: "دليل المنتجات والطلبيات KMS",
    productsSubheading: "واجهة فائقة السرعة بدون صور: وحدات بيع متعددة، مقارنة أسعار الموردين وإضافة مباشرة لسلة الشراء.",
    sku: "رمز المنتج (SKU)",
    barcode: "الباركود",
    category: "التصنيف",
    allCategories: "كافة التصنيفات",
    stock: "المخزون المتوفر",
    minStock: "حد التنبيه الأدنى",
    baseUnit: "الوحدة الأساسية",
    sellingUnits: "وحدات البيع",
    supplier: "المورد",
    allSuppliers: "جميع الموردين",
    supplierPrices: "أسعار الموردين",
    compareSuppliers: "مقارنة الموردين",
    cheapestSupplier: "أفضل سعر",
    priceDifference: "فارق السعر",
    addToCart: "إضافة للسلة",
    cart: "سلة الطلبيات",
    cartEmpty: "سلة الطلبيات فارغة حالياً.",
    totalCart: "إجمالي الطلبية",
    checkoutCart: "تأكيد وإصدار الطلبية",
    clearCart: "إفراغ السلة",
    inStock: "متوفر بالمستودع",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد من المخزون",
    priceRange: "نطاق السعر",
    fastSearch: "بحث فوري (الاسم، الرمز، الباركود)...",
    addProduct: "منتج جديد",
    editProduct: "تعديل المنتج",
    deleteProduct: "حذف المنتج",
    productSaved: "تم حفظ المنتج بنجاح!",
    productDeleted: "تم حذف المنتج بنجاح!",
    orderCreated: "تم تسجيل الطلبية بنجاح!",
    orderType: "نوع الطلبية",
    quickStockUpdate: "تعديل المخزون",
    conversionFactor: "معامل التحويل",
    sellingPrice: "سعر البيع",
    costPrice: "سعر الشراء",
    cartDrawerTitle: "سلة الطلبيات السريعة",
    quickAdd: "+ للسلة",
    purchaseOrderBtn: "طلب شراء",
    articlesReferenced: "المواد المسجلة",
    inCatalog: "في الكتالوج",
    toRestock: "بحاجة للتزويد",
    completeStockout: "نفاد تام",
    stockValueCost: "قيمة المخزون (شراء)",
    catalogTab: "الكتالوج وأسعار الجملة",
    purchasesHistoryTab: "سجل المشتريات وفواتير الموردين",
    allFilter: "الكل",
    priceDA: "السعر (دج):",
    sortBy: "ترتيب حسب:",
    sortNameAsc: "الاسم (أ ← ي)",
    sortNameDesc: "الاسم (ي ← أ)",
    sortPriceCheap: "السعر (الأقل)",
    sortPriceExp: "السعر (الأعلى)",
    sortStockAsc: "المخزون (تصاعدي)",
    sortStockDesc: "المخزون (تنازلي)",
    articleRef: "المادة والمرجع",
    stockAvailable: "المخزون المتوفر",
    caisseAndSupplier: "الصندوق والمورد",
    unitsAndPrices: "الوحدات والأسعار (جملة / تجزئة)",
    supplierPurchase: "شراء من المورد",
    noArticlesMatchFilter: "لا توجد مواد تطابق عوامل التصفية",
    noCatalogProducts: "لا توجد منتجات مسجلة حالياً",
    resetFiltersHint: "حاول إعادة تعيين معايير البحث أو تعديل الفلاتر أعلاه.",
    addFirstProductHint: "الكتالوج فارغ. انقر أدناه لإضافة أول منتج.",
    generalCategory: "عام",
    adjustStockTooltip: "تعديل المخزون المتوفر",
    inReserve: "متوفر بالمخزن",
    caisseLabel: "الصندوق:",
    defaultLabel: "افتراضي",
    supplierShort: "المورد:",
    suppliersCount: "{count} موردين",
    purchaseShort: "شراء:",
    saleShort: "بيع:",
    addPurchaseBtn: "+ شراء",
    showingItems: "عرض من {from} إلى {to} من أصل {total} مادة",
    perPageLabel: "| في الصفحة:",
    previous: "السابق",
    next: "التالي",
    receivedPurchaseOrders: "طلبيات الشراء المستلمة",
    ordersUnit: "طلبيات",
    cashPayouts: "المدفوعات نقداً (من الصندوق)",
    supplierDebtsKPI: "ديون الموردين (آجل)",
    totalPurchaseVolume: "إجمالي حجم المشتريات",
    searchOrdersPlaceholder: "بحث بالرقم، المورد، الصندوق...",
    allSuppliersFilter: "جميع الموردين",
    allCaissesFilter: "جميع الصناديق",
    allPaymentsFilter: "جميع طرق الدفع",
    paymentCash: "نقداً",
    paymentMixte: "مختلط (دفعة + آجل)",
    paymentCredit: "بالأجل (دين)",
    paymentTransfer: "تحويل بنكي",
    paymentCheque: "شيك",
    dateTo: "إلى",
    resetFilters: "إعادة تعيين",
    refAndDate: "المرجع والتاريخ",
    caisseDebited: "الصندوق المخصوم",
    paymentAndDebts: "الدفع والديون",
    articlesCount: "المواد",
    totalAmount: "المبلغ الإجمالي",
    loadingOrders: "جاري تحميل سجل المشتريات...",
    noOrdersFound: "لا توجد فواتير شراء تطابق المعايير",
    paidAmountShort: "المدفوع :",
    debtAmountShort: "الدين :",
    detailsBtn: "تفاصيل",
    showingOrders: "عرض من {from} إلى {to} من أصل {total} فاتورة شراء",
    purchaseOrderTitle: "طلب شراء من المورد",
    purchaseOrderSubtitle: "شراء بالجملة وتزويد المخزون",
    refreshWholesaleRates: "تحديث الأسعار",
    caissePaymentLabel: "صندوق الدفع :",
    autoPerProduct: "تلقائي حسب المادة",
    paymentMethodLabel: "طريقة الدفع :",
    debitCaisseCheckbox: "خصم من الصندوق",
    wholesaleCost: "شراء بالجملة :",
    customerSale: "بيع الزبون :",
    subtotalWholesale: "المجموع الفرعي للشراء",
    versementsAndCreditBySupplier: "المدفوعات والآجل حسب المورد",
    currentDebt: "الدين الحالي :",
    orderTotal: "مجموع الطلبية :",
    versementCash: "الدفعة (خروج من الصندوق) :",
    fullyPaidNoDebt: "مدفوع بالكامل (بدون دين)",
    remainingCreditForOrder: "المتبقي بالأجل لهذه الطلبية :",
    newSupplierDebt: "دين المورد الجديد :",
    wholesaleOrderTotal: "مجموع طلبية الجملة :",
    cashOutflowVersements: "الخارج من الصندوق (المدفوعات) :",
    remainingCreditDebts: "المتبقي بالأجل (ديون) :",
    orderFullyPaidCash: "الطلبية مدفوعة 100% نقداً",
    validateOrderBtn: "تأكيد",
    orderDetailsTitle: "فاتورة شراء المورد",
    deleteOrderBtn: "حذف هذه الفاتورة",
    confirmDeleteOrderTitle: "تأكيد إلغاء الفاتورة",
    confirmDeleteOrderDesc: "هل أنت متأكد من رغبتك في حذف وإلغاء فاتورة الشراء هذه؟",
    confirmDeleteBtn: "تأكيد الحذف",
    caisseAssociated: "الصندوق المرتبط",
    articleDesignation: "اسم المادة",
    unit: "الوحدة",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    subtotal: "المجموع الفرعي",
    saveChanges: "حفظ التعديلات",
    noOrderItems: "لا توجد تفاصيل مواد متاحة",
    orderReceivedItems: "المواد المستلمة في هذا الوصل",
    grandTotal: "المجموع الإجمالي",
    modifyOrderParams: "تعديل إعدادات الوصل",
    caisseAttachment: "صندوق الصرف",
    noCaisseOption: "-- بدون صندوق --",
    cashOutflowLabel: "المبلغ المدفوع (صرف من الصندوق)",
    remainingDebtLabel: "المتبقي آجل (دين على المورد)",
    orderFullPaidNotice: "سيتم دفع الطلب بالكامل من الصندوق (لا يوجد دين على المورد).",
    deleteOrderWarning: "إجراء تلقائي وقابل للعكس:",
    deleteOrderPoint1: "سيتم خصم كميات المخزون الواردة تلقائيًا عبر مشغلات قاعدة البيانات.",
    deleteOrderPoint2: "إذا كانت هناك حركة صندوق مرتبطة، فسيتم إلغاؤها واسترداد المبلغ.",
    deleteOrderPoint3: "إذا تم تسجيل شراء آجل للمورد، فستتم تسوية الدين تلقائيًا.",

    // Multi-Caisse & Trésorerie
    caisses: "الصناديق المالية والخزينة",
    caissesHeading: "إدارة الصناديق المتعددة والخزينة",
    caissesSubheading: "متابعة دقيقة للصناديق المنفصلة، حركة المقبوضات والمدفوعات، التحويلات الداخلية وإحصائيات التدفق المالي.",
    tabCaissesList: "الصناديق المسجلة",
    tabTransactions: "سجل المعاملات المالية",
    tabCategories: "تصنيفات المعاملات",
    tabSessions: "جلسات الصندوق والإغلاق",
    openCaisse: "فتح الصندوق",
    closeCaisse: "إغلاق الصندوق",
    newTransaction: "معاملة جديدة",
    transfer: "تحويل بين الصناديق",
    caisseBalance: "رصيد الصندوق",
    totalCaissesBalance: "إجمالي السيولة والخزينة",
    totalInflows: "إجمالي المقبوضات",
    totalOutflows: "إجمالي المدفوعات",
    netCashFlow: "صافي التدفق النقدي",
    activeCaisses: "الصناديق المفتوحة",
    allCaisses: "كافة الصناديق (نظرة شاملة)",
    sourceCaisse: "الصندوق المصدر (الخصم)",
    destinationCaisse: "الصندوق المستلم (الإيداع)",
    transactionCategory: "تصنيف المعاملة",
    systemProtectedCategory: "تصنيف نظامي (ثابت)",
    customCategory: "تصنيف مخصص",
    openingBalance: "رصيد الافتتاح",
    closingBalance: "رصيد الإغلاق",
    actualCounted: "المبلغ الفعلي المحسوب",
    expectedBalance: "الرصيد النظري المتوقع",
    cashDifference: "فارق الصندوق (العجز/الفائض)",
    perPage: "لكل صفحة",
    page: "الصفحة",
    of: "من",
    total: "الإجمالي",
    inflow: "قبض (+)",
    outflow: "صرف (-)",
    transferOut: "تحويل صادر (⇄)",
    transferIn: "تحويل وارد (⇄)",

    // Employee Payroll
    empPageTitle: "رواتب وأجور الموظفين",
    empPageSubtitle: "إدارة الرواتب والسلف والديون · قاعدة بيانات SQLite في الوقت الفعلي",
    empNewEmployee: "موظف جديد",
    empRefresh: "تحديث",
    empKpiPeriod: "فترة المؤشرات:",
    empTotalEmployees: "إجمالي الموظفين",
    empMasseSalariale: "كتلة الرواتب الشهرية",
    empTotalPaid: "إجمالي الرواتب المدفوعة",
    empSalaireRestant: "الرواتب المتبقية للصرف",
    empTotalAdvances: "إجمالي السلف الممنوحة",
    empTotalDebts: "إجمالي ديون الموظفين",
    empTotalDepenses: "إجمالي مصاريف الموظفين",
    empSearchPlaceholder: "بحث بالاسم، رقم الهوية، القسم…",
    empAllStatuses: "جميع الحالات",
    empAllDepts: "جميع الأقسام",
    empColEmployee: "الموظف",
    empColDeptPost: "القسم / المنصب",
    empColBaseSalary: "الراتب الأساسي",
    empColTotalPaid: "إجمالي المدفوع",
    empColAdvances: "السلف",
    empColDebts: "الديون",
    empColStatus: "الحالة",
    empColActions: "الإجراءات",
    empNoEmployees: "لا يوجد موظفون",
    empNoEmployeesHint: 'انقر على "موظف جديد" للبدء',
    empStatusActif: "نشط",
    empStatusInactif: "غير نشط",
    empStatusConge: "في إجازة",
    empPage: "الصفحة",
    empOf: "/",
    empResults: "نتيجة",
    empPrev: "السابق",
    empNext: "التالي",
    empModalNewTitle: "موظف جديد",
    empModalEditPrefix: "تعديل —",
    empFieldFullName: "الاسم الكامل *",
    empFieldCin: "رقم الهوية الوطنية",
    empFieldPhone: "الهاتف",
    empFieldEmail: "البريد الإلكتروني",
    empFieldDept: "القسم",
    empFieldPost: "المنصب",
    empFieldBaseSalary: "الراتب الأساسي (DA) *",
    empFieldHireDate: "تاريخ التوظيف",
    empFieldStatus: "الحالة",
    empFieldAddress: "العنوان",
    empFieldNotes: "ملاحظات",
    empBtnCancel: "إلغاء",
    empBtnCreate: "إنشاء الموظف",
    empBtnSaveChanges: "حفظ التعديلات",
    empPayModalPrefix: "صرف الراتب —",
    empPayBaseSalaryLabel: "الراتب الأساسي الشهري",
    empPayMonth: "الشهر",
    empPayYear: "السنة",
    empPayBonuses: "المكافآت / الزيادات (DA)",
    empPayDeductions: "الخصومات (DA)",
    empPayAdvanceDeducted: "السلفة المخصومة (DA)",
    empPayMethod: "طريقة الدفع",
    empPayMethodCash: "💵 نقداً",
    empPayMethodTransfer: "🏦 تحويل بنكي",
    empPayMethodCheque: "📄 شيك",
    empPayMethodOther: "🔄 أخرى",
    empPayDate: "تاريخ الدفع",
    empPayNotes: "ملاحظات",
    empPayNetLabel: "صافي المبلغ المدفوع",
    empPayBtnSubmit: "تسجيل الدفعة",
    empAdvModalPrefix: "سلفة على الراتب —",
    empAdvAmount: "المبلغ (DA) *",
    empAdvDate: "التاريخ",
    empAdvReason: "السبب",
    empAdvMethod: "طريقة الدفع",
    empAdvReference: "المرجع",
    empAdvBtnSubmit: "منح السلفة",
    empDebtModalPrefix: "تسجيل دين —",
    empDebtAmount: "المبلغ (DA) *",
    empDebtDate: "التاريخ",
    empDebtDescription: "الوصف",
    empDebtBtnSubmit: "تسجيل الدين",
    empDetailPrefix: "ملف الموظف —",
    empTabInfo: "👤 البيانات",
    empTabSalaires: "💰 الرواتب",
    empTabAvances: "⬆️ السلف",
    empTabDettes: "⚠️ الديون",
    empInfoDept: "القسم",
    empInfoPost: "المنصب",
    empInfoPhone: "الهاتف",
    empInfoEmail: "البريد الإلكتروني",
    empInfoAddress: "العنوان",
    empInfoHireDate: "تاريخ التوظيف",
    empInfoBaseSalary: "الراتب الأساسي",
    empInfoCin: "رقم الهوية",
    empInfoNotes: "ملاحظات",
    empSalColMonth: "الشهر / السنة",
    empSalColBase: "الأساسي",
    empSalColBonuses: "المكافآت",
    empSalColDeductions: "الخصومات",
    empSalColAdvDed: "السلفة المخصومة",
    empSalColNet: "الصافي المدفوع",
    empSalColMethod: "الطريقة",
    empSalColDate: "التاريخ",
    empAdvColDate: "التاريخ",
    empAdvColAmount: "المبلغ",
    empAdvColReason: "السبب",
    empAdvColMethod: "الطريقة",
    empDebtColDate: "التاريخ",
    empDebtColDesc: "الوصف",
    empDebtColAmount: "المبلغ",
    empDebtColRemaining: "المتبقي",
    empDebtColStatus: "الحالة",
    empEmptyPayments: "لم يُسجَّل أي راتب بعد",
    empEmptyAdvances: "لا توجد سلف ممنوحة",
    empEmptyDebts: "لا توجد ديون مسجلة",
    empToastCreated: "تمت إضافة الموظف بنجاح",
    empToastUpdated: "تم تحديث بيانات الموظف",
    empToastDeleted: "تم حذف الموظف",
    empToastNameRequired: "الاسم مطلوب",
    empToastInvalidAmount: "المبلغ غير صالح",
    empToastAdvGranted: "تمت السلفة",
    empToastDebtSaved: "تم تسجيل الدين",
    empToastAdvDeleted: "تم حذف السلفة",
    empToastPayDeleted: "تم حذف الدفعة",
    empToastDebtDeleted: "تم حذف الدين",
    empConfirmDelete: "حذف الموظف \"{name}\"؟ سيتم مسح جميع بياناته.",
    empConfirmDeleteAdv: "هل تريد حذف هذه السلفة؟",
    empConfirmDeletePay: "هل تريد حذف هذه الدفعة؟",
    empConfirmDeleteDebt: "هل تريد حذف هذا الدين؟",
    empMonths: ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],

    // Clients & Dettes Clients
    clients: "الزبائن والديون",
    clientsHeading: "إدارة الزبائن وسجل الديون",
    clientsSubheading: "متابعة شاملة لديون الزبائن، وسجل المنتجات المأخوذة من المخزون، وتحديد الصندوق المستلم للأموال (الصندوق الرئيسي، صندوق التبغ...).",
    newClient: "زبون جديد",
    giveProductDebt: "تسليم منتج / تسجيل دين",
    settleDebt: "سداد الدين",
    clientDebts: "ديون الزبائن",
    clientBlockedNotice: "عليه دين قيد السداد",
    clientClearNotice: "زبون خالص (لا دين عليه)",
    clientCannotBuyWarning: "هذا الزبون لديه رصيد دين حالي. يمكنك منحه منتجات إضافية من المخزون بحسب قرارك كمالك.",
    lastTakenProduct: "آخر منتج أخذه",
    clientHistory: "السجل وكشف الحساب",

    // Navigation & POS/Dashboard/Historique Tabs
    posSale: "نقطة البيع / الصندوق",
    salesHistory: "سجل المبيعات",
    dashboardPerformance: "لوحة التحكم",
    servicesMenu: "الخدمات والفليكسي",
    titlePos: "نقطة البيع",
    titleSalesHistory: "سجل المبيعات",
    titleDashboardPerformance: "لوحة التحكم / الإحصائيات",
    titleServices: "الخدمات وشحن فليكسي",

    // Dashboard Page
    dashTitle: "لوحة التحكم / أداء المبيعات",
    dashSubtitle: "المؤشرات الرئيسية، المداخيل، هوامش الربح وتوزيع المبيعات",
    dashDateFrom: "من",
    dashDateTo: "إلى",
    dashRefresh: "تحديث",
    dashLoading: "جاري تحميل الإحصائيات...",
    dashNbSales: "عدد المبيعات",
    dashTotalRevenue: "رقم الأعمال (المداخيل)",
    dashTotalCash: "المجموع المقبوض نقداً",
    dashNewCredit: "الديون الجديدة المسجلة",
    dashCostSales: "تكلفة المبيعات",
    dashGrossProfit: "هامش الربح الإجمالي",
    dashTotalClientCredit: "إجمالي ديون الزبائن (الكل)",
    dashActiveDebts: "ديون جارية قيد السداد",
    dashPerfByUser: "الأداء حسب البائع / أمين الصندوق",
    dashTopProducts: "أفضل المنتجات مبيعاً",
    dashColCashier: "البائع / الصندوق",
    dashColNbSales: "عدد المبيعات",
    dashColRevenue: "رقم الأعمال",
    dashColCollected: "المقبوض",
    dashColMargin: "الربح",
    dashColProduct: "المنتج",
    dashColQtySold: "الكمية المباعة",
    dashNoData: "لا توجد بيانات متاحة",

    // Rich Statistics Engine
    statsTabOverview: "نظرة عامة ومؤشرات",
    statsTabTrends: "المبيعات والاتجاهات",
    statsTabProducts: "تحليل المنتجات",
    statsTabCashiers: "فريق العمل والبائعين",
    statsTabTreasury: "السيولة والخزينة",
    statsTabCredit: "الديون والتحصيل",
    statsTabEmployees: "الرواتب والسلفيات",
    statsTabReconciliation: "المطابقة والتدقيق",

    statsFilterToday: "اليوم",
    statsFilterYesterday: "أمس",
    statsFilter7Days: "آخر 7 أيام",
    statsFilterThisMonth: "هذا الشهر",
    statsFilterLastMonth: "الشهر الماضي",
    statsFilterThisYear: "هذه السنة",
    statsFilterCustom: "مخصص",

    statsMarginRate: "نسبة هامش الربح",
    statsAvgBasket: "متوسط السلة",
    statsInventoryValuationCost: "قيمة المخزون (سعر الشراء)",
    statsInventoryValuationSelling: "قيمة المخزون (سعر البيع)",
    statsPotentialMargin: "الربح المحتمل للمخزون",
    statsLowStockAlerts: "منتجات قاربت على النفاد",
    statsOutOfStock: "منتجات نافدة كلياً",
    statsCashCollected: "المبالغ المحصلة نقداً",
    statsCreditRepaid: "الديون المسددة",
    statsNetCreditChange: "صافي تغير الديون",
    statsTotalSalaries: "الرواتب المدفوعة",
    statsTotalAdvances: "السلفيات الممنوحة",
    statsLiveCashRegisters: "السيولة النقدية الحالية (الكل)",
    statsLiveClientDebt: "إجمالي ديون العملاء الحالية",
    statsActiveDebtors: "عدد العملاء المدينين",
    statsReconcileBtn: "بدء المطابقة وتحديث الإحصائيات",
    statsReconcileRunning: "جاري التدقيق والمطابقة...",
    statsReconcileDesc: "يتحقق من تطابق الجداول الإحصائية التراكمية مع المعاملات الأصلية في قاعدة البيانات ويصلح أي فروقات.",
    statsLastReconciled: "آخر مطابقة :",
    statsLastUpdated: "آخر تحديث :",
    statsReconcileSuccess: "تمت المطابقة والتدقيق بنجاح ! جميع الإحصائيات محدثة ومطابقة لسجلات العمليات الأصلية.",
    statsReconciliationLogsTitle: "سجل عمليات المطابقة والتدقيق",

    // Historique Page
    histTitle: "سجل المبيعات",
    histSubtitle: "عرض وتصفية وسداد مدفوعات جميع المبيعات المسجلة",
    histSearchPlaceholder: "بحث (رقم البيع، الزبون، البائع)...",
    histAllStatus: "جميع الحالات",
    histStatusPaid: "مدفوع",
    histStatusPartial: "جزئي",
    histStatusCredit: "دين",
    histFilterBtn: "تصفية",
    histColSaleNum: "رقم البيع",
    histColDate: "التاريخ",
    histColClient: "الزبون",
    histColCashier: "البائع",
    histColTotal: "المجموع",
    histColPaid: "المقبوض",
    histColCredit: "الدين",
    histColStatus: "الحالة",
    histColActions: "إجراءات",
    histLoading: "جاري تحميل المبيعات...",
    histNoSales: "لم يتم العثور على مبيعات",
    histViewDetails: "عرض التفاصيل",
    histCollectCredit: "قبض الدين",
    histDeleteSale: "حذف البيع",
    histPageOf: "صفحة {page} من {totalPages} (إجمالي {total} عملية بيع)",
    histPrev: "السابق",
    histNext: "التالي",
    histGeneralInfo: "معلومات عامة",
    histRemainingCredit: "الدين المتبقي",
    histSoldItems: "المنتجات المباعة",
    histReceivedPayments: "المدفوعات المستلمة",
    histRecordPayment: "تسجيل دفعة",
    histCreditRemainingPay: "الدين المتبقي للسداد",
    histDestCaisse: "الصندوق المستلم",
    histNoCaisse: "-- بدون صندوق --",
    histAmountRcv: "المبلغ المستلم",
    histNotesOptional: "ملاحظات (اختياري)",
    histNotesPlaceholder: "ملاحظات...",
    histConfirmPayment: "تأكيد الدفع",
    histPaymentSavedToast: "تم تسجيل الدفعة بنجاح",
    histSaleDeletedToast: "تم حذف البيع بنجاح",
    histDeleteConfirm: "هل تريد حذف عملية البيع {num}؟ (سيتم استرجاع كميات المخزون)",
    histGrossProfit: "هامش الربح",

    // Ventes / POS Page
    posTitle: "نقطة البيع",
    posInService: "في الخدمة",
    posSearchKbd: "بحث",
    posFavoritesKbd: "المفضلة",
    posTigePackKbd: "حبة/علبة",
    posDebtKbd: "دين",
    posCheckoutKbd: "قبض",
    posScanBarcode: "مسح الباركود بالماسح...",
    posSearchItem: "بحث عن مادة [F2]...",
    posRefreshItems: "تحديث المنتجات",
    posTabFavorites: "المفضلة",
    posTabAll: "الكل",
    posTabTobacco: "التبغ والسجائر",
    posAllCategories: "جميع الفئات",
    posActiveMode: "الوضع النشط:",
    posSwitchToSingle: "تحويل لحبة",
    posSwitchToPack: "تحويل لعلبة",
    posCart: "السلة",
    posEmptyCart: "إفراغ",
    posClientWalkIn: "زبون عابر / دين...",
    posCartEmptyTitle: "السلة فارغة",
    posCartEmptySubtitle: "امسح باركود أو اختر مادة",
    posTotalToPay: "المجموع للدفع",
    posDirectPay: "قبض نقدي مباشر",
    posEnterKey: "[↵ إدخال]",
    posDebtBtn: "دين [D]",
    posLastReceipt: "آخر إيصال",
    posSaleToCredit: "بيع بالدين / دين على الزبون",
    posDebtAmount: "مبلغ الدين",
    posBeneficiaryClient: "الزبون المستفيد *",
    posSearchClient: "بحث عن زبون...",
    posCurrentDebt: "الدين الحالي:",
    posNoteReason: "ملاحظة / السبب",
    posNotePlaceholder: "ملاحظة حول الدين...",
    posValidateDebt: "تأكيد تسجيل الدين",
    posReceipt: "إيصال البيع",
    posThankYou: "شكراً لزيارتكم!",
    posPrint: "طباعة",
    posSoundEnable: "تفعيل الأصوات",
    posSoundDisable: "كتم الأصوات",
    posNoFavoriteItems: "لا توجد مواد مفضلة للصندوق",
    posNoItemsFound: "لم يتم العثور على أي مادة",
    posSeeAllItems: "عرض جميع المواد",
    posDiscount: "خصم",
    posArticleCount: "مادة",
    posMargin: "الربح:",
    posCashReceived: "المبلغ المستلم نقداً (د.ج)",
    posChangeReturned: "الصرف المتبقي للزبون:",
    posRemainingCredit: "المتبقي كدين:",
    posPartialPayOptions: "دفع جزئي / خيارات",
    posConfirmPayment: "تأكيد القبض",
    posPleaseSelectClient: "يرجى تحديد زبون أدناه لتسجيل المتبقي كدين عليه.",
    posSingle: "حبة",
    posPack: "علبة",
    posNextScans: "(المسح التالي: {unit})",
    posLoadingItems: "جاري تحميل المنتجات...",

    // Debt Settlement Modal (Clients)
    settleDebtTitle: "سداد دين الزبون",
    settleDebtSubtitle: "قبض الدفعة وإيداع المبلغ في الصندوق المحدد",
    clientConcerned: "الزبون المعني:",
    currentDebtDue: "الدين الحالي المستحق:",
    lastTakenProductSnippet: "آخر منتج أخذ بالدين سابقاً:",
    amountToCollect: "المبلغ المراد قبضه (د.ج) *",
    totalBalanceBtn: "سداد كامل الدين",
    destCaisseLabel: "📍 الصندوق المستلم (أين يتم إيداع المبلغ المقبوض؟) *",
    caisseSelected: "الصندوق المحدد",
    primaryCaisse: "الرئيسي",
    effectiveDepositIn: "الإيداع الفعلي في:",
    newEstimatedBalance: "الرصيد الجديد المتوقع:",
    paymentMode: "طريقة الدفع",
    paymentDate: "تاريخ الدفع",
    modeCash: "نقداً (كاش)",
    modeTransfer: "تحويل بنكي",
    modeCheck: "شيك",
    modeOther: "أخرى",
    notesRef: "ملاحظات / مرجع",
    fullDebtSettledBanner: "هذه الدفعة تسدد كامل دين الزبون (الرصيد المتبقي: 0.00 د.ج).",
    partialDebtSettledBanner: "سداد جزئي: المتبقي",
    validateSettlementBtn: "قبض وتأكيد السداد"
  }
};
