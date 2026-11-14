import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings,
  AlertTriangle,
  RefreshCw,
  Package,
  CreditCard,
  Truck,
  Users,
  Landmark,
  UserCheck,
  LogOut,
  Globe,
  PanelLeftClose,
  PanelLeft,
  Clock,
  BarChart2,
  ShoppingCart,
  Zap,
  Calendar,
  Bell
} from 'lucide-react';
import SettingsPage from './components/SettingsPage';
import FournisseursPage from './components/FournisseursPage';
import ProductsPage from './components/ProductsPage';
import ClientsPage from './components/ClientsPage';
import EmployeePaiementPage from './components/EmployeePaiementPage';
import CaissesPage from './components/CaissesPage';
import VentesPage from './components/VentesPage';
import HistoriquePage from './components/HistoriquePage';
import DashboardPage from './components/DashboardPage';
import ServicesPage from './components/ServicesPage';
import UserManagementModal from './components/UserManagementModal';
import appLogo from './assets/app-logo.png';
import ActivationScreen from './components/ActivationScreen';
import ExpirationAlertsModal from './components/ExpirationAlertsModal';
import ExpirationPage from './components/ExpirationPage';
import { hasModuleAccess, getPermissionSummary } from './permissions';
import { translations } from './i18n';
import type { Language, Translations } from './i18n';

