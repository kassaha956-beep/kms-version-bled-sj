import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, Plus, Trash2, Edit, Search, ArrowUpRight, ArrowDownLeft, 
  ArrowRightLeft, CheckCircle, AlertTriangle, Filter, 
  Clock, DollarSign, Layers, Lock, Unlock, FileText, RefreshCw, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ShieldCheck, TrendingUp, TrendingDown, Eye
} from 'lucide-react';
import { translations } from '../i18n';
import type { Language, Translations } from '../i18n';
import { hasPermission } from '../permissions';

interface CaissesPageProps {
  currentLang: Language;
  currentUser: any;
}

export default function CaissesPage({ currentLang, currentUser }: CaissesPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;
  const canManageCaisses = hasPermission(currentUser, 'caisses.manage');
  const canTransfer = hasPermission(currentUser, 'caisses.transfer');

  // Active sub-tab: 'caisses' | 'transactions' | 'categories' | 'sessions'
  const [activeSubTab, setActiveSubTab] = useState<'caisses' | 'transactions' | 'categories' | 'sessions'>('caisses');

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Data states
  const [caisses, setCaisses] = useState<any[]>([]);
  const [selectedCaisseId, setSelectedCaisseId] = useState<string>('all');
  const [stats, setStats] = useState<any>({
    totalSolde: 0,
    totalEntrees: 0,
    totalSorties: 0,
    netCashFlow: 0,
    entreesCount: 0,
    sortiesCount: 0,
    totalTransactions: 0,
    activeCaissesCount: 0,
    totalCaissesCount: 0,
    todayIn: 0,
    todayOut: 0,
    todayNet: 0,
    categoryBreakdown: []
  });

  // Transaction listing & pagination state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filters for transactions
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Categories & Sessions
  const [categories, setCategories] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [sessionsFilterUser, setSessionsFilterUser] = useState<string>('all');
  const [sessionsFilterStatus, setSessionsFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [sessionsFilterDiscrepancy, setSessionsFilterDiscrepancy] = useState<'all' | 'discrepancy' | 'exact'>('all');
  const [sessionsFilterDatePreset, setSessionsFilterDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('all');
  const [sessionsStartDate, setSessionsStartDate] = useState<string>('');
  const [sessionsEndDate, setSessionsEndDate] = useState<string>('');
  const [sessionsSearch, setSessionsSearch] = useState<string>('');
  
  // Sessions Pagination state
  const [sessionsPage, setSessionsPage] = useState<number>(1);
  const [sessionsLimit, setSessionsLimit] = useState<number>(15);
  const [sessionsTotalPages, setSessionsTotalPages] = useState<number>(1);
  const [sessionsTotalCount, setSessionsTotalCount] = useState<number>(0);

  // Selected session for standalone details modal (not expanding at bottom)
  const [selectedSessionModal, setSelectedSessionModal] = useState<any>(null);

  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    caisse_id: '',
    type: 'in' as 'in' | 'out',
    amount: '',
    category_id: '',
    description: '',
    reference: '',
    payment_method: 'especes'
  });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_caisse_id: '',
    to_caisse_id: '',
    amount: '',
    description: 'Transfert de trésorerie',
    reference: ''
  });

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openForm, setOpenForm] = useState({
    caisse_id: 0,
    caisse_name: '',
    opening_balance: 0,
    current_balance: 0,
    notes: ''
  });

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({
    caisse_id: 0,
    session_id: 0,
    caisse_name: '',
    opening_balance: 0,
    session_in: 0,
    session_out: 0,
    expected_balance: 0,
    current_balance: 0,
    actual_counted: '',
    notes: ''
  });

  const [showCaisseModal, setShowCaisseModal] = useState(false);
  const [caisseEditMode, setCaisseEditMode] = useState(false);
  const [caisseForm, setCaisseForm] = useState({
    id: 0,
    name: '',
    code: '',
    notes: ''
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: 0,
    name: '',
    type: 'both',
    color: '#16a34a',
    icon: 'tag',
    description: '',
    is_system: 0
  });

  // Auto-dismiss banners
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Load all foundational data
  const loadCaisses = async () => {
    if (!window.electronAPI?.getCaisses) return;
    try {
      const res = await window.electronAPI.getCaisses();
      if (res.success && res.caisses) {
        setCaisses(res.caisses);
      }
    } catch (err: any) {
      console.error('Error loading caisses:', err);
    }
  };

  const loadCategories = async () => {
    if (!window.electronAPI?.getCaisseCategories) return;
    try {
      const res = await window.electronAPI.getCaisseCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const loadStats = async () => {
    if (!window.electronAPI?.getCaisseStats) return;
    try {
      const res = await window.electronAPI.getCaisseStats({
        caisse_id: selectedCaisseId,
        datePreset,
        startDate: datePreset === 'custom' ? startDate : '',
        endDate: datePreset === 'custom' ? endDate : ''
      });
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const loadTransactions = async (page = currentPage) => {
    if (!window.electronAPI?.getCaisseTransactions) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getCaisseTransactions({
        caisse_id: selectedCaisseId,
        type: typeFilter,
        category_id: categoryFilter,
        datePreset,
        startDate: datePreset === 'custom' ? startDate : '',
        endDate: datePreset === 'custom' ? endDate : '',
        search: searchQuery,
        page,
        limit: pageSize
      });

      if (res.success) {
        setTransactions(res.transactions || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || 1);
      } else {
        setErrorMsg(res.message || 'Erreur lors du chargement des transactions');
      }
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      setErrorMsg(err.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (targetPage?: number) => {
    if (!window.electronAPI?.getCaisseSessions) return;
    const p = targetPage !== undefined ? targetPage : sessionsPage;
    try {
      const res = await window.electronAPI.getCaisseSessions({
        caisse_id: selectedCaisseId !== 'all' ? selectedCaisseId : undefined,
        user_name: sessionsFilterUser !== 'all' ? sessionsFilterUser : undefined,
        status: sessionsFilterStatus,
        hasDiscrepancy: sessionsFilterDiscrepancy,
        datePreset: sessionsFilterDatePreset !== 'all' ? sessionsFilterDatePreset : undefined,
        startDate: sessionsFilterDatePreset === 'custom' && sessionsStartDate ? sessionsStartDate : undefined,
        endDate: sessionsFilterDatePreset === 'custom' && sessionsEndDate ? sessionsEndDate : undefined,
        search: sessionsSearch ? sessionsSearch.trim() : undefined,
        page: p,
        limit: sessionsLimit
      });
      if (res?.success) {
        if (res.sessions) setSessions(res.sessions);
        if (res.stats) setSessionStats(res.stats);
        if (res.pagination) {
          setSessionsTotalPages(res.pagination.totalPages || 1);
          setSessionsTotalCount(res.pagination.totalCount || 0);
          setSessionsPage(res.pagination.currentPage || 1);
        }
      }
    } catch (err: any) {
      console.error('Error loading sessions:', err);
    }
  };

  const handleOpenSessionModal = (session: any) => {
    setSelectedSessionModal(session);
  };

  // Initial mount
  useEffect(() => {
    loadCaisses();
    loadCategories();
  }, []);

  // Reload data when filters or caisse selection changes
  useEffect(() => {
    loadStats();
    if (activeSubTab === 'transactions') {
      loadTransactions(1);
    } else if (activeSubTab === 'sessions') {
      loadSessions(1);
    }
  }, [
    selectedCaisseId,
    typeFilter,
    categoryFilter,
    datePreset,
    startDate,
    endDate,
    pageSize,
    activeSubTab,
    sessionsFilterUser,
    sessionsFilterStatus,
    sessionsFilterDiscrepancy,
    sessionsFilterDatePreset,
    sessionsStartDate,
    sessionsEndDate,
    sessionsSearch,
    sessionsLimit
  ]);

  // Real-time live synchronization (app:refresh & tab activation)
  useEffect(() => {
    const handleGlobalRefresh = () => {
      loadCaisses();
      loadStats();
      loadCategories();
      if (activeSubTab === 'transactions') loadTransactions(currentPage);
      if (activeSubTab === 'sessions') loadSessions();
    };
    const handleTabActivated = (e: any) => {
      if (e?.detail === 'caisses') {
        handleGlobalRefresh();
      }
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    window.addEventListener('app:tabActivated', handleTabActivated);
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
      window.removeEventListener('app:tabActivated', handleTabActivated);
    };
  }, [activeSubTab, currentPage]);

  // Format currency
  const formatMoney = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DA';
  };

  // ==========================================
  // HANDLERS: TRANSACTIONS & TRANSFERS
  // ==========================================

  const handleOpenNewTransaction = (defaultCaisseId?: number) => {
    const cId = defaultCaisseId 
      ? String(defaultCaisseId) 
      : selectedCaisseId !== 'all' 
      ? selectedCaisseId 
      : caisses.length > 0 ? String(caisses[0].id) : '';

    setTransactionForm({
      caisse_id: cId,
      type: 'in',
      amount: '',
      category_id: '',
      description: '',
      reference: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      payment_method: 'especes'
    });
    setShowTransactionModal(true);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI?.createCaisseTransaction) return;

    if (!transactionForm.caisse_id) {
      setErrorMsg('Veuillez sélectionner une caisse.');
      return;
    }
    const amt = parseFloat(transactionForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (!transactionForm.description.trim()) {
      setErrorMsg('Veuillez saisir le motif ou description de l’opération.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.createCaisseTransaction({
        caisse_id: Number(transactionForm.caisse_id),
        type: transactionForm.type,
        amount: amt,
        category_id: transactionForm.category_id ? Number(transactionForm.category_id) : null,
        description: transactionForm.description.trim(),
        reference: transactionForm.reference.trim(),
        payment_method: transactionForm.payment_method,
        user_name: currentUser?.full_name || currentUser?.username || 'Caissier'
      });

      if (res.success) {
        setSuccessMsg(`Transaction enregistrée avec succès ! Nouveau solde: ${formatMoney(res.newBalance)}`);
        setShowTransactionModal(false);
        await Promise.all([loadCaisses(), loadStats(), loadTransactions(1)]);
      } else {
        setErrorMsg(res.message || 'Impossible d’enregistrer la transaction');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTransfer = (fromCaisseId?: number) => {
    const fromId = fromCaisseId ? String(fromCaisseId) : (caisses[0]?.id ? String(caisses[0].id) : '');
    const toId = caisses.find(c => String(c.id) !== fromId)?.id ? String(caisses.find(c => String(c.id) !== fromId)?.id) : '';

    setTransferForm({
      from_caisse_id: fromId,
      to_caisse_id: toId,
      amount: '',
      description: 'Transfert de liquidités',
      reference: 'TRF-' + Math.floor(1000 + Math.random() * 9000)
    });
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI?.transferCaisse) return;

    if (!transferForm.from_caisse_id || !transferForm.to_caisse_id) {
      setErrorMsg('Veuillez sélectionner la caisse source et la caisse destinataire.');
      return;
    }
    if (transferForm.from_caisse_id === transferForm.to_caisse_id) {
      setErrorMsg('La caisse source et de destination doivent être différentes.');
      return;
    }
    const amt = parseFloat(transferForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Veuillez entrer un montant de transfert supérieur à zéro.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.transferCaisse({
        from_caisse_id: Number(transferForm.from_caisse_id),
        to_caisse_id: Number(transferForm.to_caisse_id),
        amount: amt,
        description: transferForm.description,
        reference: transferForm.reference,
        user_name: currentUser?.full_name || currentUser?.username || 'Responsable'
      });

      if (res.success) {
        setSuccessMsg(`Transfert de ${formatMoney(amt)} exécuté avec succès entre les deux caisses.`);
        setShowTransferModal(false);
        await Promise.all([loadCaisses(), loadStats(), loadTransactions(1)]);
      } else {
        setErrorMsg(res.message || 'Échec du transfert inter-caisse');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur technique lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (tx: any) => {
    if (!window.electronAPI?.deleteCaisseTransaction) return;
    const confirm = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la transaction #${tx.id} (${formatMoney(tx.amount)} - ${tx.description}) ?\nLe solde de la caisse sera automatiquement recalculé.`
    );
    if (!confirm) return;

    try {
      const res = await window.electronAPI.deleteCaisseTransaction(tx.id);
      if (res.success) {
        setSuccessMsg(`Transaction #${tx.id} supprimée et solde de caisse rétabli.`);
        await Promise.all([loadCaisses(), loadStats(), loadTransactions(currentPage)]);
      } else {
        setErrorMsg(res.message || 'Impossible de supprimer cette transaction');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression');
    }
  };

  // ==========================================
  // HANDLERS: SESSIONS (OPEN / CLOSE CAISSE)
  // ==========================================

  const handleOpenCaisseModal = (caisse: any) => {
    setOpenForm({
      caisse_id: caisse.id,
      caisse_name: caisse.name,
      opening_balance: 0,
      current_balance: Number(caisse.current_balance) || 0,
      notes: ''
    });
    setShowOpenModal(true);
  };

  const handleStartAllCaisses = async () => {
    const closedList = caisses.filter(c => c.status !== 'open');
    if (closedList.length === 0) {
      setSuccessMsg('Toutes les caisses sont déjà ouvertes !');
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment démarrer et ouvrir toutes les caisses (${closedList.length} caisse(s) fermée(s)) ?`)) {
      return;
    }

    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }

      if (window.electronAPI?.startAllCaisses) {
        const res = await window.electronAPI.startAllCaisses({
          user_id: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.username || 'Administrateur',
          notes: 'Ouverture groupée de toutes les caisses'
        });
        if (res?.success) {
          setSuccessMsg(`Succès : ${res.count || closedList.length} caisse(s) ont été démarrées et ouvertes avec succès !`);
          await Promise.all([loadCaisses(), loadStats(), loadSessions()]);
          window.dispatchEvent(new CustomEvent('app:refresh'));
        } else {
          setErrorMsg(res?.message || 'Erreur lors du démarrage groupé des caisses.');
        }
      } else {
        // Fallback: loop through each closed caisse
        for (const c of closedList) {
          await window.electronAPI?.openCaisseSession?.({
            caisse_id: c.id,
            user_id: currentUser?.id,
            user_name: currentUser?.full_name || currentUser?.username || 'Administrateur',
            opening_balance: Number(c.current_balance) || 0,
            notes: 'Démarrage groupé'
          });
        }
        setSuccessMsg(`Toutes les caisses ont été ouvertes avec succès !`);
        await Promise.all([loadCaisses(), loadStats(), loadSessions()]);
        window.dispatchEvent(new CustomEvent('app:refresh'));
      }
    } catch (err: any) {
      console.error('Error starting all caisses:', err);
      setErrorMsg(err.message || 'Erreur lors de l’ouverture de toutes les caisses.');
    }
  };

  const handleConfirmOpenCaisse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI?.openCaisseSession) return;

    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }
      const res = await window.electronAPI.openCaisseSession({
        caisse_id: openForm.caisse_id,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name || currentUser?.username || 'Caissier',
        opening_balance: Number(openForm.opening_balance) || 0,
        notes: openForm.notes
      });

      if (res.success) {
        setSuccessMsg(`Caisse "${openForm.caisse_name}" ouverte avec succès !`);
        setShowOpenModal(false);
        await Promise.all([loadCaisses(), loadStats()]);
        window.dispatchEvent(new CustomEvent('app:refresh'));
      } else {
        setErrorMsg(res.message || 'Impossible d’ouvrir la caisse');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    }
  };

  const handleOpenCloseModal = (caisse: any) => {
    const act = caisse.active_session;
    const openBal = act?.opening_balance ? Number(act.opening_balance) : 0;
    const sessIn = act?.session_in ? Number(act.session_in) : (caisse.today_in || 0);
    const sessOut = act?.session_out ? Number(act.session_out) : (caisse.today_out || 0);
    const drawerExp = act?.drawer_expected !== undefined ? Number(act.drawer_expected) : (openBal + sessIn - sessOut);

    setCloseForm({
      caisse_id: caisse.id,
      session_id: act?.id || 0,
      caisse_name: caisse.name,
      opening_balance: openBal,
      session_in: sessIn,
      session_out: sessOut,
      expected_balance: drawerExp,
      current_balance: Number(caisse.current_balance) || 0,
      actual_counted: String(drawerExp),
      notes: ''
    });
    setShowCloseModal(true);
  };

  const handleConfirmCloseCaisse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI?.closeCaisseSession) return;

    const counted = parseFloat(closeForm.actual_counted);
    if (isNaN(counted)) {
      setErrorMsg('Veuillez saisir le montant réel compté en caisse.');
      return;
    }

    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }
      const res = await window.electronAPI.closeCaisseSession({
        caisse_id: closeForm.caisse_id,
        session_id: closeForm.session_id,
        closing_balance_actual: counted,
        actual_balance: counted,
        notes: closeForm.notes,
        user_name: currentUser?.full_name || currentUser?.username || 'Caissier'
      });

      if (res.success) {
        const diff = (res as any).discrepancy !== undefined ? (res as any).discrepancy : ((res as any).difference || 0);
        const diffText = diff === 0 
          ? 'Caisse équilibrée sans écart (0 DA).' 
          : diff > 0 
          ? `Excédent de caisse de +${formatMoney(diff)}` 
          : `Déficit de caisse de ${formatMoney(diff)}`;

        setSuccessMsg(`Caisse "${closeForm.caisse_name}" clôturée avec succès. ${diffText}`);
        setShowCloseModal(false);
        await Promise.all([loadCaisses(), loadStats(), loadSessions()]);
        window.dispatchEvent(new CustomEvent('app:refresh'));
      } else {
        setErrorMsg(res.message || 'Impossible de clôturer la caisse');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la clôture');
    }
  };

  // ==========================================
  // HANDLERS: MANAGE CAISSES (CREATE / EDIT / DELETE)
  // ==========================================

  const handleOpenAddCaisse = () => {
    setCaisseEditMode(false);
    setCaisseForm({
      id: 0,
      name: '',
      code: 'CAISSE-0' + (caisses.length + 1),
      notes: ''
    });
    setShowCaisseModal(true);
  };

  const handleOpenEditCaisse = (caisse: any) => {
    setCaisseEditMode(true);
    setCaisseForm({
      id: caisse.id,
      name: caisse.name,
      code: caisse.code,
      notes: caisse.notes || ''
    });
    setShowCaisseModal(true);
  };

  const handleSaveCaisse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caisseForm.name.trim() || !caisseForm.code.trim()) {
      setErrorMsg('Le nom et le code de la caisse sont obligatoires.');
      return;
    }

    try {
      if (caisseEditMode) {
        const res = await window.electronAPI?.updateCaisse({
          id: caisseForm.id,
          name: caisseForm.name.trim(),
          code: caisseForm.code.trim(),
          notes: caisseForm.notes.trim()
        });
        if (res?.success) {
          setSuccessMsg('Caisse mise à jour avec succès.');
          setShowCaisseModal(false);
          loadCaisses();
        } else {
          setErrorMsg(res?.message || 'Erreur de modification');
        }
      } else {
        const res = await window.electronAPI?.createCaisse({
          name: caisseForm.name.trim(),
          code: caisseForm.code.trim(),
          notes: caisseForm.notes.trim(),
          initial_balance: 0
        });
        if (res?.success) {
          setSuccessMsg('Nouvelle caisse ajoutée avec succès.');
          setShowCaisseModal(false);
          loadCaisses();
        } else {
          setErrorMsg(res?.message || 'Erreur de création');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    }
  };

  const handleDeleteCaisse = async (caisse: any) => {
    if (!window.electronAPI?.deleteCaisse) return;
    if (caisse.current_balance !== 0) {
      setErrorMsg(`Impossible de supprimer la caisse "${caisse.name}" car son solde actuel n'est pas nul (${formatMoney(caisse.current_balance)}). Transférez les fonds d'abord.`);
      return;
    }

    const confirm = window.confirm(`Supprimer définitivement la caisse "${caisse.name}" (${caisse.code}) ?`);
    if (!confirm) return;

    try {
      const res = await window.electronAPI.deleteCaisse(caisse.id);
      if (res.success) {
        setSuccessMsg('Caisse supprimée avec succès.');
        if (selectedCaisseId === String(caisse.id)) setSelectedCaisseId('all');
        loadCaisses();
      } else {
        setErrorMsg(res.message || 'Suppression impossible');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    }
  };

  // ==========================================
  // HANDLERS: CATEGORIES (EDITABLE EXCEPT DEFINED SYSTEM ONES)
  // ==========================================

  const handleOpenAddCategory = () => {
    setCategoryEditMode(false);
    setCategoryForm({
      id: 0,
      name: '',
      type: 'both',
      color: '#16a34a',
      icon: 'tag',
      description: '',
      is_system: 0
    });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setCategoryEditMode(true);
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      color: cat.color || '#16a34a',
      icon: cat.icon || 'tag',
      description: cat.description || '',
      is_system: cat.is_system || 0
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setErrorMsg('Le libellé de la catégorie est obligatoire.');
      return;
    }

    try {
      if (categoryEditMode) {
        const res = await window.electronAPI?.updateCaisseCategory({
          id: categoryForm.id,
          name: categoryForm.name.trim(),
          type: categoryForm.type,
          color: categoryForm.color,
          icon: categoryForm.icon,
          description: categoryForm.description.trim()
        });
        if (res?.success) {
          setSuccessMsg('Catégorie mise à jour avec succès.');
          setShowCategoryModal(false);
          loadCategories();
        } else {
          setErrorMsg(res?.message || 'Erreur');
        }
      } else {
        const res = await window.electronAPI?.createCaisseCategory({
          name: categoryForm.name.trim(),
          type: categoryForm.type,
          color: categoryForm.color,
          icon: categoryForm.icon,
          description: categoryForm.description.trim()
        });
        if (res?.success) {
          setSuccessMsg('Nouvelle catégorie créée avec succès.');
          setShowCategoryModal(false);
          loadCategories();
        } else {
          setErrorMsg(res?.message || 'Erreur');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!window.electronAPI?.deleteCaisseCategory) return;
    if (cat.is_system === 1) {
      setErrorMsg(`La catégorie "${cat.name}" est une catégorie système essentielle (Achat, Vente, Salaire...) et ne peut pas être supprimée.`);
      return;
    }

    const confirm = window.confirm(`Supprimer la catégorie personnalisée "${cat.name}" ? Les transactions existantes seront conservées sans catégorie.`);
    if (!confirm) return;

    try {
      const res = await window.electronAPI.deleteCaisseCategory(cat.id);
      if (res.success) {
        setSuccessMsg('Catégorie supprimée avec succès.');
        loadCategories();
      } else {
        setErrorMsg(res.message || 'Impossible de supprimer cette catégorie');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    }
  };

  // Filter categories for transaction form based on chosen type
  const availableCategoriesForTx = useMemo(() => {
    return categories.filter(c => c.type === 'both' || c.type === transactionForm.type);
  }, [categories, transactionForm.type]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', direction: currentLang === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* Top Banner Alert / Notifications */}
      {successMsg && (
        <div style={{ 
          background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', 
          padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', 
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 
        }}>
          <CheckCircle size={18} color="#16a34a" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ 
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', 
          padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', 
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 
        }}>
          <AlertTriangle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={22} color="#16a34a" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t.caissesHeading}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {t.caissesSubheading}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button"
            onClick={() => handleOpenNewTransaction()}
            className="btn-green"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700 }}
          >
            <Plus size={16} />
            {t.newTransaction}
          </button>

          {canTransfer && (
            <button 
              type="button"
              onClick={() => handleOpenTransfer()}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700 }}
            >
              <ArrowRightLeft size={16} color="#0284c7" />
              {t.transfer}
            </button>
          )}

          {canManageCaisses && (
            <>
              <button 
                type="button"
                onClick={handleStartAllCaisses}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: '1px solid #86efac',
                  background: '#f0fdf4',
                  color: '#15803d',
                  cursor: 'pointer'
                }}
                title="Démarrer et ouvrir toutes les caisses fermées en un clic"
              >
                <Unlock size={15} color="#15803d" /> Démarrer Toutes les Caisses
              </button>

              <button 
                type="button"
                onClick={handleOpenAddCaisse}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', fontSize: '13px' }}
                title="Ajouter une nouvelle caisse"
              >
                <Plus size={15} /> Nouvelle Caisse
              </button>
            </>
          )}

          <button 
            type="button"
            onClick={async () => {
              if (window.electronAPI?.flushCache) await window.electronAPI.flushCache();
              await Promise.all([loadCaisses(), loadStats(), loadCategories()]);
              if (activeSubTab === 'transactions') loadTransactions();
              if (activeSubTab === 'sessions') loadSessions();
              window.dispatchEvent(new CustomEvent('app:refresh'));
            }}
            className="btn-secondary"
            style={{ padding: '9px 12px' }}
            title="Rafraîchir"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* SQL Aggregate KPI Statistic Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        
        {/* Card 1: Trésorerie Totale */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
              {selectedCaisseId === 'all' ? t.totalCaissesBalance : t.caisseBalance}
            </span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={15} color="#16a34a" />
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {formatMoney(stats.totalSolde)}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} />
            <span>{stats.activeCaissesCount} / {stats.totalCaissesCount} {t.activeCaisses}</span>
          </div>
        </div>

        {/* Card 2: Total Entrées */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.totalInflows}</span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#16a34a" />
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
            +{formatMoney(stats.totalEntrees)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Aujourd'hui: <strong style={{ color: '#16a34a' }}>+{formatMoney(stats.todayIn)}</strong> ({stats.entreesCount} ops)
          </div>
        </div>

        {/* Card 3: Total Sorties */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.totalOutflows}</span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={15} color="#dc2626" />
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>
            -{formatMoney(stats.totalSorties)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Aujourd'hui: <strong style={{ color: '#dc2626' }}>-{formatMoney(stats.todayOut)}</strong> ({stats.sortiesCount} ops)
          </div>
        </div>

        {/* Card 4: Flux Net Période */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.netCashFlow}</span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: stats.netCashFlow >= 0 ? '#e0f2fe' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={15} color={stats.netCashFlow >= 0 ? '#0284c7' : '#dc2626'} />
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: stats.netCashFlow >= 0 ? '#0284c7' : '#dc2626' }}>
            {stats.netCashFlow >= 0 ? '+' : ''}{formatMoney(stats.netCashFlow)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Net du jour: <strong style={{ color: stats.todayNet >= 0 ? '#16a34a' : '#dc2626' }}>{stats.todayNet >= 0 ? '+' : ''}{formatMoney(stats.todayNet)}</strong>
          </div>
        </div>

      </div>

      {/* Caisse Selector Pills (All Caisses vs Specific Caisse) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
          <Filter size={14} color="#16a34a" /> {t.allCaisses}:
        </span>

        <button
          type="button"
          onClick={() => setSelectedCaisseId('all')}
          style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: 'none', transition: 'all 0.15s',
            background: selectedCaisseId === 'all' ? '#16a34a' : '#f1f5f9',
            color: selectedCaisseId === 'all' ? '#ffffff' : '#334155'
          }}
        >
          {t.allCaisses}
        </button>

        {caisses.map(c => {
          const isSelected = selectedCaisseId === String(c.id);
          const isOpen = c.status === 'open';
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCaisseId(String(c.id))}
              style={{
                padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                background: isSelected ? '#16a34a' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#334155',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                background: isOpen ? (isSelected ? '#bbf7d0' : '#16a34a') : (isSelected ? '#fecaca' : '#94a3b8') 
              }} />
              <span>{c.name}</span>
              <span style={{ 
                fontSize: '11px', padding: '2px 6px', borderRadius: '10px',
                background: isSelected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: isSelected ? '#ffffff' : '#475569'
              }}>
                {formatMoney(c.current_balance)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('caisses')}
          style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'caisses' ? '3px solid #16a34a' : '3px solid transparent',
            color: activeSubTab === 'caisses' ? '#16a34a' : '#64748b',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Landmark size={16} />
          {t.tabCaissesList} ({caisses.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('transactions')}
          style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'transactions' ? '3px solid #16a34a' : '3px solid transparent',
            color: activeSubTab === 'transactions' ? '#16a34a' : '#64748b',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <FileText size={16} />
          {t.tabTransactions} {totalCount > 0 && `(${totalCount})`}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'categories' ? '3px solid #16a34a' : '3px solid transparent',
            color: activeSubTab === 'categories' ? '#16a34a' : '#64748b',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Layers size={16} />
          {t.tabCategories} ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sessions')}
          style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'sessions' ? '3px solid #16a34a' : '3px solid transparent',
            color: activeSubTab === 'sessions' ? '#16a34a' : '#64748b',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Clock size={16} />
          {t.tabSessions}
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: CAISSES & TIROIRS GRID                         */}
      {/* ========================================================= */}
      {activeSubTab === 'caisses' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {caisses.map(c => {
              const isOpen = c.status === 'open';
              return (
                <div 
                  key={c.id} 
                  style={{ 
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', 
                    padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', display: 'flex', 
                    flexDirection: 'column', justifyContent: 'space-between' 
                  }}
                >
                  <div>
                    {/* Header: Name, Code & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {c.name}
                          </h3>
                          {c.is_default === 1 && (
                            <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              Principale
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {c.code}
                        </span>
                      </div>

                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                        borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: isOpen ? '#dcfce7' : '#f1f5f9',
                        color: isOpen ? '#15803d' : '#64748b'
                      }}>
                        {isOpen ? <Unlock size={12} color="#15803d" /> : <Lock size={12} color="#64748b" />}
                        {isOpen ? 'Ouverte' : 'Fermée'}
                      </span>
                    </div>

                    {/* Solde En Caisse */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        {t.caisseBalance}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: c.current_balance >= 0 ? '#0f172a' : '#dc2626' }}>
                        {formatMoney(c.current_balance)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        Dernière ouverture: {c.last_opened_at ? new Date(c.last_opened_at).toLocaleDateString() : 'Jamais'}
                      </div>
                    </div>

                    {c.notes && (
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', fontStyle: 'italic' }}>
                        "{c.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCloseModal(c)}
                          style={{
                            padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5',
                            background: '#fef2f2', color: '#991b1b', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <Lock size={13} /> {t.closeCaisse}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCaisseModal(c)}
                          style={{
                            padding: '8px 12px', borderRadius: '8px', border: '1px solid #86efac',
                            background: '#f0fdf4', color: '#166534', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <Unlock size={13} /> {t.openCaisse}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenNewTransaction(c.id)}
                        className="btn-green"
                        style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Plus size={13} /> {t.newTransaction}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCaisseId(String(c.id));
                          setActiveSubTab('transactions');
                        }}
                        style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> Journal des flux &rarr;
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenTransfer(c.id)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px' }}
                          title="Transférer vers une autre caisse"
                        >
                          <ArrowRightLeft size={14} />
                        </button>

                        {currentUser?.role === 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCaisse(c)}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                              title="Modifier la caisse"
                            >
                              <Edit size={14} />
                            </button>

                            {c.is_default !== 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCaisse(c)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                                title="Supprimer la caisse"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: JOURNAL DES TRANSACTIONS (PAGINATED & FILTERED)*/}
      {/* ========================================================= */}
      {activeSubTab === 'transactions' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          
          {/* Filters Toolbar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            
            {/* Search */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Recherche
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Réf, motif, caissier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadTransactions(1); }}
                  style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Type d'opération
              </label>
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <option value="all">Tous les types</option>
                <option value="in">Entrées uniquement (+)</option>
                <option value="out">Sorties uniquement (-)</option>
                <option value="transfer">Transferts inter-caisse (⇄)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                {t.transactionCategory}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <option value="all">Toutes les catégories</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name} {c.is_system ? '🔒' : ''}</option>
                ))}
              </select>
            </div>

            {/* Date Preset */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Période
              </label>
              <select
                value={datePreset}
                onChange={(e: any) => setDatePreset(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <option value="all">Historique complet</option>
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="this_week">Cette semaine</option>
                <option value="this_month">Ce mois-ci</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>

            {/* Per Page */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                {t.perPage}
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <option value={10}>10 par page</option>
                <option value={15}>15 par page</option>
                <option value={25}>25 par page</option>
                <option value={50}>50 par page</option>
                <option value={100}>100 par page</option>
              </select>
            </div>

          </div>

          {/* Custom Date Inputs if 'custom' */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Du:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Au:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
              />
              <button 
                type="button" 
                onClick={() => loadTransactions(1)} 
                className="btn-green"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Filtrer
              </button>
            </div>
          )}

          {/* Transactions Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 12px' }}>Date & Heure</th>
                  <th style={{ padding: '10px 12px' }}>Caisse</th>
                  <th style={{ padding: '10px 12px' }}>Type</th>
                  <th style={{ padding: '10px 12px' }}>Catégorie</th>
                  <th style={{ padding: '10px 12px' }}>Description / Réf</th>
                  <th style={{ padding: '10px 12px' }}>Caissier</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Montant</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Solde Après</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Chargement des transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Aucune transaction trouvée pour ces critères de filtrage.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const isIn = tx.type === 'in' || tx.type === 'transfer_in';

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Date */}
                        <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {tx.date}
                        </td>

                        {/* Caisse */}
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                          <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                            {tx.caisse_name}
                          </span>
                        </td>

                        {/* Type Badge */}
                        <td style={{ padding: '10px 12px' }}>
                          {tx.type === 'in' && (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ArrowDownLeft size={11} /> Entrée
                            </span>
                          )}
                          {tx.type === 'out' && (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ArrowUpRight size={11} /> Sortie
                            </span>
                          )}
                          {tx.type === 'transfer_out' && (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ArrowRightLeft size={11} /> Vers {tx.dest_caisse_name || 'Autre'}
                            </span>
                          )}
                          {tx.type === 'transfer_in' && (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ArrowRightLeft size={11} /> De {tx.dest_caisse_name || 'Autre'}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td style={{ padding: '10px 12px' }}>
                          {tx.category_name ? (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                              background: (tx.cat_color || '#16a34a') + '15',
                              color: tx.cat_color || '#16a34a'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.cat_color || '#16a34a' }} />
                              {tx.category_name}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                          )}
                        </td>

                        {/* Description & Reference */}
                        <td style={{ padding: '10px 12px', maxWidth: '280px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {tx.description}
                          </div>
                          {tx.reference && (
                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                              Réf: {tx.reference}
                            </div>
                          )}
                        </td>

                        {/* User */}
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11px' }}>
                          {tx.user_name || 'Système'}
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: isIn ? '#16a34a' : '#dc2626' }}>
                          {isIn ? '+' : '-'}{formatMoney(tx.amount)}
                        </td>

                        {/* Balance After */}
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                          {formatMoney(tx.balance_after)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              title="Supprimer la transaction (recalcule le solde)"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Backend Pagination Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Affichage de {transactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} à {Math.min(currentPage * pageSize, totalCount)} sur <strong>{totalCount}</strong> transactions
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => loadTransactions(1)}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', opacity: currentPage <= 1 ? 0.4 : 1 }}
                title="Première page"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => loadTransactions(currentPage - 1)}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', opacity: currentPage <= 1 ? 0.4 : 1 }}
                title="Page précédente"
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{ fontSize: '12px', fontWeight: 700, padding: '0 8px', color: '#0f172a' }}>
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => loadTransactions(currentPage + 1)}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                title="Page suivante"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => loadTransactions(totalPages)}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                title="Dernière page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: CATÉGORIES (EDITABLE EXCEPT DEFINED SYSTEM ONES)*/}
      {/* ========================================================= */}
      {activeSubTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Catégories de Flux de Caisse
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Les catégories système définies (Achats, Ventes, Salaires, Avances...) sont protégées pour préserver l'intégrité comptable. Les autres sont 100% modifiables.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="btn-green"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
            >
              <Plus size={14} /> Nouvelle Catégorie
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {categories.map(cat => {
              const isSys = cat.is_system === 1;
              return (
                <div 
                  key={cat.id} 
                  style={{ 
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', 
                    padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', 
                    flexDirection: 'column', justifyContent: 'space-between' 
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color || '#16a34a' }} />
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {cat.name}
                        </h4>
                      </div>

                      {isSys ? (
                        <span style={{ 
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', 
                          background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' 
                        }}>
                          <Lock size={10} /> Système (Fixe)
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', 
                          background: '#dcfce7', color: '#15803d' 
                        }}>
                          Personnalisée
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ 
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                        background: cat.type === 'in' ? '#dcfce7' : cat.type === 'out' ? '#fee2e2' : '#e0f2fe',
                        color: cat.type === 'in' ? '#15803d' : cat.type === 'out' ? '#b91c1c' : '#0369a1'
                      }}>
                        {cat.type === 'in' ? 'Entrée (+)' : cat.type === 'out' ? 'Sortie (-)' : 'Entrée & Sortie (Les deux)'}
                      </span>
                    </div>

                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      {cat.description || 'Aucune description.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', borderTop: '1px solid #f8fafc', paddingTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(cat)}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit size={12} /> Modifier
                    </button>

                    {!isSys && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: SESSIONS & CLÔTURES DE CAISSE (ARCHIVE ENRICHI) */}
      {/* ========================================================= */}
      {activeSubTab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & KPI Summary */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Archives et Historique Détaillé des Sessions de Caisse
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Traçabilité des ouvertures obligatoires, mouvements pendant chaque session, comptages physiques et écarts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadSessions(1)}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
              >
                <RefreshCw size={13} />
                <span>Actualiser</span>
              </button>
            </div>

            {/* KPI Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Sessions</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  {sessionStats?.total_sessions || sessions.length}
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Sessions Actives</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>
                  {sessionStats?.open_sessions || sessions.filter(s => s.status === 'open').length}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Sessions Clôturées</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#334155' }}>
                  {sessionStats?.closed_sessions || sessions.filter(s => s.status === 'closed').length}
                </div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>Sessions avec Écart</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626' }}>
                  {sessionStats?.sessions_with_discrepancy || sessions.filter(s => s.status === 'closed' && (s.difference || 0) !== 0).length}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {/* Filter Caisse */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Caisse :
                </label>
                <select
                  className="input-clean"
                  value={selectedCaisseId}
                  onChange={e => setSelectedCaisseId(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">Toutes les caisses</option>
                  {caisses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter User */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Opérateur / Caissier :
                </label>
                <select
                  className="input-clean"
                  value={sessionsFilterUser}
                  onChange={e => setSessionsFilterUser(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">Tous les opérateurs</option>
                  {Array.from(new Set(sessions.map(s => s.user_name).filter(Boolean))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Statut :
                </label>
                <select
                  className="input-clean"
                  value={sessionsFilterStatus}
                  onChange={e => setSessionsFilterStatus(e.target.value as any)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">Toutes (En cours & Clôturées)</option>
                  <option value="open">🟢 En cours uniquement</option>
                  <option value="closed">⚪ Clôturées uniquement</option>
                </select>
              </div>

              {/* Filter Discrepancy */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Écart de Clôture :
                </label>
                <select
                  className="input-clean"
                  value={sessionsFilterDiscrepancy}
                  onChange={e => setSessionsFilterDiscrepancy(e.target.value as any)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">Tous les écarts</option>
                  <option value="exact">✅ Sans écart (0.00 DA)</option>
                  <option value="discrepancy">⚠️ Avec écart (Déficit / Excédent)</option>
                </select>
              </div>

              {/* Date Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Période :
                </label>
                <select
                  className="input-clean"
                  value={sessionsFilterDatePreset}
                  onChange={e => setSessionsFilterDatePreset(e.target.value as any)}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">Toute la période</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="yesterday">Hier</option>
                  <option value="this_week">Cette semaine</option>
                  <option value="this_month">Ce mois-ci</option>
                  <option value="last_month">Mois dernier</option>
                  <option value="custom">Plage personnalisée</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range & Keyword Search */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {sessionsFilterDatePreset === 'custom' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Du:</span>
                    <input
                      type="date"
                      className="input-clean"
                      value={sessionsStartDate}
                      onChange={e => setSessionsStartDate(e.target.value)}
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Au:</span>
                    <input
                      type="date"
                      className="input-clean"
                      value={sessionsEndDate}
                      onChange={e => setSessionsEndDate(e.target.value)}
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    />
                  </div>
                </>
              )}

              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="input-clean"
                  value={sessionsSearch}
                  onChange={e => setSessionsSearch(e.target.value)}
                  placeholder="Rechercher par caissier, note ou caisse..."
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                />
              </div>

              {/* Per Page Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Afficher :</span>
                <select
                  className="input-clean"
                  value={sessionsLimit}
                  onChange={e => setSessionsLimit(Number(e.target.value))}
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              {(sessionsFilterUser !== 'all' || sessionsFilterStatus !== 'all' || sessionsFilterDiscrepancy !== 'all' || sessionsFilterDatePreset !== 'all' || sessionsSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionsFilterUser('all');
                    setSessionsFilterStatus('all');
                    setSessionsFilterDiscrepancy('all');
                    setSessionsFilterDatePreset('all');
                    setSessionsStartDate('');
                    setSessionsEndDate('');
                    setSessionsSearch('');
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Sessions Archive Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 12px' }}>Caisse</th>
                    <th style={{ padding: '10px 12px' }}>Opérateur</th>
                    <th style={{ padding: '10px 12px' }}>Ouverture</th>
                    <th style={{ padding: '10px 12px' }}>Clôture & Durée</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Fond Initial</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Entrées (+)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sorties (-)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Attendu</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Compté Réel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Écart</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Statut</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                        Aucune session de caisse correspondant aux critères.
                      </td>
                    </tr>
                  ) : (
                    sessions.map(s => {
                      const isOpen = s.status === 'open';
                      const diff = s.difference !== undefined && s.difference !== null ? Number(s.difference) : 0;
                      const totalIn = Number(s.total_in || s.session_in || 0);
                      const totalOut = Number(s.total_out || s.session_out || 0);

                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                            {s.caisse_name}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>
                            {s.user_name || s.user_full_name || 'Inconnu'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            <div>{s.opened_at ? new Date(s.opened_at).toLocaleDateString('fr-FR') : '-'}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.opened_at ? new Date(s.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {isOpen ? (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>En activité</span>
                            ) : (
                              <>
                                <div>{s.closed_at ? new Date(s.closed_at).toLocaleDateString('fr-FR') : '-'} {s.closed_at ? new Date(s.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                {s.duration && <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>⏱️ {s.duration}</div>}
                              </>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatMoney(s.opening_balance)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                            +{formatMoney(totalIn)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            -{formatMoney(totalOut)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                            {s.closing_balance_expected !== null && s.closing_balance_expected !== undefined ? formatMoney(s.closing_balance_expected) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {s.closing_balance_actual !== null && s.closing_balance_actual !== undefined ? formatMoney(s.closing_balance_actual) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>
                            {isOpen ? (
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>En cours</span>
                            ) : diff === 0 ? (
                              <span style={{ color: '#16a34a' }}>0.00 DA</span>
                            ) : diff > 0 ? (
                              <span style={{ color: '#0284c7' }}>+{formatMoney(diff)}</span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>{formatMoney(diff)}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: isOpen ? '#dcfce7' : '#f1f5f9',
                              color: isOpen ? '#15803d' : '#64748b'
                            }}>
                              {isOpen ? '🟢 En cours' : 'Clôturée'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenSessionModal(s)}
                              className="btn-secondary"
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '6px'
                              }}
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {sessionsTotalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Page <strong>{sessionsPage}</strong> sur <strong>{sessionsTotalPages}</strong> ({sessionsTotalCount} sessions au total)
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={sessionsPage <= 1}
                    onClick={() => loadSessions(sessionsPage - 1)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: sessionsPage <= 1 ? '#f1f5f9' : '#ffffff',
                      color: sessionsPage <= 1 ? '#94a3b8' : '#334155',
                      cursor: sessionsPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    &larr; Précédent
                  </button>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}>
                    {sessionsPage} / {sessionsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={sessionsPage >= sessionsTotalPages}
                    onClick={() => loadSessions(sessionsPage + 1)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: sessionsPage >= sessionsTotalPages ? '#f1f5f9' : '#ffffff',
                      color: sessionsPage >= sessionsTotalPages ? '#94a3b8' : '#334155',
                      cursor: sessionsPage >= sessionsTotalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Suivant &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: NOUVELLE TRANSACTION (ENTRÉE / SORTIE)          */}
      {/* ========================================================= */}
      {showTransactionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {t.newTransaction}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTransactionModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'in' })}
                  style={{
                    padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: transactionForm.type === 'in' ? '#16a34a' : '#f1f5f9',
                    color: transactionForm.type === 'in' ? '#ffffff' : '#64748b'
                  }}
                >
                  <ArrowDownLeft size={16} /> Entrée de Caisse (+)
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionForm({ ...transactionForm, type: 'out' })}
                  style={{
                    padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: transactionForm.type === 'out' ? '#dc2626' : '#f1f5f9',
                    color: transactionForm.type === 'out' ? '#ffffff' : '#64748b'
                  }}
                >
                  <ArrowUpRight size={16} /> Sortie de Caisse (-)
                </button>
              </div>

              {/* Caisse Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Caisse concernée *
                </label>
                <select
                  value={transactionForm.caisse_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, caisse_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                >
                  <option value="">Sélectionner une caisse...</option>
                  {caisses.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({formatMoney(c.current_balance)} disponibles)
                    </option>
                  ))}
                </select>
              </div>

              {/* Montant & Catégorie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Montant (DA) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    required
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Catégorie
                  </label>
                  <select
                    value={transactionForm.category_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  >
                    <option value="">Sans catégorie</option>
                    {availableCategoriesForTx.map(c => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} {c.is_system ? '🔒' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Motif */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Description / Motif *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Règlement facture fournisseur, vente au détail..."
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              {/* Réf & Mode de paiement */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Référence (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Réf ticket, bon, pièce..."
                    value={transactionForm.reference}
                    onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Mode de paiement
                  </label>
                  <select
                    value={transactionForm.payment_method}
                    onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  >
                    <option value="especes">Espèces</option>
                    <option value="cheque">Chèque</option>
                    <option value="virement">Virement bancaire</option>
                    <option value="carte">Carte bancaire</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 16px' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-green"
                  style={{ padding: '9px 18px', fontWeight: 700 }}
                >
                  {loading ? 'Enregistrement...' : 'Valider la Transaction'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TRANSFERT INTER-CAISSE                           */}
      {/* ========================================================= */}
      {showTransferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRightLeft size={18} color="#0284c7" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {t.transfer}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTransferModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer}>
              {/* From Caisse */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.sourceCaisse} *
                </label>
                <select
                  value={transferForm.from_caisse_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_caisse_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                >
                  <option value="">Sélectionner la source...</option>
                  {caisses.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({formatMoney(c.current_balance)} dispo)
                    </option>
                  ))}
                </select>
              </div>

              {/* To Caisse */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.destinationCaisse} *
                </label>
                <select
                  value={transferForm.to_caisse_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_caisse_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                >
                  <option value="">Sélectionner la destination...</option>
                  {caisses.filter(c => String(c.id) !== transferForm.from_caisse_id).map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({formatMoney(c.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Montant */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Montant à transférer (DA) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Motif du transfert
                </label>
                <input
                  type="text"
                  placeholder="Alimentation caisse comptoir, versement coffre..."
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 16px' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-green"
                  style={{ padding: '9px 18px', fontWeight: 700, background: '#0284c7' }}
                >
                  {loading ? 'Transfert en cours...' : 'Exécuter le Transfert'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: OUVRIR CAISSE (FOND INITIAL)                     */}
      {/* ========================================================= */}
      {showOpenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Unlock size={18} color="#16a34a" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Ouvrir la caisse : {openForm.caisse_name}
                </h3>
              </div>
              <button type="button" onClick={() => setShowOpenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleConfirmOpenCaisse}>
              {/* Caisse Total Balance */}
              <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>💰 Solde Actuel de la Caisse</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>{formatMoney(openForm.current_balance)}</div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Fond de caisse initial (DA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openForm.opening_balance}
                  onChange={(e) => setOpenForm({ ...openForm, opening_balance: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Montant en espèces physiquement présent dans le tiroir-caisse.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Remarques / Notes
                </label>
                <input
                  type="text"
                  placeholder="Ouverture matinale, fond habituel..."
                  value={openForm.notes}
                  onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowOpenModal(false)} className="btn-secondary" style={{ padding: '9px 16px' }}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-green" style={{ padding: '9px 18px', fontWeight: 700 }}>
                  Confirmer l'ouverture
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CLÔTURER CAISSE (COMPTAGE & CALCUL ÉCART)       */}
      {/* ========================================================= */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '92vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#dc2626" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Clôturer : {closeForm.caisse_name}
                </h3>
              </div>
              <button type="button" onClick={() => setShowCloseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleConfirmCloseCaisse}>
              {/* Caisse Total Balance */}
              <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>💰 Solde Total de la Caisse</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>{formatMoney(closeForm.current_balance)}</div>
              </div>

              {/* Session Breakdown */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Détail de la session</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Fond d'ouverture :</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{formatMoney(closeForm.opening_balance)}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Encaissements session :</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>+{formatMoney(closeForm.session_in)}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Décaissements session :</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>-{formatMoney(closeForm.session_out)}</div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Attendu en tiroir :</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(closeForm.expected_balance)}</div>
                </div>
              </div>

              {/* Saisie Compté Réel */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  {t.actualCounted} — Montant compté dans le tiroir (DA) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closeForm.actual_counted}
                  onChange={(e) => setCloseForm({ ...closeForm, actual_counted: e.target.value })}
                  required
                  autoFocus
                  style={{ width: '100%', padding: '10px 14px', fontSize: '18px', fontWeight: 700, border: '2px solid #3b82f6', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  💡 Modifiez ce chiffre si le compte physique diffère — l'écart sera ajusté automatiquement.
                </div>
              </div>

              {/* Visualisation Écart Instantané */}
              {closeForm.actual_counted !== '' && !isNaN(parseFloat(closeForm.actual_counted)) && (
                <div style={{ 
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                  background: parseFloat(closeForm.actual_counted) === closeForm.expected_balance ? '#f0fdf4' : '#fffbeb',
                  border: '1px solid ' + (parseFloat(closeForm.actual_counted) === closeForm.expected_balance ? '#86efac' : '#fcd34d')
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{t.cashDifference} calculé :</div>
                  <div style={{ 
                    fontSize: '16px', fontWeight: 800, 
                    color: (parseFloat(closeForm.actual_counted) - closeForm.expected_balance) === 0 ? '#16a34a' : (parseFloat(closeForm.actual_counted) - closeForm.expected_balance) > 0 ? '#0284c7' : '#dc2626'
                  }}>
                    {parseFloat(closeForm.actual_counted) - closeForm.expected_balance === 0 
                      ? '✅ Aucun écart (Caisse parfaite)' 
                      : (parseFloat(closeForm.actual_counted) - closeForm.expected_balance > 0 ? '+' : '') + formatMoney(parseFloat(closeForm.actual_counted) - closeForm.expected_balance)}
                  </div>
                  {parseFloat(closeForm.actual_counted) !== closeForm.expected_balance && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Nouveau solde caisse après clôture : <strong>{formatMoney(closeForm.current_balance + (parseFloat(closeForm.actual_counted) - closeForm.expected_balance))}</strong>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Notes de clôture
                </label>
                <input
                  type="text"
                  placeholder="Justification éventuelle en cas d'écart..."
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCloseModal(false)} className="btn-secondary" style={{ padding: '9px 16px' }}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-danger" style={{ padding: '9px 18px', fontWeight: 700 }}>
                  Confirmer et Clôturer la Caisse
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CRÉER / MODIFIER CAISSE                          */}
      {/* ========================================================= */}
      {showCaisseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {caisseEditMode ? 'Modifier la caisse' : 'Ajouter une nouvelle caisse'}
              </h3>
              <button type="button" onClick={() => setShowCaisseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSaveCaisse}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Nom de la caisse *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Caisse Comptoir 3, Caisse Réserve..."
                  value={caisseForm.name}
                  onChange={(e) => setCaisseForm({ ...caisseForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Code identifiant unique *
                </label>
                <input
                  type="text"
                  placeholder="Ex: CAISSE-04"
                  value={caisseForm.code}
                  onChange={(e) => setCaisseForm({ ...caisseForm, code: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px', textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="Emplacement, responsable habituel..."
                  value={caisseForm.notes}
                  onChange={(e) => setCaisseForm({ ...caisseForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCaisseModal(false)} className="btn-secondary" style={{ padding: '9px 16px' }}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-green" style={{ padding: '9px 18px', fontWeight: 700 }}>
                  Enregistrer
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: CRÉER / MODIFIER CATÉGORIE                       */}
      {/* ========================================================= */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {categoryEditMode ? 'Modifier la catégorie' : 'Nouvelle catégorie de flux'}
              </h3>
              <button type="button" onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Libellé de la catégorie * {categoryForm.is_system === 1 && '(Nom système protégé)'}
                </label>
                <input
                  type="text"
                  placeholder="Ex: Frais postaux, Nettoyage..."
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  disabled={categoryForm.is_system === 1}
                  required
                  style={{ 
                    width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px',
                    background: categoryForm.is_system === 1 ? '#f1f5f9' : '#ffffff' 
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Type de flux
                  </label>
                  <select
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  >
                    <option value="both">Entrée & Sortie</option>
                    <option value="in">Entrée (+)</option>
                    <option value="out">Sortie (-)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Couleur
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      style={{ width: '38px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Description explicative
                </label>
                <input
                  type="text"
                  placeholder="Description détaillée de l'usage..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary" style={{ padding: '9px 16px' }}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-green" style={{ padding: '9px 18px', fontWeight: 700 }}>
                  Enregistrer
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DÉTAILS COMPLETS DE LA SESSION (MODAL FLOTTANT)  */}
      {/* ========================================================= */}
      {selectedSessionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '18px 22px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Détails de Session #{selectedSessionModal.id}
                </h3>
                <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: '#94a3b8' }}>
                  {selectedSessionModal.caisse_name} ({selectedSessionModal.caisse_code || 'Caisse'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionModal(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#cbd5e1'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {/* Operator info card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Ouvert par :</span>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedSessionModal.user_name || selectedSessionModal.opening_user_full_name || 'Inconnu'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      📅 {selectedSessionModal.opened_at ? new Date(selectedSessionModal.opened_at).toLocaleString('fr-FR') : '-'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Clôturé par :</span>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedSessionModal.status === 'open' 
                        ? '🟢 En cours' 
                        : (selectedSessionModal.closed_by_user_name || selectedSessionModal.closing_user_full_name || selectedSessionModal.user_name || 'Inconnu')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {selectedSessionModal.status === 'open' 
                        ? 'Session active' 
                        : `📅 ${selectedSessionModal.closed_at ? new Date(selectedSessionModal.closed_at).toLocaleString('fr-FR') : '-'}`}
                    </div>
                  </div>
                </div>

                {selectedSessionModal.duration && selectedSessionModal.duration !== '-' && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>
                    ⏱️ Durée totale de la session : {selectedSessionModal.duration}
                  </div>
                )}
              </div>

              {/* Financial Breakdown Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Fond initial (Départ)</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {formatMoney(selectedSessionModal.opening_balance)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#16a34a' }}>+ Total Entrées (Ventes / Flux)</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                    +{formatMoney(selectedSessionModal.total_in || selectedSessionModal.session_in || 0)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#dc2626' }}>- Total Sorties (Dépenses / Retraits)</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>
                    -{formatMoney(selectedSessionModal.total_out || selectedSessionModal.session_out || 0)}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af' }}>Solde Théorique Attendu</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>
                    {selectedSessionModal.closing_balance_expected !== null && selectedSessionModal.closing_balance_expected !== undefined 
                      ? formatMoney(selectedSessionModal.closing_balance_expected) 
                      : formatMoney((Number(selectedSessionModal.opening_balance) || 0) + (Number(selectedSessionModal.total_in || selectedSessionModal.session_in) || 0) - (Number(selectedSessionModal.total_out || selectedSessionModal.session_out) || 0))}
                  </div>
                </div>
              </div>

              {/* Counting & Difference Banner */}
              {selectedSessionModal.status !== 'open' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: Number(selectedSessionModal.difference || 0) === 0 ? '#f0fdf4' : Number(selectedSessionModal.difference || 0) > 0 ? '#f0f9ff' : '#fef2f2',
                  border: Number(selectedSessionModal.difference || 0) === 0 ? '1px solid #bbf7d0' : Number(selectedSessionModal.difference || 0) > 0 ? '1px solid #bae6fd' : '1px solid #fecaca',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Montant Réel Compté à la Clôture :</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                      {formatMoney(selectedSessionModal.closing_balance_actual)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Écart de caisse :</div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      color: Number(selectedSessionModal.difference || 0) === 0 ? '#15803d' : Number(selectedSessionModal.difference || 0) > 0 ? '#0369a1' : '#b91c1c'
                    }}>
                      {Number(selectedSessionModal.difference || 0) === 0 ? '0.00 DA (Parfait)' : (Number(selectedSessionModal.difference || 0) > 0 ? `+${formatMoney(selectedSessionModal.difference)} (Excédent)` : `${formatMoney(selectedSessionModal.difference)} (Déficit)`)}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSessionModal.notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Notes de session :</div>
                  <div style={{ fontSize: '12px', color: '#0f172a', fontStyle: 'italic' }}>
                    "{selectedSessionModal.notes}"
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setSelectedSessionModal(null)}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 700 }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
