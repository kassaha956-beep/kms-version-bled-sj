import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, Plus, Search, Edit2, Trash2, History, CreditCard,
  ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertTriangle,
  X, RefreshCw, Printer, Phone, Mail, MapPin,
  Building2, Calendar
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { hasPermission } from '../permissions';

export interface Fournisseur {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  ice: string;
  notes: string;
  initial_credit: number;
  current_credit: number;
  status: 'active' | 'inactive';
  created_at?: string;
  total_operations?: number;
  last_activity?: string;
}

export interface CreditOperation {
  id: number;
  fournisseur_id: number;
  fournisseur_name?: string;
  fournisseur_phone?: string;
  fournisseur_city?: string;
  type: 'achat_credit' | 'paiement' | 'avoir';
  amount: number;
  payment_method?: 'especes' | 'cheque' | 'virement' | 'traite' | 'autre';
  reference?: string;
  notes?: string;
  date: string;
  balance_after?: number;
  created_at?: string;
}

interface FournisseursPageProps {
  currentLang: Language;
  currentUser: any;
}

// Default initial demo data in case of browser/fallback mode
const INITIAL_DEMO_FOURNISSEURS: Fournisseur[] = [];
const INITIAL_DEMO_CREDITS: CreditOperation[] = [];

export default function FournisseursPage({ currentLang, currentUser }: FournisseursPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;
  const canEdit = hasPermission(currentUser, 'fournisseurs.edit');
  const canPay = hasPermission(currentUser, 'fournisseurs.pay');
  const canAddCredit = hasPermission(currentUser, 'fournisseurs.add_credit');
  const canDelete = hasPermission(currentUser, 'fournisseurs.delete');
  const isAdmin = currentUser?.role === 'admin' || canEdit;

  // Sub-view: list of providers vs global credit ledger
  const [activeView, setActiveView] = useState<'list' | 'ledger'>('list');

  // Main state
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [allCredits, setAllCredits] = useState<CreditOperation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debt' | 'zero' | 'inactive'>('all');
  const [ledgerProviderFilter, setLedgerProviderFilter] = useState<number | 'all'>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');

  // Notification alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [deletingFournisseur, setDeletingFournisseur] = useState<Fournisseur | null>(null);

  // Single provider history modal
  const [selectedFournisseurForHistory, setSelectedFournisseurForHistory] = useState<Fournisseur | null>(null);
  const [singleProviderCredits, setSingleProviderCredits] = useState<CreditOperation[]>([]);

  // Add credit operation modal
  const [showCreditModal, setShowCreditModal] = useState<boolean>(false);

  // Form states
  const [fournisseurForm, setFournisseurForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ice: '',
    notes: '',
    initial_credit: 0,
    status: 'active' as 'active' | 'inactive'
  });

  const [operationForm, setOperationForm] = useState({
    fournisseur_id: 0,
    type: 'paiement' as 'achat_credit' | 'paiement' | 'avoir',
    amount: '',
    payment_method: 'especes' as 'especes' | 'cheque' | 'virement' | 'traite' | 'autre',
    reference: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10)
  });

  // Auto-dismiss alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load data from Electron SQLite or Fallback
  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getFournisseurs) {
        const res = await window.electronAPI.getFournisseurs();
        if (res.success && Array.isArray(res.fournisseurs)) {
          setFournisseurs(res.fournisseurs);
        }

        const credRes = await window.electronAPI.getFournisseurCredits();
        if (credRes.success && Array.isArray(credRes.credits)) {
          setAllCredits(credRes.credits);
        }
      } else {
        // Fallback to localStorage or Demo data
        const localF = localStorage.getItem('app_fournisseurs');
        const localC = localStorage.getItem('app_fournisseur_credits');
        if (localF) {
          setFournisseurs(JSON.parse(localF));
        } else {
          setFournisseurs(INITIAL_DEMO_FOURNISSEURS);
          localStorage.setItem('app_fournisseurs', JSON.stringify(INITIAL_DEMO_FOURNISSEURS));
        }

        if (localC) {
          setAllCredits(JSON.parse(localC));
        } else {
          setAllCredits(INITIAL_DEMO_CREDITS);
          localStorage.setItem('app_fournisseur_credits', JSON.stringify(INITIAL_DEMO_CREDITS));
        }
      }
    } catch (err: any) {
      console.error('Error loading fournisseurs data:', err);
      setAlert({ type: 'error', message: err.message || 'Erreur de chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update single provider credits when selectedFournisseurForHistory changes
  useEffect(() => {
    if (selectedFournisseurForHistory) {
      const providerCredits = allCredits.filter(c => c.fournisseur_id === selectedFournisseurForHistory.id);
      setSingleProviderCredits(providerCredits);
    }
  }, [selectedFournisseurForHistory, allCredits]);

  // KPIs
  const kpiData = useMemo(() => {
    const totalCount = fournisseurs.length;
    const totalDebt = fournisseurs.reduce((sum, f) => sum + (Number(f.current_credit) || 0), 0);
    const withDebtCount = fournisseurs.filter(f => Number(f.current_credit) > 0).length;
    const totalPaid = allCredits
      .filter(c => c.type === 'paiement')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    return { totalCount, totalDebt, withDebtCount, totalPaid };
  }, [fournisseurs, allCredits]);

  // Filtered providers
  const filteredFournisseurs = useMemo(() => {
    return fournisseurs.filter(f => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        f.name.toLowerCase().includes(q) ||
        (f.contact_person && f.contact_person.toLowerCase().includes(q)) ||
        (f.phone && f.phone.includes(q)) ||
        (f.ice && f.ice.toLowerCase().includes(q)) ||
        (f.city && f.city.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Status filter
      if (statusFilter === 'debt') return Number(f.current_credit) > 0;
      if (statusFilter === 'zero') return Number(f.current_credit) <= 0;
      if (statusFilter === 'inactive') return f.status === 'inactive';
      return true;
    });
  }, [fournisseurs, searchQuery, statusFilter]);

  // Filtered credits for global ledger
  const filteredCredits = useMemo(() => {
    return allCredits.filter(c => {
      if (ledgerProviderFilter !== 'all' && c.fournisseur_id !== ledgerProviderFilter) {
        return false;
      }
      if (ledgerTypeFilter !== 'all' && c.type !== ledgerTypeFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchRef = c.reference && c.reference.toLowerCase().includes(q);
        const matchNotes = c.notes && c.notes.toLowerCase().includes(q);
        const matchName = c.fournisseur_name && c.fournisseur_name.toLowerCase().includes(q);
        if (!matchRef && !matchNotes && !matchName) return false;
      }
      return true;
    });
  }, [allCredits, ledgerProviderFilter, ledgerTypeFilter, searchQuery]);

  // Format currency
  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' DA';
  };

  // Helper: Open Edit Modal
  const handleOpenEdit = (f: Fournisseur) => {
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }
    setEditingFournisseur(f);
    setFournisseurForm({
      name: f.name,
      contact_person: f.contact_person || '',
      phone: f.phone || '',
      email: f.email || '',
      address: f.address || '',
      city: f.city || '',
      ice: f.ice || '',
      notes: f.notes || '',
      initial_credit: f.initial_credit || 0,
      status: f.status || 'active'
    });
  };

  // Helper: Open Add Modal
  const handleOpenAdd = () => {
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }
    setEditingFournisseur(null);
    setFournisseurForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      ice: '',
      notes: '',
      initial_credit: 0,
      status: 'active'
    });
    setShowAddModal(true);
  };

  // Save Fournisseur (Add or Edit)
  const handleSaveFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    if (!fournisseurForm.name.trim()) {
      setAlert({ type: 'error', message: 'Veuillez saisir le nom du fournisseur.' });
      return;
    }

    try {
      if (editingFournisseur) {
        // Update
        if (window.electronAPI?.updateFournisseur) {
          const res = await window.electronAPI.updateFournisseur({
            id: editingFournisseur.id,
            ...fournisseurForm
          });
          if (!res.success) throw new Error(res.message);
        } else {
          // LocalStorage fallback
          const updated = fournisseurs.map(f => f.id === editingFournisseur.id ? { ...f, ...fournisseurForm } : f);
          setFournisseurs(updated);
          localStorage.setItem('app_fournisseurs', JSON.stringify(updated));
        }
        setAlert({ type: 'success', message: t.providerUpdatedSuccess });
        setEditingFournisseur(null);
      } else {
        // Create
        if (window.electronAPI?.createFournisseur) {
          const res = await window.electronAPI.createFournisseur(fournisseurForm);
          if (!res.success) throw new Error(res.message);
        } else {
          // LocalStorage fallback
          const newId = Date.now();
          const newF: Fournisseur = {
            id: newId,
            ...fournisseurForm,
            current_credit: Number(fournisseurForm.initial_credit) || 0,
            created_at: new Date().toISOString().slice(0, 10),
            total_operations: fournisseurForm.initial_credit > 0 ? 1 : 0
          };
          const updated = [newF, ...fournisseurs];
          setFournisseurs(updated);
          localStorage.setItem('app_fournisseurs', JSON.stringify(updated));

          if (Number(fournisseurForm.initial_credit) > 0) {
            const initialOp: CreditOperation = {
              id: Date.now() + 1,
              fournisseur_id: newId,
              fournisseur_name: newF.name,
              type: 'achat_credit',
              amount: Number(fournisseurForm.initial_credit),
              reference: 'SOLDE-INITIAL',
              notes: 'Solde initial au démarrage',
              date: new Date().toISOString().slice(0, 10),
              balance_after: Number(fournisseurForm.initial_credit)
            };
            const updatedCredits = [initialOp, ...allCredits];
            setAllCredits(updatedCredits);
            localStorage.setItem('app_fournisseur_credits', JSON.stringify(updatedCredits));
          }
        }
        setAlert({ type: 'success', message: t.providerCreatedSuccess });
        setShowAddModal(false);
      }

      await loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
    }
  };

  // Delete Fournisseur
  const handleDeleteFournisseur = async () => {
    if (!canDelete || !deletingFournisseur) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    try {
      if (window.electronAPI?.deleteFournisseur) {
        const res = await window.electronAPI.deleteFournisseur(deletingFournisseur.id);
        if (!res.success) throw new Error(res.message);
      } else {
        // LocalStorage fallback
        const updated = fournisseurs.filter(f => f.id !== deletingFournisseur.id);
        const updatedCredits = allCredits.filter(c => c.fournisseur_id !== deletingFournisseur.id);
        setFournisseurs(updated);
        setAllCredits(updatedCredits);
        localStorage.setItem('app_fournisseurs', JSON.stringify(updated));
        localStorage.setItem('app_fournisseur_credits', JSON.stringify(updatedCredits));
      }

      setAlert({ type: 'success', message: t.providerDeletedSuccess });
      setDeletingFournisseur(null);
      if (selectedFournisseurForHistory?.id === deletingFournisseur.id) {
        setSelectedFournisseurForHistory(null);
      }
      await loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    }
  };

  // Open Add Credit Operation Modal
  const handleOpenCreditModal = (fournisseur?: Fournisseur, defaultType: 'achat_credit' | 'paiement' | 'avoir' = 'paiement') => {
    const targetF = fournisseur || fournisseurs[0];
    setOperationForm({
      fournisseur_id: targetF ? targetF.id : 0,
      type: defaultType,
      amount: '',
      payment_method: 'especes',
      reference: defaultType === 'paiement' ? 'REG-' + Math.floor(1000 + Math.random() * 9000) : 'FAC-' + Math.floor(1000 + Math.random() * 9000),
      notes: '',
      date: new Date().toISOString().slice(0, 10)
    });
    setShowCreditModal(true);
  };

  // Save Credit Operation (Payment, Credit purchase, or Credit note)
  const handleSaveCreditOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(operationForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAlert({ type: 'error', message: 'Veuillez saisir un montant valide supérieur à 0.' });
      return;
    }

    if (!operationForm.fournisseur_id) {
      setAlert({ type: 'error', message: 'Veuillez sélectionner un fournisseur.' });
      return;
    }

    try {
      if (window.electronAPI?.addFournisseurCredit) {
        const res = await window.electronAPI.addFournisseurCredit({
          ...operationForm,
          amount: numAmount
        });
        if (!res.success) throw new Error(res.message);
      } else {
        // LocalStorage fallback
        const targetF = fournisseurs.find(f => f.id === operationForm.fournisseur_id);
        if (!targetF) throw new Error('Fournisseur introuvable');

        let newBalance = Number(targetF.current_credit) || 0;
        if (operationForm.type === 'achat_credit') newBalance += numAmount;
        else newBalance -= numAmount;

        const newOp: CreditOperation = {
          id: Date.now(),
          fournisseur_id: targetF.id,
          fournisseur_name: targetF.name,
          type: operationForm.type,
          amount: numAmount,
          payment_method: operationForm.type === 'paiement' ? operationForm.payment_method : undefined,
          reference: operationForm.reference,
          notes: operationForm.notes,
          date: operationForm.date,
          balance_after: newBalance
        };

        const updatedCredits = [newOp, ...allCredits];
        const updatedF = fournisseurs.map(f => f.id === targetF.id ? { ...f, current_credit: newBalance } : f);

        setAllCredits(updatedCredits);
        setFournisseurs(updatedF);
        localStorage.setItem('app_fournisseur_credits', JSON.stringify(updatedCredits));
        localStorage.setItem('app_fournisseurs', JSON.stringify(updatedF));
      }

      setAlert({ type: 'success', message: t.operationSavedSuccess });
      setShowCreditModal(false);
      await loadData();

      // Refresh single provider history if open
      if (selectedFournisseurForHistory && selectedFournisseurForHistory.id === operationForm.fournisseur_id) {
        const updatedTarget = fournisseurs.find(f => f.id === selectedFournisseurForHistory.id);
        if (updatedTarget) setSelectedFournisseurForHistory(updatedTarget);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement de l\'opération' });
    }
  };

  // Delete individual credit operation
  const handleDeleteCreditOperation = async (opId: number) => {
    if (!canDelete) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    if (!window.confirm(t.deleteOperationConfirm)) return;

    try {
      if (window.electronAPI?.deleteFournisseurCredit) {
        const res = await window.electronAPI.deleteFournisseurCredit(opId);
        if (!res.success) throw new Error(res.message);
      } else {
        // Fallback
        const op = allCredits.find(c => c.id === opId);
        if (op) {
          const updatedCredits = allCredits.filter(c => c.id !== opId);
          // Recalculate provider balance
          const targetF = fournisseurs.find(f => f.id === op.fournisseur_id);
          if (targetF) {
            let balance = Number(targetF.initial_credit) || 0;
            const remaining = updatedCredits.filter(c => c.fournisseur_id === targetF.id);
            for (const r of remaining) {
              if (r.type === 'achat_credit') balance += Number(r.amount);
              else balance -= Number(r.amount);
            }
            const updatedF = fournisseurs.map(f => f.id === targetF.id ? { ...f, current_credit: balance } : f);
            setFournisseurs(updatedF);
            localStorage.setItem('app_fournisseurs', JSON.stringify(updatedF));
          }
          setAllCredits(updatedCredits);
          localStorage.setItem('app_fournisseur_credits', JSON.stringify(updatedCredits));
        }
      }

      setAlert({ type: 'success', message: 'Opération supprimée avec succès' });
      await loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
    }
  };

  // Print statement
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Top Notification Toast */}
      {alert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          background: alert.type === 'success' ? '#15803d' : '#b91c1c',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header & Title Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <Truck size={18} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t.providersHeading}
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            {t.providersSubheading}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadData}
            className="btn-secondary"
            title="Rafraîchir"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t.refresh}
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreditModal(undefined, 'paiement')}
            className="btn-secondary"
            style={{ borderColor: '#86efac', background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CreditCard size={15} /> {t.recordPayment}
          </button>


        {/*
          <button
            type="button"
            onClick={() => handleOpenCreditModal(undefined, 'achat_credit')}
            className="btn-secondary"
            style={{ borderColor: '#fed7aa', background: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> {t.newPurchaseCredit}
          </button>
          */}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-green"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> {t.addProviderBtn}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* KPI 1: Total Providers */}
        <div className="clean-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {t.totalProviders}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Building2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            {kpiData.totalCount}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
            {fournisseurs.filter(f => f.status === 'active').length} actifs
          </div>
        </div>

        {/* KPI 2: Total Debts / Current Credit Balance */}
        <div className="clean-card" style={{ padding: '18px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase' }}>
              {t.totalDebts}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c' }}>
            {formatCurrency(kpiData.totalDebt)}
          </div>
          <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
            Dettes cumulées envers fournisseurs
          </div>
        </div>

        {/* KPI 3: Total Paid */}
        <div className="clean-card" style={{ padding: '18px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>
              {t.totalPaid}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
            {formatCurrency(kpiData.totalPaid)}
          </div>
          <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
            Règlements & acomptes effectués
          </div>
        </div>

        {/* KPI 4: Suppliers with Debt */}
        <div className="clean-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase' }}>
              {t.providersWithDebt}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
              <History size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309' }}>
            {kpiData.withDebtCount} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>/ {kpiData.totalCount}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
            Comptes à solder
          </div>
        </div>
      </div>

      {/* Main Container: Sub-tabs & Search/Filter Bar */}
      <div className="clean-card" style={{ overflow: 'hidden' }}>
        {/* View Switcher Tabs & Controls Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff'
        }}>
          {/* Sub-view switcher */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setActiveView('list')}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: activeView === 'list' ? '#ffffff' : 'transparent',
                color: activeView === 'list' ? '#15803d' : '#64748b',
                boxShadow: activeView === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Building2 size={15} />
              {t.tabProvidersList} ({filteredFournisseurs.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: activeView === 'ledger' ? '#ffffff' : 'transparent',
                color: activeView === 'ledger' ? '#15803d' : '#64748b',
                boxShadow: activeView === 'ledger' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <History size={15} />
              {t.tabGlobalCreditHistory} ({allCredits.length})
            </button>
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t.searchProviderPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-clean"
                style={{ paddingLeft: '32px', fontSize: '12px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeView === 'list' ? (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="input-clean"
                style={{ width: 'auto', fontSize: '12px', padding: '7px 12px' }}
              >
                <option value="all">{t.filterAllProviders}</option>
                <option value="debt">{t.filterDebtOnly}</option>
                <option value="zero">{t.filterZeroDebt}</option>
                <option value="inactive">Inactifs</option>
              </select>
            ) : (
              <>
                <select
                  value={ledgerProviderFilter}
                  onChange={e => setLedgerProviderFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="input-clean"
                  style={{ width: 'auto', fontSize: '12px', padding: '7px 12px' }}
                >
                  <option value="all">Tous les Fournisseurs</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                <select
                  value={ledgerTypeFilter}
                  onChange={e => setLedgerTypeFilter(e.target.value)}
                  className="input-clean"
                  style={{ width: 'auto', fontSize: '12px', padding: '7px 12px' }}
                >
                  <option value="all">Tous types d'opérations</option>
                  <option value="achat_credit">Achat à Crédit (Factures)</option>
                  <option value="paiement">Paiements / Règlements</option>
                  <option value="avoir">Avoirs / Retours</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* View 1: Providers Directory Table */}
        {activeView === 'list' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>{t.providerName}</th>
                  <th style={{ width: '22%' }}>Contact & Coordonnées</th>
                  <th style={{ width: '10%' }}>Statut</th>
                  <th style={{ width: '18%', textAlign: 'right' }}>{t.currentCredit}</th>
                  <th style={{ width: '22%', textAlign: 'center' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFournisseurs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                      <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#475569' }}>{t.noProvidersFound}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Modifiez vos filtres ou ajoutez un nouveau fournisseur.</div>
                    </td>
                  </tr>
                ) : (
                  filteredFournisseurs.map(f => {
                    const debt = Number(f.current_credit) || 0;
                    return (
                      <tr key={f.id}>
                        {/* Name, ICE, City */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '8px',
                              background: debt > 0 ? '#fee2e2' : '#f0fdf4',
                              color: debt > 0 ? '#dc2626' : '#16a34a',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '14px', flexShrink: 0
                            }}>
                              {f.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                                {f.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                                {f.ice && (
                                  <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    ICE: {f.ice}
                                  </span>
                                )}
                                {f.city && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <MapPin size={11} /> {f.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact details */}
                        <td>
                          <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                            {f.contact_person || '—'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                            {f.phone && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} color="#16a34a" /> {f.phone}
                              </span>
                            )}
                            {f.email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={11} /> {f.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge-clean ${f.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                            {f.status === 'active' ? t.statusActive : t.statusInactive}
                          </span>
                        </td>

                        {/* Solde Crédit / Dette */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: debt > 0 ? '#b91c1c' : '#15803d'
                          }}>
                            {formatCurrency(debt)}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {debt > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 600 }}>À régler</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>Compte soldé</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {/* Historique de Crédit Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedFournisseurForHistory(f)}
                              className="btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                background: '#f8fafc',
                                borderColor: '#cbd5e1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Consulter l'historique de crédit"
                            >
                              <History size={13} color="#15803d" />
                              <span>{t.creditHistory}</span>
                            </button>

                            {/* Quick Operation Button */}
                            {(canPay || canAddCredit) && (
                              <button
                                type="button"
                                onClick={() => handleOpenCreditModal(f, debt > 0 ? 'paiement' : 'achat_credit')}
                                className="btn-secondary"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  background: '#f0fdf4',
                                  borderColor: '#86efac',
                                  color: '#15803d'
                                }}
                                title="Enregistrer un paiement ou crédit"
                              >
                                <Plus size={13} /> Opération
                              </button>
                            )}

                            {/* Actions: Edit & Delete */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(f)}
                                className="btn-secondary"
                                style={{ padding: '5px 7px' }}
                                title={t.editProviderBtn}
                              >
                                <Edit2 size={13} color="#475569" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingFournisseur(f)}
                                className="btn-danger"
                                style={{ padding: '5px 7px' }}
                                title={t.deleteProviderBtn}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: Global Credit Ledger (Historique Global) */}
        {activeView === 'ledger' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Date</th>
                  <th style={{ width: '22%' }}>Fournisseur</th>
                  <th style={{ width: '15%' }}>{t.operationType}</th>
                  <th style={{ width: '12%' }}>Mode</th>
                  <th style={{ width: '14%' }}>Réf / Pièce</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Montant</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Solde Après</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                      <History size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#475569' }}>{t.noOperations}</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Aucune écriture de crédit ne correspond aux filtres.</div>
                    </td>
                  </tr>
                ) : (
                  filteredCredits.map(op => {
                    const isCredit = op.type === 'achat_credit';
                    const isPaiement = op.type === 'paiement';
                    return (
                      <tr key={op.id}>
                        {/* Date */}
                        <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} color="#94a3b8" />
                            {op.date}
                          </span>
                        </td>

                        {/* Fournisseur */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                            {op.fournisseur_name || `Fournisseur #${op.fournisseur_id}`}
                          </div>
                          {op.notes && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                              {op.notes}
                            </div>
                          )}
                        </td>

                        {/* Type d'opération */}
                        <td>
                          {isCredit && (
                            <span className="badge-clean badge-amber">
                              <ArrowDownLeft size={11} /> {t.typePurchaseCredit}
                            </span>
                          )}
                          {isPaiement && (
                            <span className="badge-clean badge-green">
                              <ArrowUpRight size={11} /> {t.typePayment}
                            </span>
                          )}
                          {op.type === 'avoir' && (
                            <span className="badge-clean badge-blue">
                              {t.typeCreditNote}
                            </span>
                          )}
                        </td>

                        {/* Mode de règlement */}
                        <td>
                          {op.payment_method ? (
                            <span style={{ fontSize: '11px', color: '#475569', textTransform: 'capitalize' }}>
                              {op.payment_method === 'especes' ? t.methodCash :
                                op.payment_method === 'cheque' ? t.methodCheque :
                                  op.payment_method === 'virement' ? t.methodTransfer :
                                    op.payment_method === 'traite' ? t.methodPromissoryNote : t.methodOther}
                            </span>
                          ) : '—'}
                        </td>

                        {/* Référence */}
                        <td>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {op.reference || '—'}
                          </span>
                        </td>

                        {/* Montant */}
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: isCredit ? '#b91c1c' : '#15803d' }}>
                          {isCredit ? '+' : '-'}{formatCurrency(op.amount)}
                        </td>

                        {/* Solde Après */}
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                          {op.balance_after !== undefined ? formatCurrency(op.balance_after) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: HISTORIQUE DE CRÉDIT & RELEVÉ DÉTAILLÉ DU FOURNISSEUR */}
      {/* ========================================================= */}
      {selectedFournisseurForHistory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {t.statementTitle}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedFournisseurForHistory.name} • {selectedFournisseurForHistory.city || 'Maroc'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  <Printer size={14} /> {t.printStatement}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFournisseurForHistory(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Supplier summary cards + Statement Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Profile Card & Balances */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* Info Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Coordonnées Fournisseur</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {selectedFournisseurForHistory.contact_person || selectedFournisseurForHistory.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    Tel: {selectedFournisseurForHistory.phone || 'Non renseigné'}
                  </div>
                  {selectedFournisseurForHistory.ice && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      ICE: {selectedFournisseurForHistory.ice}
                    </div>
                  )}
                </div>

                {/* Total Achats */}
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Total Achats à Crédit</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#9a3412', marginTop: '4px' }}>
                    {formatCurrency(
                      singleProviderCredits
                        .filter(c => c.type === 'achat_credit')
                        .reduce((sum, c) => sum + Number(c.amount), Number(selectedFournisseurForHistory.initial_credit) || 0)
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ea580c', marginTop: '2px' }}>
                    Factures enregistrées
                  </div>
                </div>

                {/* Total Règlements */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Total Règlements</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {formatCurrency(
                      singleProviderCredits
                        .filter(c => c.type === 'paiement' || c.type === 'avoir')
                        .reduce((sum, c) => sum + Number(c.amount), 0)
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                    Paiements & Avoirs
                  </div>
                </div>

                {/* Solde Dû Actuel */}
                <div style={{
                  background: Number(selectedFournisseurForHistory.current_credit) > 0 ? '#fef2f2' : '#f0fdf4',
                  border: Number(selectedFournisseurForHistory.current_credit) > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: Number(selectedFournisseurForHistory.current_credit) > 0 ? '#b91c1c' : '#15803d', textTransform: 'uppercase' }}>
                    Solde Dû Actuel
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: Number(selectedFournisseurForHistory.current_credit) > 0 ? '#b91c1c' : '#15803d', marginTop: '4px' }}>
                    {formatCurrency(selectedFournisseurForHistory.current_credit)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {Number(selectedFournisseurForHistory.current_credit) > 0 ? 'Dette à régler' : 'Compte à zéro (Soldé)'}
                  </div>
                </div>
              </div>

              {/* Action Toolbar above table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Historique Chronologique des Opérations ({singleProviderCredits.length})
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenCreditModal(selectedFournisseurForHistory, 'paiement')}
                    className="btn-green"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <Plus size={14} /> {t.recordPayment}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCreditModal(selectedFournisseurForHistory, 'achat_credit')}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', borderColor: '#fed7aa', color: '#c2410c' }}
                  >
                    <Plus size={14} /> Facture Crédit
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th style={{ width: '13%' }}>Date</th>
                      <th style={{ width: '18%' }}>Opération</th>
                      <th style={{ width: '15%' }}>Réf / Pièce</th>
                      <th style={{ width: '14%' }}>Mode</th>
                      <th style={{ width: '18%' }}>Remarques</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Montant</th>
                      {canDelete && <th style={{ width: '6%', textAlign: 'center' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {singleProviderCredits.length === 0 ? (
                      <tr>
                        <td colSpan={canDelete ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          Aucune transaction enregistrée pour ce fournisseur.
                        </td>
                      </tr>
                    ) : (
                      singleProviderCredits.map(op => {
                        const isCredit = op.type === 'achat_credit';
                        const isPaiement = op.type === 'paiement';
                        return (
                          <tr key={op.id}>
                            <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                              {op.date}
                            </td>
                            <td>
                              {isCredit && (
                                <span className="badge-clean badge-amber">
                                  {t.typePurchaseCredit}
                                </span>
                              )}
                              {isPaiement && (
                                <span className="badge-clean badge-green">
                                  {t.typePayment}
                                </span>
                              )}
                              {op.type === 'avoir' && (
                                <span className="badge-clean badge-blue">
                                  {t.typeCreditNote}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {op.reference || '—'}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: '#475569', textTransform: 'capitalize' }}>
                              {op.payment_method || '—'}
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748b' }}>
                              {op.notes || '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: isCredit ? '#b91c1c' : '#15803d' }}>
                              {isCredit ? '+' : '-'}{formatCurrency(op.amount)}
                            </td>
                            {canDelete && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCreditOperation(op.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '3px' }}
                                  title="Annuler cette opération"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedFournisseurForHistory(null)}
                className="btn-secondary"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: AJOUTER / MODIFIER UN FOURNISSEUR (ADMIN) */}
      {/* ========================================================= */}
      {(showAddModal || editingFournisseur) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                  <Building2 size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {editingFournisseur ? t.editProviderBtn : t.addProviderBtn}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingFournisseur(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFournisseur} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Name */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.providerName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SOPRIAM Distribution"
                    value={fournisseurForm.name}
                    onChange={e => setFournisseurForm({ ...fournisseurForm, name: e.target.value })}
                    className="input-clean"
                  />
                </div>

                {/* Contact Person & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.contactPerson}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Karim Bennani"
                      value={fournisseurForm.contact_person}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, contact_person: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      placeholder="+212 5 22 40 50 60"
                      value={fournisseurForm.phone}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, phone: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                </div>

                {/* Email & City */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.email}
                    </label>
                    <input
                      type="email"
                      placeholder="contact@fournisseur.com"
                      value={fournisseurForm.email}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, email: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.city}
                    </label>
                    <input
                      type="text"
                      placeholder="Alger,Constantine..."
                      value={fournisseurForm.city}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, city: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.address}
                  </label>
                  <input
                    type="text"
                    placeholder="Adresse du siège ou entrepôt fournisseur"
                    value={fournisseurForm.address}
                    onChange={e => setFournisseurForm({ ...fournisseurForm, address: e.target.value })}
                    className="input-clean"
                  />
                </div>

                {/* ICE & Solde Initial (on creation only) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.iceTaxId}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 001893452000032"
                      value={fournisseurForm.ice}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, ice: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.initialCredit} (DA)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      disabled={!!editingFournisseur}
                      placeholder="0.00"
                      value={fournisseurForm.initial_credit}
                      onChange={e => setFournisseurForm({ ...fournisseurForm, initial_credit: parseFloat(e.target.value) || 0 })}
                      className="input-clean"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    Statut du Fournisseur
                  </label>
                  <select
                    value={fournisseurForm.status}
                    onChange={e => setFournisseurForm({ ...fournisseurForm, status: e.target.value as any })}
                    className="input-clean"
                  >
                    <option value="active">{t.statusActive}</option>
                    <option value="inactive">{t.statusInactive}</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.notesRemarks}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Conditions de paiement, délais de livraison, remarques..."
                    value={fournisseurForm.notes}
                    onChange={e => setFournisseurForm({ ...fournisseurForm, notes: e.target.value })}
                    className="input-clean"
                    style={{ resize: 'vertical' }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingFournisseur(null); }}
                  className="btn-secondary"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-green"
                >
                  {editingFournisseur ? t.save : t.addProviderBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ENREGISTRER UNE OPÉRATION DE CRÉDIT / PAIEMENT */}
      {/* ========================================================= */}
      {showCreditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                  <CreditCard size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {t.recordCreditOperation}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCreditOperation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Fournisseur Selection */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.providerName} *
                  </label>
                  <select
                    required
                    value={operationForm.fournisseur_id}
                    onChange={e => setOperationForm({ ...operationForm, fournisseur_id: Number(e.target.value) })}
                    className="input-clean"
                  >
                    <option value={0}>-- Sélectionner un Fournisseur --</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} (Dette: {formatCurrency(f.current_credit)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operation Type */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.operationType} *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOperationForm({ ...operationForm, type: 'paiement' })}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: operationForm.type === 'paiement' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        background: operationForm.type === 'paiement' ? '#f0fdf4' : '#ffffff',
                        color: operationForm.type === 'paiement' ? '#15803d' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Paiement (Dette -)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperationForm({ ...operationForm, type: 'achat_credit' })}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: operationForm.type === 'achat_credit' ? '2px solid #f97316' : '1px solid #e2e8f0',
                        background: operationForm.type === 'achat_credit' ? '#fff7ed' : '#ffffff',
                        color: operationForm.type === 'achat_credit' ? '#c2410c' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Achat Crédit (Dette +)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperationForm({ ...operationForm, type: 'avoir' })}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: operationForm.type === 'avoir' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: operationForm.type === 'avoir' ? '#eff6ff' : '#ffffff',
                        color: operationForm.type === 'avoir' ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Avoir / Retour
                    </button>
                  </div>
                </div>

                {/* Amount & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.amount} (DA) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={operationForm.amount}
                      onChange={e => setOperationForm({ ...operationForm, amount: e.target.value })}
                      className="input-clean"
                      style={{ fontWeight: 700, fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.operationDate} *
                    </label>
                    <input
                      type="date"
                      required
                      value={operationForm.date}
                      onChange={e => setOperationForm({ ...operationForm, date: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                </div>

                {/* Payment Method (if payment) */}
                {operationForm.type === 'paiement' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      {t.paymentMethod} *
                    </label>
                    <select
                      value={operationForm.payment_method}
                      onChange={e => setOperationForm({ ...operationForm, payment_method: e.target.value as any })}
                      className="input-clean"
                    >
                      <option value="especes">{t.methodCash}</option>
                      <option value="cheque">{t.methodCheque}</option>
                      <option value="virement">{t.methodTransfer}</option>
                      <option value="traite">{t.methodPromissoryNote}</option>
                      <option value="autre">{t.methodOther}</option>
                    </select>
                  </div>
                )}

                {/* Reference */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.referenceDoc} (N° Facture, N° Chèque, Référence...)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FAC-2026-081 ou CHQ-009182"
                    value={operationForm.reference}
                    onChange={e => setOperationForm({ ...operationForm, reference: e.target.value })}
                    className="input-clean"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                    {t.notesRemarks}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Détails du règlement, banque émettrice, motif..."
                    value={operationForm.notes}
                    onChange={e => setOperationForm({ ...operationForm, notes: e.target.value })}
                    className="input-clean"
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="btn-secondary"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-green"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CONFIRMATION DE SUPPRESSION (ADMIN) */}
      {/* ========================================================= */}
      {deletingFournisseur && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {t.confirmDeleteProvider}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Cette action est irréversible.
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              {t.confirmDeleteMsg}
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                {deletingFournisseur.name}
              </div>
              <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
                Solde actuel : {formatCurrency(deletingFournisseur.current_credit)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeletingFournisseur(null)}
                className="btn-secondary"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteFournisseur}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