// Electron IPC API
declare global {
  interface Window {
    electronAPI?: {
      login: (creds: any) => Promise<{ success: boolean; user?: any; message?: string }>;
      getUsers: () => Promise<any[]>;
      createUser: (user: any) => Promise<{ success: boolean; message?: string }>;
      updateUser: (user: any) => Promise<{ success: boolean; message?: string }>;
      deleteUser: (id: number) => Promise<{ success: boolean; message?: string }>;
      updateAccount: (data: any) => Promise<{ success: boolean; user?: any; message?: string }>;
      getAuditLogs: () => Promise<any[]>;
      getAppVersion: () => Promise<string>;
    getUpdateInfo?: () => Promise<{ success: boolean; version: string; schemaVersion: number; lastUpgrade: string | null; migrations: any[] }>;
      getSettings: () => Promise<{ success: boolean; settings?: any; message?: string }>;
      saveSettings: (settings: any) => Promise<{ success: boolean; message?: string }>;
      getPrinters: () => Promise<{ success: boolean; printers?: any[]; message?: string }>;
      printTest: (opts: any) => Promise<{ success: boolean; message?: string }>;
      exportDbBackup: () => Promise<{ success: boolean; filePath?: string; date?: string; canceled?: boolean; message?: string }>;
      importDbBackup: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean; message?: string }>;
      getFullBackupData: () => Promise<{ success: boolean; data?: any; message?: string }>;
      restoreFullBackupData: (data: any) => Promise<{ success: boolean; message?: string }>;

      // Fournisseurs & Historique de Crédit
      getFournisseurs: () => Promise<{ success: boolean; fournisseurs?: any[]; message?: string }>;
      getFournisseurById: (id: number) => Promise<{ success: boolean; fournisseur?: any; credits?: any[]; message?: string }>;
      createFournisseur: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateFournisseur: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteFournisseur: (id: number) => Promise<{ success: boolean; message?: string }>;
      getFournisseurCredits: (params?: any) => Promise<{ success: boolean; credits?: any[]; message?: string }>;
      addFournisseurCredit: (data: any) => Promise<{ success: boolean; newBalance?: number; message?: string }>;
      deleteFournisseurCredit: (id: number) => Promise<{ success: boolean; message?: string }>;

      // Clients & Dettes Clients
      getClients: (params?: any) => Promise<{ success: boolean; clients?: any[]; stats?: any; message?: string }>;
      getClientById: (id: number) => Promise<{ success: boolean; client?: any; debts?: any[]; payments?: any[]; isBlocked?: boolean; lastUnpaidDebts?: any[]; message?: string }>;
      createClient: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateClient: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteClient: (id: number) => Promise<{ success: boolean; message?: string }>;
      addClientDebt: (data: any) => Promise<{ success: boolean; debtId?: number; client?: any; isBlocked?: boolean; previousDebts?: any[]; message?: string }>;
      payClientDebt: (data: any) => Promise<{ success: boolean; paymentId?: number; client?: any; newDebt?: number; isUnblocked?: boolean; message?: string }>;
      deleteClientDebt: (id: number) => Promise<{ success: boolean; message?: string }>;
      deleteClientPayment: (id: number) => Promise<{ success: boolean; message?: string }>;
      getClientStats: () => Promise<{ success: boolean; stats?: any; message?: string }>;

      // KMS Products, Multi-Units & Supplier Comparison
      getProducts: (filters?: any) => Promise<{ success: boolean; products?: any[]; totalCount?: number; totalPages?: number; page?: number; kpis?: any; message?: string }>;
      getProductById: (id: number) => Promise<{ success: boolean; product?: any; units?: any[]; supplier_prices?: any[]; message?: string }>;
      createProduct: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      getNextSku?: () => Promise<{ success: boolean; sku: string }>;
      updateProduct: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteProduct: (id: number) => Promise<{ success: boolean; message?: string }>;
      toggleProductFavorite: (id: number) => Promise<{ success: boolean; is_favorite?: number; message?: string }>;
      updateProductStock: (data: { productId: number; newStock: number; reason?: string }) => Promise<{ success: boolean; message?: string }>;
      getSupplierComparison: (id: number) => Promise<{ success: boolean; comparison?: any[]; minPrice?: number; message?: string }>;
      getExpirationAlerts?: () => Promise<{ success: boolean; counts?: any; lists?: any; message?: string }>;
      getCategories: () => Promise<{ success: boolean; categories?: any[]; message?: string }>;
      createCategory: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateCategory: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteCategory: (id: number) => Promise<{ success: boolean; message?: string }>;
      createCartOrder: (data: any) => Promise<{ success: boolean; orderId?: number; totalAmount?: number; itemCount?: number; message?: string }>;
      getCartOrders: (filters?: any) => Promise<{ success: boolean; orders?: any[]; totalCount?: number; totalPages?: number; currentPage?: number; totalAmountSum?: number; message?: string }>;
      getCartOrderById: (id: number) => Promise<{ success: boolean; order?: any; items?: any[]; message?: string }>;
      deleteCartOrder: (id: number) => Promise<{ success: boolean; message?: string }>;
      updateCartOrder: (data: any) => Promise<{ success: boolean; message?: string }>;
      selectAndParseInvoicePdf: () => Promise<{ success: boolean; canceled?: boolean; fileName?: string; filePath?: string; rawText?: string; items?: any[]; message?: string }>;
      parseInvoicePdfBuffer: (base64: string) => Promise<{ success: boolean; rawText?: string; items?: any[]; message?: string }>;

      // Employees & Payroll
      getEmployees: (filters?: any) => Promise<{ success: boolean; employees?: any[]; totalCount?: number; totalPages?: number; page?: number; message?: string }>;
      getEmployeeById: (id: number) => Promise<{ success: boolean; employee?: any; advances?: any[]; payments?: any[]; debts?: any[]; message?: string }>;
      createEmployee: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateEmployee: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteEmployee: (id: number) => Promise<{ success: boolean; message?: string }>;
      addEmployeeAdvance: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      repayEmployeeAdvance?: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteEmployeeAdvance: (id: number) => Promise<{ success: boolean; message?: string }>;
      paySalary: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      deleteEmployeePayment: (id: number) => Promise<{ success: boolean; message?: string }>;
      addEmployeeDebt: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      repayEmployeeDebt?: (data: any) => Promise<{ success: boolean; remaining?: number; status?: string; message?: string }>;
      deleteEmployeeDebt: (id: number) => Promise<{ success: boolean; message?: string }>;
      getEmployeeKpis: (filters?: any) => Promise<{ success: boolean; kpis?: any; message?: string }>;
            getEmployeeDepartments: () => Promise<{ success: boolean; departments?: string[] }>;
      updateEmployeeSalary?: (data: { id: number; base_salary: number; daily_rate?: number; salary_type?: string; notes?: string }) => Promise<{ success: boolean; message?: string }>;
      getEmployeeAttendance?: (params: { employee_id?: number; month?: string; year?: number | string; date_from?: string; date_to?: string }) => Promise<{ success: boolean; records?: any[]; message?: string }>;
      saveEmployeeAttendance?: (data: { employee_id: number; date: string; status: string; hours?: number; notes?: string }) => Promise<{ success: boolean; message?: string }>;
      bulkSaveEmployeeAttendance?: (data: { employee_id: number; entries: Array<{ date: string; status: string; hours?: number; notes?: string }> }) => Promise<{ success: boolean; message?: string }>;
      deleteEmployeeAttendance?: (data: { employee_id: number; date: string }) => Promise<{ success: boolean; message?: string }>;

      // Multi-Caisse & Trésorerie
      getCaisses: (params?: any) => Promise<{ success: boolean; caisses?: any[]; message?: string }>;
      getCaisseById: (id: number) => Promise<{ success: boolean; caisse?: any; activeSession?: any; stats?: any; recentTransactions?: any[]; message?: string }>;
      createCaisse: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateCaisse: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteCaisse: (id: number) => Promise<{ success: boolean; message?: string }>;
      openCaisseSession: (data: any) => Promise<{ success: boolean; sessionId?: number; message?: string }>;
      closeCaisseSession: (data: any) => Promise<{ success: boolean; discrepancy?: number; difference?: number; actual?: number; expected?: number; message?: string; [key: string]: any }>;
      getCaisseSessions: (params?: any) => Promise<{ success: boolean; sessions?: any[]; message?: string }>;
      getCaisseTransactions: (filters?: any) => Promise<{ success: boolean; transactions?: any[]; totalCount?: number; totalPages?: number; currentPage?: number; limit?: number; message?: string }>;
      createCaisseTransaction: (data: any) => Promise<{ success: boolean; id?: number; newBalance?: number; message?: string }>;
      transferCaisse: (data: any) => Promise<{ success: boolean; debitId?: number; creditId?: number; message?: string }>;
      deleteCaisseTransaction: (id: number) => Promise<{ success: boolean; message?: string }>;
      getCaisseCategories: () => Promise<{ success: boolean; categories?: any[]; message?: string }>;
      createCaisseCategory: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>;
      updateCaisseCategory: (data: any) => Promise<{ success: boolean; message?: string }>;
      deleteCaisseCategory: (id: number) => Promise<{ success: boolean; message?: string }>;
      getCaisseStats: (filters?: any) => Promise<{ success: boolean; stats?: any; message?: string }>;

      // Ventes (POS Sales)
      createVente: (data: any) => Promise<{ success: boolean; id?: number; saleNumber?: string; totalAmount?: number; cashRcv?: number; changeReturned?: number; creditAmount?: number; message?: string }>;
      getVentes: (filters?: any) => Promise<{ success: boolean; ventes?: any[]; total?: number; totalPages?: number; page?: number; message?: string }>;
      getVenteById: (id: number) => Promise<{ success: boolean; vente?: any; lignes?: any[]; paiements?: any[]; message?: string }>;
      deleteVente: (id: number) => Promise<{ success: boolean; message?: string }>;
      addVentePaiement: (data: any) => Promise<{ success: boolean; message?: string }>;
      getVentesStats: (filters?: any) => Promise<{ success: boolean; stats?: any; message?: string }>;
      getVentesDashboard: (filters?: any) => Promise<{ success: boolean; kpi?: any; byUser?: any[]; byProduct?: any[]; totalClientCredit?: number; message?: string }>;
      getStatsDashboard: (filters?: any) => Promise<{ success: boolean; kpi?: any; dailyTrend?: any[]; byUser?: any[]; byProduct?: any[]; byCaisse?: any[]; creditSummary?: any; employeeSummary?: any; inventory?: any; authoritative?: any; totalClientCredit?: number; lastUpdated?: string; lastReconciliation?: any; message?: string }>;
      reconcileStats: (params?: any) => Promise<{ success: boolean; discrepancies?: number; message?: string }>;
      getStatsReconciliationLogs: () => Promise<{ success: boolean; logs?: any[]; message?: string }>;

      // Multi-Services & Flexy API
      getServicesSettings: () => Promise<{ success: boolean; tarifs?: any; balances?: any; apiConfig?: any; serviceCaisses?: { flexy_caisse_id: number | null; photocopie_caisse_id: number | null }; message?: string }>;
      saveServicesSettings: (data: { tarifs?: any; balances?: any; apiConfig?: any; serviceCaisses?: { flexy_caisse_id: number | null; photocopie_caisse_id: number | null } }) => Promise<{ success: boolean; message?: string }>;
      updateSimBalance: (data: { operator: string; amount: number; mode?: 'add' | 'set' }) => Promise<{ success: boolean; balances?: any; message?: string }>;
      recordFlexyTransaction: (data: any) => Promise<{ success: boolean; transactionId?: number; reference?: string; apiResult?: any; message?: string }>;
      getFlexyTransactions: (params?: any) => Promise<{ success: boolean; transactions?: any[]; stats?: any; message?: string }>;
      deleteFlexyTransaction: (id: number) => Promise<{ success: boolean; message?: string }>;
      testFlexyApi: (config?: any) => Promise<{ success: boolean; message?: string; status?: number; data?: any }>;
      flushCache?: () => Promise<{ success: boolean; message?: string }>;

      // Dominosoft Software Activation
      checkActivation?: () => Promise<{ activated: boolean; key?: string; client?: string; software?: string; token?: string; activatedAt?: number; demo?: any }>;
      verifyActivationKey?: (key: string) => Promise<{ success: boolean; client?: string; software?: string; token?: string; error?: string }>;
      relaunchApp?: () => Promise<void>;
    };
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'clients' | 'fournisseurs' | 'ventes' | 'services' | 'historique' | 'dashboard' | 'paiement' | 'caisses' | 'settings' | 'account' | 'expirations'>('ventes');
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['ventes']));

  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    window.dispatchEvent(new CustomEvent('app:tabActivated', { detail: activeTab }));
  }, [activeTab]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language') as Language;
    return saved === 'fr' || saved === 'en' || saved === 'ar' ? saved : 'fr';
  });
  const t: Translations = translations[currentLang] || translations.fr;

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Users list
  const [usersList, setUsersList] = useState<any[]>([
    { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin' },
    { id: 2, username: 'manager', full_name: 'Logistics Manager', role: 'manager' }
  ]);

  // User & Role Management Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalTargetUser, setRoleModalTargetUser] = useState<any>(null);

  // Employee Self-Attendance for Today state
  const [todayAttendance, setTodayAttendance] = useState<'none' | 'present' | 'half_day' | 'absent'>('none');
  const [savingAttendance, setSavingAttendance] = useState(false);

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchTodayAttendance = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      if (window.electronAPI?.getEmployeeAttendance) {
        const tDate = getTodayDateStr();
        const res = await window.electronAPI.getEmployeeAttendance({
          employee_id: currentUser.id,
          date_from: tDate,
          date_to: tDate
        });
        if (res?.success && Array.isArray(res.records) && res.records.length > 0) {
          const rec = res.records[0];
          setTodayAttendance(rec.status as any);
        } else {
          setTodayAttendance('none');
        }
      }
    } catch (e) {
      console.error('Failed to fetch today attendance:', e);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    const handler = () => fetchTodayAttendance();
    window.addEventListener('app:attendanceUpdated', handler);
    return () => window.removeEventListener('app:attendanceUpdated', handler);
  }, [fetchTodayAttendance]);

  // Guard: if user does not have privilege for paiement, redirect to ventes
  useEffect(() => {
    if (currentUser && activeTab === 'paiement' && !hasModuleAccess(currentUser, 'paiement')) {
      setActiveTab('ventes');
    }
  }, [currentUser, activeTab]);

  const handleUpdateTodayAttendance = async (newStatus: string) => {
    if (!currentUser?.id || savingAttendance) return;
    setSavingAttendance(true);
    try {
      const tDate = getTodayDateStr();
      const hours = newStatus === 'half_day' ? 4 : newStatus === 'present' ? 8 : 0;
      const res = await window.electronAPI?.saveEmployeeAttendance?.({
        employee_id: currentUser.id,
        date: tDate,
        status: newStatus,
        hours
      });
      if (res?.success) {
        setTodayAttendance(newStatus as any);
        window.dispatchEvent(new CustomEvent('app:attendanceUpdated'));
      }
    } catch (e) {
      console.error('Failed to save today attendance:', e);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Dominosoft Software Activation & Mode Démo (3 jours)
  const [activationChecked, setActivationChecked] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoInfo, setDemoInfo] = useState<any>(null);
  const [activationInfo, setActivationInfo] = useState<any>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Expiration Alerts state (v3.3.3)
  const [expirationAlerts, setExpirationAlerts] = useState<{
    counts: { total: number; expired: number; less1m: number; less2m: number; less3m: number; safe: number };
    lists: { expired: any[]; less1m: any[]; less2m: any[]; less3m: any[]; allAlerts: any[] };
  }>({
    counts: { total: 0, expired: 0, less1m: 0, less2m: 0, less3m: 0, safe: 0 },
    lists: { expired: [], less1m: [], less2m: [], less3m: [], allAlerts: [] }
  });
  const [showExpirationModal, setShowExpirationModal] = useState(false);

  const fetchExpirationAlerts = async () => {
    try {
      if (window.electronAPI?.getExpirationAlerts) {
        const res = await window.electronAPI.getExpirationAlerts();
        if (res && res.success) {
          setExpirationAlerts({
            counts: res.counts || { total: 0, expired: 0, less1m: 0, less2m: 0, less3m: 0, safe: 0 },
            lists: res.lists || { expired: [], less1m: [], less2m: [], less3m: [], allAlerts: [] }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching expiration alerts:', err);
    }
  };

  useEffect(() => {
    fetchExpirationAlerts();
    const handleProductsUpdated = () => fetchExpirationAlerts();
    window.addEventListener('products:updated', handleProductsUpdated);
    window.addEventListener('app:refresh', handleProductsUpdated);
    return () => {
      window.removeEventListener('products:updated', handleProductsUpdated);
      window.removeEventListener('app:refresh', handleProductsUpdated);
    };
  }, []);

  useEffect(() => {
    async function checkLicensing() {
      try {
        if (window.electronAPI?.checkActivation) {
          const res = await window.electronAPI.checkActivation();
          setActivationInfo(res);
          if (res.activated) {
            setIsActivated(true);
            setIsDemoActive(false);
            setDemoInfo(null);
          } else {
            setIsActivated(false);
            const demo = res.demo;
            setDemoInfo(demo || null);
            if (demo && !demo.expired) {
              setIsDemoActive(true);
            } else {
              setIsDemoActive(false);
            }
          }
        } else {
          setIsActivated(true);
        }
      } catch (err) {
        console.error('Erreur vérification licence Dominosoft:', err);
        setIsDemoActive(true);
      } finally {
        setActivationChecked(true);
      }
    }
    checkLicensing();
  }, []);

  // Vérification périodique du mode démo pour verrouiller si les 3 jours expirent en cours d'utilisation
  useEffect(() => {
    if (isActivated) return;
    const interval = setInterval(async () => {
      try {
        if (window.electronAPI?.checkActivation) {
          const res = await window.electronAPI.checkActivation();
          if (res.activated) {
            setIsActivated(true);
            setIsDemoActive(false);
            setActivationInfo(res);
          } else if (res.demo) {
            setDemoInfo(res.demo);
            if (res.demo.expired) {
              setIsDemoActive(false);
            }
          }
        }
      } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [isActivated]);

  // Load users and trigger global data refresh & cache flush
  const reloadData = async () => {
    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }
      if (window.electronAPI?.getUsers) {
        const us = await window.electronAPI.getUsers();
        if (us && Array.isArray(us)) setUsersList(us);
      }
      // Dispatch both events: general refresh + specific products refresh for POS
      window.dispatchEvent(new CustomEvent('app:refresh'));
      window.dispatchEvent(new CustomEvent('products:updated'));
      fetchExpirationAlerts();
    } catch (err) {
      console.error('Error reloading app data & flushing cache:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      reloadData();
    }
  }, [currentUser]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      if (window.electronAPI?.login) {
        const res = await window.electronAPI.login({ username, password });
        if (res.success && res.user) {
          setCurrentUser(res.user);
          const candidateTabs: Array<'ventes' | 'services' | 'dashboard' | 'historique' | 'products' | 'expirations' | 'clients' | 'fournisseurs' | 'caisses' | 'paiement' | 'settings' | 'account'> = [
            'ventes', 'services', 'dashboard', 'historique', 'products', 'expirations', 'clients', 'fournisseurs', 'caisses', 'paiement', 'settings', 'account'
          ];
          if (!hasModuleAccess(res.user, activeTab)) {
            const firstAllowed = candidateTabs.find(tab => hasModuleAccess(res.user, tab));
            if (firstAllowed) setActiveTab(firstAllowed);
          }
        } else {
          setLoginError(res.message || 'Identifiants invalides');
        }
      } else {
        if (username === 'admin' && password === 'admin') {
          setCurrentUser({ id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin', permissions: ['*'] });
        } else if (username === 'manager' && password === 'manager') {
          setCurrentUser({ id: 2, username: 'manager', full_name: 'Logistics Manager', role: 'manager', permissions: ['*'] });
        } else {
          setLoginError('Identifiant ou mot de passe incorrect');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = currentLang === 'fr' ? 'en' : currentLang === 'en' ? 'ar' : 'fr';
    setCurrentLang(nextLang);
    localStorage.setItem('app_language', nextLang);
  };

  // --- ACTIVATION CHECK SCREEN ---
  if (!activationChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#2563eb', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Vérification de la licence Dominosoft...</p>
        </div>
      </div>
    );
  }

  const isAccessAllowed = isActivated || (isDemoActive && !demoInfo?.expired);

  // --- ACTIVATION LOCK SCREEN (Bloque l'accès si non activé ET période démo de 3 jours expirée) ---
  if (!isAccessAllowed) {
    return (
      <ActivationScreen 
        isExpiredDemo={demoInfo?.expired}
        demoDaysTotal={demoInfo?.durationDays || 3}
        onActivated={(info) => {
          setIsActivated(true);
          setIsDemoActive(false);
          setActivationInfo({ ...info, activated: true });
        }} 
      />
    );
  }

  // --- LOGIN SCREEN (Clean White & Green) ---
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '16px' }}>
        <div className="clean-card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <img 
                src={appLogo} 
                alt="imatechx logo" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.getAttribute('data-fallback')) {
                    target.setAttribute('data-fallback', 'true');
                    target.src = './app-logo.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
                style={{ 
                  width: '92px', 
                  height: '92px', 
                  objectFit: 'contain'
                }} 
              />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', textTransform: 'lowercase' }}>
              imatechx
            </h1>
          </div>

         

          {loginError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {t.username}
              </label>
              <input 
                type="text" 
                className="input-clean"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {t.currentPassword}
              </label>
              <input 
                type="password" 
                className="input-clean"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-green"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '6px' }}
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : null}
              {t.logout ? 'Connexion' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Toggle Sidebar
  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('app_sidebar_open', String(next));
      return next;
    });
  };

  // --- MAIN APP (White & Green Dashboard with Sidebar) ---
  return (
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        background: '#f8fafc',
        flexDirection: currentLang === 'ar' ? 'row-reverse' : 'row'
      }}
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Sidebar */}
      <aside style={{ 
        width: sidebarOpen ? '260px' : '0px',
        opacity: sidebarOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        background: '#ffffff', 
        borderRight: sidebarOpen ? (currentLang === 'ar' ? 'none' : '1px solid #e2e8f0') : 'none', 
        borderLeft: sidebarOpen ? (currentLang === 'ar' ? '1px solid #e2e8f0' : 'none') : 'none', 
        display: 'flex', 
        flexDirection: 'column',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              <img 
                src={appLogo} 
                alt="imatechx" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.getAttribute('data-fallback')) {
                    target.setAttribute('data-fallback', 'true');
                    target.src = './app-logo.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', letterSpacing: '-0.01em' }}>imatechx</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={toggleSidebar}
            title="Masquer la barre latérale"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px' }}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Navigation links */}
        <nav style={{ padding: '14px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
          {/* 1. Dashboard Tab */}
          {hasModuleAccess(currentUser, 'dashboard') && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'dashboard' ? '#dcfce7' : 'transparent',
                color: activeTab === 'dashboard' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart2 size={17} /> {t.dashboardPerformance}
            </button>
          )}

          {/* 2. Ventes / POS Tab */}
          {hasModuleAccess(currentUser, 'ventes') && (
            <button 
              onClick={() => setActiveTab('ventes')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'ventes' ? '#dcfce7' : 'transparent',
                color: activeTab === 'ventes' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <ShoppingCart size={17} /> {t.posSale}
            </button>
          )}

          {/* 3. Historique des Ventes Tab */}
          {hasModuleAccess(currentUser, 'historique') && (
            <button 
              onClick={() => setActiveTab('historique')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'historique' ? '#dcfce7' : 'transparent',
                color: activeTab === 'historique' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Clock size={17} /> {t.salesHistory}
            </button>
          )}

          {/* 3b. Services & Flexy Tab */}
          {hasModuleAccess(currentUser, 'services') && (
            <button 
              onClick={() => setActiveTab('services')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'services' ? '#dcfce7' : 'transparent',
                color: activeTab === 'services' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={17} /> {t.servicesMenu || 'Services & Flexy'}
            </button>
          )}

          {/* Divider */}
          {(hasModuleAccess(currentUser, 'products') || hasModuleAccess(currentUser, 'clients') || hasModuleAccess(currentUser, 'fournisseurs')) && (
            <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 6px' }} />
          )}

          {/* 4. Produits & Stock Tab */}
          {hasModuleAccess(currentUser, 'products') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <button 
                onClick={() => setActiveTab('products')}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px', 
                  borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: activeTab === 'products' ? '#dcfce7' : 'transparent',
                  color: activeTab === 'products' ? '#15803d' : '#475569',
                  textAlign: currentLang === 'ar' ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={17} /> {t.products}
                </div>
                {expirationAlerts.counts.total > 0 && (
                  <span 
                    style={{
                      background: expirationAlerts.counts.expired > 0 ? '#dc2626' : expirationAlerts.counts.less1m > 0 ? '#ef4444' : expirationAlerts.counts.less2m > 0 ? '#ea580c' : '#eab308',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}
                    title={`${expirationAlerts.counts.total} produit(s) avec alerte de péremption`}
                  >
                    {expirationAlerts.counts.total}
                  </span>
                )}
              </button>

              {/* v3.3.3: Page & Notification d'expiration dans la barre latérale */}
              {hasModuleAccess(currentUser, 'expirations') && (
              <button
                type="button"
                onClick={() => setActiveTab('expirations')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: expirationAlerts.counts.expired > 0 
                    ? '1px solid #fecaca' 
                    : expirationAlerts.counts.less1m > 0 
                    ? '1px solid #fecdd3' 
                    : expirationAlerts.counts.less2m > 0
                    ? '1px solid #fed7aa'
                    : expirationAlerts.counts.less3m > 0
                    ? '1px solid #fef08a'
                    : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: expirationAlerts.counts.expired > 0 
                    ? '#fef2f2' 
                    : expirationAlerts.counts.less1m > 0 
                    ? '#fff1f2' 
                    : expirationAlerts.counts.less2m > 0
                    ? '#fff7ed'
                    : expirationAlerts.counts.less3m > 0
                    ? '#fefce8'
                    : '#f8fafc',
                  color: expirationAlerts.counts.expired > 0 
                    ? '#dc2626' 
                    : expirationAlerts.counts.less1m > 0 
                    ? '#ef4444' 
                    : expirationAlerts.counts.less2m > 0
                    ? '#ea580c'
                    : expirationAlerts.counts.less3m > 0
                    ? '#ca8a04'
                    : '#64748b',
                  transition: 'all 0.15s ease'
                }}
                title="Consulter les produits expirés ou proches de la péremption (< 1 mois, < 2 mois, < 3 mois)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color={
                    expirationAlerts.counts.expired > 0 
                      ? '#dc2626' 
                      : expirationAlerts.counts.less1m > 0 
                      ? '#ef4444' 
                      : expirationAlerts.counts.less2m > 0
                      ? '#ea580c'
                      : expirationAlerts.counts.less3m > 0
                      ? '#ca8a04'
                      : '#94a3b8'
                  } />
                  <span>{t.expirationSidebarBtn}</span>
                </div>
                
                {/* Badges de couleur par niveau d'alerte */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {expirationAlerts.counts.expired > 0 && (
                    <span style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }} title={`${expirationAlerts.counts.expired} déjà périmé(s)`}>
                      {expirationAlerts.counts.expired} périmé
                    </span>
                  )}
                  {expirationAlerts.counts.less1m > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }} title={`${expirationAlerts.counts.less1m} à moins d'un mois`}>
                      {expirationAlerts.counts.less1m} &lt;1m
                    </span>
                  )}
                  {expirationAlerts.counts.less2m > 0 && (
                    <span style={{
                      background: '#ea580c',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }} title={`${expirationAlerts.counts.less2m} à moins de 2 mois`}>
                      {expirationAlerts.counts.less2m} &lt;2m
                    </span>
                  )}
                  {expirationAlerts.counts.less3m > 0 && (
                    <span style={{
                      background: '#ca8a04',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }} title={`${expirationAlerts.counts.less3m} à moins de 3 mois`}>
                      {expirationAlerts.counts.less3m} &lt;3m
                    </span>
                  )}
                  {expirationAlerts.counts.total === 0 && (
                    <span style={{
                      background: '#e2e8f0',
                      color: '#64748b',
                      fontSize: '9px',
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }}>
                      0
                    </span>
                  )}
                </div>
              </button>
              )}
            </div>
          )}

          {/* 5. Clients & Dettes Tab */}
          {hasModuleAccess(currentUser, 'clients') && (
            <button 
              onClick={() => setActiveTab('clients')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'clients' ? '#dcfce7' : 'transparent',
                color: activeTab === 'clients' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <CreditCard size={17} /> {t.clients}
            </button>
          )}

          {/* 6. Fournisseurs Tab */}
          {hasModuleAccess(currentUser, 'fournisseurs') && (
            <button 
              onClick={() => setActiveTab('fournisseurs')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'fournisseurs' ? '#dcfce7' : 'transparent',
                color: activeTab === 'fournisseurs' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Truck size={17} /> {t.providers}
            </button>
          )}

          {/* Divider */}
          {(hasModuleAccess(currentUser, 'caisses') || hasModuleAccess(currentUser, 'paiement')) && (
            <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 6px' }} />
          )}

          {/* 7. Multi-Caisse & Trésorerie Tab */}
          {hasModuleAccess(currentUser, 'caisses') && (
            <button 
              onClick={() => setActiveTab('caisses')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'caisses' ? '#dcfce7' : 'transparent',
                color: activeTab === 'caisses' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Landmark size={17} /> {t.caisses}
            </button>
          )}

          {/* 8. Paiement des Employés Tab */}
          {hasModuleAccess(currentUser, 'paiement') && (
            <button 
              onClick={() => setActiveTab('paiement')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'paiement' ? '#dcfce7' : 'transparent',
                color: activeTab === 'paiement' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={17} /> {t.empPageTitle}
            </button>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 6px' }} />

          {/* 9. Settings Tab */}
          {hasModuleAccess(currentUser, 'settings') && (
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'settings' ? '#dcfce7' : 'transparent',
                color: activeTab === 'settings' ? '#15803d' : '#475569',
                textAlign: currentLang === 'ar' ? 'right' : 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={17} /> {t.settings}
            </button>
          )}

          {/* 10. Account Tab (Always accessible) */}
          <button 
            onClick={() => setActiveTab('account')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: activeTab === 'account' ? '#dcfce7' : 'transparent',
              color: activeTab === 'account' ? '#15803d' : '#475569',
              textAlign: currentLang === 'ar' ? 'right' : 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={17} /> {t.tabAccount}
          </button>

          {/* 11. Admin: Roles & Users Management Link */}
          {currentUser?.role === 'admin' && (
            <>
              <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 6px 4px' }} />
              <button 
                type="button"
                onClick={() => { setRoleModalTargetUser(null); setShowRoleModal(true); }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                  borderRadius: '8px', border: '1px solid #bbf7d0', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#15803d',
                  textAlign: currentLang === 'ar' ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserCheck size={17} color="#16a34a" /> Rôles & Accès
              </button>
            </>
          )}
        </nav>

        {/* User Card */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser.full_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                <span className="badge-clean badge-green" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  {currentUser.role}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {getPermissionSummary(currentUser).label}
                </span>
              </div>
            </div>
          </div>
          {/* Quick attendance buttons in sidebar for logged-in user */}
          <div style={{ marginBottom: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={11} color="#16a34a" /> {t.empQuickPointageToday || "Pointage Aujourd'hui"}
              </span>
              <span style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 800,
                background: todayAttendance === 'present' ? '#dcfce7' : todayAttendance === 'half_day' ? '#ffedd5' : todayAttendance === 'absent' ? '#fee2e2' : '#f1f5f9',
                color: todayAttendance === 'present' ? '#15803d' : todayAttendance === 'half_day' ? '#c2410c' : todayAttendance === 'absent' ? '#dc2626' : '#64748b'
              }}>
                {todayAttendance === 'present' ? (t.attPresent || 'Présent') : todayAttendance === 'half_day' ? (t.attHalfDay || '0.5j') : todayAttendance === 'absent' ? (t.attAbsent || 'Absent') : (t.empNotPointed || 'Non pointé')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleUpdateTodayAttendance('present')}
                disabled={savingAttendance}
                title={t.attPresent || "Journée complète (1j)"}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  border: todayAttendance === 'present' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: todayAttendance === 'present' ? '#dcfce7' : '#ffffff',
                  color: '#15803d',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                🟢 1j
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTodayAttendance('half_day')}
                disabled={savingAttendance}
                title={t.attHalfDay || "Demi-journée (0.5j)"}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  border: todayAttendance === 'half_day' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  background: todayAttendance === 'half_day' ? '#ffedd5' : '#ffffff',
                  color: '#c2410c',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                🟠 0.5j
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTodayAttendance('absent')}
                disabled={savingAttendance}
                title={t.attAbsent || "Absent (0j)"}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  border: todayAttendance === 'absent' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  background: todayAttendance === 'absent' ? '#fee2e2' : '#ffffff',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                🔴 0j
              </button>
            </div>
          </div>
          <button 
            onClick={() => setCurrentUser(null)}
            className="btn-danger"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <LogOut size={13} /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{ height: '60px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle Sidebar Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn-secondary"
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
              title={sidebarOpen ? "Masquer la barre latérale" : "Afficher la barre latérale"}
            >
              {sidebarOpen ? <PanelLeftClose size={18} color="#475569" /> : <PanelLeft size={18} color="#16a34a" />}
            </button>

            {!sidebarOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px', borderRight: '1px solid #e2e8f0' }}>
                <img 
                  src={appLogo} 
                  alt="imatechx" 
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.getAttribute('data-fallback')) {
                      target.setAttribute('data-fallback', 'true');
                      target.src = './app-logo.png';
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                  style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
                />
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>imatechx</span>
              </div>
            )}

            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {activeTab === 'products'
                ? t.productsHeading
                : activeTab === 'expirations'
                ? t.expirationPageTitle
                : activeTab === 'clients'
                ? t.clientsHeading
                : activeTab === 'fournisseurs' 
                ? t.providersHeading
                : activeTab === 'ventes'
                ? t.titlePos
                : activeTab === 'historique'
                ? t.titleSalesHistory
                : activeTab === 'dashboard'
                ? t.titleDashboardPerformance
                : activeTab === 'paiement'
                ? t.empPageTitle
                : activeTab === 'caisses'
                ? t.caissesHeading
                : activeTab === 'settings' 
                ? t.titleSettings 
                : t.accountHeading}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mode Démo Badge si en période d'essai de 3 jours */}
            {isDemoActive && !isActivated && demoInfo && (
              <button
                type="button"
                onClick={() => setShowActivationModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  cursor: 'pointer'
                }}
                title="Cliquez pour activer la version complète"
              >
                <Clock size={13} />
                <span>Mode Démo : {demoInfo.daysLeft > 1 ? `${demoInfo.daysLeft} jours restants` : `${demoInfo.hoursLeft}h restantes`}</span>
                <span style={{ textDecoration: 'underline', color: '#15803d', fontWeight: 800 }}>Activer</span>
              </button>
            )}
            {/* Quick Today Attendance in Top Header */}
            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: todayAttendance === 'present' ? '#f0fdf4' : todayAttendance === 'half_day' ? '#fff7ed' : todayAttendance === 'absent' ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${todayAttendance === 'present' ? '#bbf7d0' : todayAttendance === 'half_day' ? '#fed7aa' : todayAttendance === 'absent' ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px'
                }}
                title={`${t.empQuickPointageToday} (${getTodayDateStr()})`}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="#16a34a" />
                  <span style={{ display: 'inline' }}>{t.empPointedStatus || "Pointage :"}</span>
                </span>

                <select
                  value={todayAttendance || 'none'}
                  onChange={(e) => handleUpdateTodayAttendance(e.target.value)}
                  disabled={savingAttendance}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: todayAttendance === 'present' ? '#15803d' : todayAttendance === 'half_day' ? '#c2410c' : todayAttendance === 'absent' ? '#dc2626' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '2px 4px'
                  }}
                >
                  <option value="none">⚪ {t.empNotPointed || "Non pointé"}</option>
                  <option value="present">🟢 {t.attPresent || "Présent"} (1j)</option>
                  <option value="half_day">🟠 {t.attHalfDay || "Demi-journée"} (0.5j)</option>
                  <option value="absent">🔴 {t.attAbsent || "Absent"} (0j)</option>
                </select>
              </div>
            )}

            {/* Quick language toggle */}
            <button 
              type="button"
              onClick={toggleLanguage}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Changer de langue"
            >
              <Globe size={14} color="#16a34a" />
              <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {currentLang === 'fr' ? 'FR 🇫🇷' : currentLang === 'en' ? 'EN 🇬🇧' : 'AR 🇲🇦'}
              </span>
            </button>

                        {hasModuleAccess(currentUser, 'expirations') && (
              <button 
                type="button"
                onClick={() => setActiveTab('expirations')} 
                className="btn-secondary" 
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: expirationAlerts.counts.expired > 0 ? '#fecaca' : expirationAlerts.counts.total > 0 ? '#fed7aa' : undefined,
                  background: expirationAlerts.counts.expired > 0 ? '#fef2f2' : expirationAlerts.counts.total > 0 ? '#fff7ed' : undefined,
                  color: expirationAlerts.counts.expired > 0 ? '#dc2626' : expirationAlerts.counts.total > 0 ? '#ea580c' : undefined
                }}
                title={t.expirationPageTitle}
              >
                <Bell size={14} color={expirationAlerts.counts.expired > 0 ? '#dc2626' : expirationAlerts.counts.total > 0 ? '#ea580c' : '#64748b'} />
                <span style={{ fontWeight: 700, fontSize: '12px' }}>{t.expirationSidebarBtn}</span>
                {expirationAlerts.counts.total > 0 && (
                  <span style={{
                    background: expirationAlerts.counts.expired > 0 ? '#dc2626' : expirationAlerts.counts.less1m > 0 ? '#ef4444' : expirationAlerts.counts.less2m > 0 ? '#ea580c' : '#ca8a04',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    lineHeight: '1.2'
                  }}>
                    {expirationAlerts.counts.total}
                  </span>
                )}
              </button>
            )}

            <button onClick={reloadData} className="btn-secondary" title="Actualiser la base SQLite">
              <RefreshCw size={14} /> {t.refresh}
            </button>

            {currentUser.role === 'admin' && (
              <button 
                onClick={() => { setRoleModalTargetUser(null); setShowRoleModal(true); }} 
                className="btn-green"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Gérer les travailleurs et leurs responsabilités fonctionnelles"
              >
                <UserCheck size={15} /> Rôles & Utilisateurs
              </button>
            )}
          </div>
        </header>

        {/* Tab Contents - Keep-alive mounted for instant switching and persistent POS cart/search */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {mountedTabs.has('products') && (
            <div style={{ display: activeTab === 'products' ? 'block' : 'none' }}>
              <ProductsPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          
          {mountedTabs.has('expirations') && (
            <div style={{ display: activeTab === 'expirations' ? 'block' : 'none' }}>
              <ExpirationPage
                currentLang={currentLang}
                currentUser={currentUser}
                onNavigateToProducts={(prodId) => {
                  setActiveTab('products');
                  if (prodId) {
                    setTimeout(() => {
                      const row = document.getElementById(`product-row-${prodId}`);
                      if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 300);
                  }
                }}
              />
            </div>
          )}{mountedTabs.has('clients') && (
            <div style={{ display: activeTab === 'clients' ? 'block' : 'none' }}>
              <ClientsPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('fournisseurs') && (
            <div style={{ display: activeTab === 'fournisseurs' ? 'block' : 'none' }}>
              <FournisseursPage 
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('ventes') && (
            <div style={{ display: activeTab === 'ventes' ? 'block' : 'none' }}>
              <VentesPage
                currentLang={currentLang}
                currentUser={currentUser}
                isActive={activeTab === 'ventes'}
              />
            </div>
          )}
          {mountedTabs.has('historique') && (
            <div style={{ display: activeTab === 'historique' ? 'block' : 'none' }}>
              <HistoriquePage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('services') && (
            <div style={{ display: activeTab === 'services' ? 'block' : 'none' }}>
              <ServicesPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('dashboard') && (
            <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
              <DashboardPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('paiement') && (
            <div style={{ display: activeTab === 'paiement' ? 'block' : 'none' }}>
              <EmployeePaiementPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {mountedTabs.has('caisses') && (
            <div style={{ display: activeTab === 'caisses' ? 'block' : 'none' }}>
              <CaissesPage
                currentLang={currentLang}
                currentUser={currentUser}
              />
            </div>
          )}
          {(mountedTabs.has('settings') || mountedTabs.has('account')) && (
            <div style={{ display: (activeTab === 'settings' || activeTab === 'account') ? 'block' : 'none' }}>
              <SettingsPage
                currentLang={currentLang}
                onLanguageChange={setCurrentLang}
                currentUser={currentUser}
                onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
                onSwitchUser={(user) => setCurrentUser(user)}
                availableUsers={usersList}
                onDataRestored={reloadData}
                activeSubTab={activeTab === 'account' ? 'account' : undefined}
                onSubTabChange={(sub) => {
                  if (sub === 'account') setActiveTab('account');
                  else setActiveTab('settings');
                }}
                onOpenRoleModal={(user) => {
                  setRoleModalTargetUser(user || null);
                  setShowRoleModal(true);
                }}
                activationInfo={activationInfo}
                onOpenActivationModal={() => setShowActivationModal(true)}
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL: GESTION DES UTILISATEURS & PERMISSIONS (CASES À COCHER) */}
      <UserManagementModal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setRoleModalTargetUser(null);
        }}
        currentUser={currentUser}
        currentLang={currentLang}
        initialEditUser={roleModalTargetUser}
        onUsersUpdated={async () => {
          await reloadData();
          if (window.electronAPI?.getUsers) {
            const allUsers = await window.electronAPI.getUsers();
            const self = allUsers.find((u: any) => u.id === currentUser?.id);
            if (self) setCurrentUser(self);
          }
        }}
      />

      {/* MODAL: SUIVI DES DATES D'EXPIRATION (v3.3.3) */}
      <ExpirationAlertsModal
        isOpen={showExpirationModal}
        onClose={() => setShowExpirationModal(false)}
        data={expirationAlerts}
        onRefresh={fetchExpirationAlerts}
        onNavigateToProduct={(p) => {
          setShowExpirationModal(false);
          setActiveTab('products');
          // Dispatched event to let ProductsPage highlight or search this product
          setTimeout(() => {
            const row = document.getElementById(`product-row-${p.id}`);
            if (row) {
              row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }}
        currentLang={currentLang}
      />

      {/* MODAL: ACTIVATION / LICENCE DU LOGICIEL (DOMINOSOFT) */}
      {showActivationModal && (
        <ActivationScreen
          isModal
          onClose={() => setShowActivationModal(false)}
          onActivated={(info) => {
            setActivationInfo(info);
            setIsActivated(true);
            setShowActivationModal(false);
          }}
        />
      )}
    </div>
  );
}
